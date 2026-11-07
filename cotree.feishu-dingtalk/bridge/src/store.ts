import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { BridgeError } from "./config.js";
import type { InputReceipt, Message } from "./types.js";

export const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export type Inbox = { id: string; conversation: string; message: Message; body?: unknown; receipt?: InputReceipt; stage: string; attempts: number };
export type Delivery = { id: string; event_id: string; text: string; state: string; message: Message };
type Row = { id: string; conversation: string; message: string; body: string | null; receipt: string | null; stage: string; attempts: number };

/** Transport receipts only. CoTree owns execution and canonical results. */
export class Store {
  private readonly db!: DatabaseSync;
  private readonly lockPath: string;
  private readonly nonce = randomUUID();
  constructor(directory: string, binding: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.lockPath = path.join(directory, "bridge.lock");
    this.acquire();
    try {
      this.db = new DatabaseSync(path.join(directory, "bridge.sqlite"));
      this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
        CREATE TABLE IF NOT EXISTS metadata (id TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, session_id TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS inbox (id TEXT PRIMARY KEY, conversation TEXT NOT NULL, fingerprint TEXT NOT NULL,
          message TEXT NOT NULL, body TEXT, receipt TEXT, stage TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
          next_at INTEGER NOT NULL DEFAULT 0, error TEXT, created_at INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS inbox_due ON inbox(stage,next_at);
        CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, text TEXT NOT NULL,
          state TEXT NOT NULL DEFAULT 'pending', error TEXT, created_at INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS deliveries_event ON deliveries(event_id,state);`);
      this.db.exec("CREATE TABLE IF NOT EXISTS reply_keys (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL)");
      const previous = this.db.prepare("SELECT value FROM metadata WHERE id='binding'").get() as { value: string } | undefined;
      if (previous && previous.value !== binding) throw new BridgeError("STATE_SCOPE_CHANGED", "Use a new config directory when changing the CoTree source key or workspace.");
      this.db.prepare("INSERT OR IGNORE INTO metadata VALUES ('binding', ?)").run(binding);
      this.db.exec("UPDATE deliveries SET state='unknown', error='DELIVERY_OUTCOME_UNKNOWN' WHERE state='sending'");
    } catch (error) { this.db!?.close(); this.release(); throw error; }
  }
  private acquire(): void {
    for (let attempt = 0; attempt < 2; attempt++) {
      try { writeFileSync(this.lockPath, JSON.stringify({ pid: process.pid, nonce: this.nonce }), { flag: "wx", mode: 0o600 }); return; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        let owner: { pid: number };
        try { owner = JSON.parse(readFileSync(this.lockPath, "utf8")) as { pid: number }; }
        catch { throw new BridgeError("LOCK_REQUIRES_INSPECTION"); }
        if (!Number.isSafeInteger(owner.pid) || owner.pid < 1) throw new BridgeError("LOCK_REQUIRES_INSPECTION");
        try { process.kill(owner.pid, 0); }
        catch (probe) {
          if ((probe as NodeJS.ErrnoException).code === "ESRCH") { unlinkSync(this.lockPath); continue; }
        }
        throw new BridgeError("BRIDGE_ALREADY_RUNNING", "This config is already owned by another bridge process.");
      }
    }
    throw new BridgeError("BRIDGE_ALREADY_RUNNING");
  }
  private release() {
    try { if ((JSON.parse(readFileSync(this.lockPath, "utf8")) as { nonce?: string }).nonce === this.nonce) unlinkSync(this.lockPath); } catch { /* Already released. */ }
  }
  close() { try { this.db.close(); } finally { this.release(); } }
  receive(message: Message): string {
    const id = hash([message.platform, message.accountId, message.messageId]);
    const fingerprint = hash(message);
    const previous = this.db.prepare("SELECT fingerprint FROM inbox WHERE id=?").get(id) as { fingerprint: string } | undefined;
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new BridgeError("EVENT_ID_CONFLICT");
      return id;
    }
    const count = this.db.prepare("SELECT count(*) AS n FROM inbox WHERE stage!='done'").get() as { n: number };
    if (count.n >= 1000) throw new BridgeError("INBOX_FULL");
    const conversation = hash([message.platform, message.accountId, message.chatId, message.threadId ?? "", message.userId]);
    this.db.prepare("INSERT INTO inbox(id,conversation,fingerprint,message,created_at) VALUES (?,?,?,?,?)")
      .run(id, conversation, fingerprint, JSON.stringify(message), Date.now());
    return id;
  }
  due(now = Date.now()): Inbox[] {
    // Only the oldest unsubmitted event in each conversation may create its session.
    const rows = this.db.prepare(`SELECT * FROM inbox i WHERE stage IN ('pending','accepted') AND next_at<=?
      AND (receipt IS NOT NULL OR NOT EXISTS(SELECT 1 FROM inbox j WHERE j.conversation=i.conversation AND j.receipt IS NULL
        AND j.stage!='done' AND j.rowid<i.rowid)) ORDER BY i.next_at,i.rowid LIMIT 32`).all(now) as unknown as Row[];
    const seen = new Set<string>();
    return rows.filter(row => { if (seen.has(row.conversation)) return false; seen.add(row.conversation); return true; }).slice(0, 4).map(row => this.decode(row));
  }
  private decode(row: Row): Inbox { return { ...row, message: JSON.parse(row.message) as Message, ...(row.body ? { body: JSON.parse(row.body) as unknown } : { body: undefined }), ...(row.receipt ? { receipt: JSON.parse(row.receipt) as InputReceipt } : { receipt: undefined }) }; }
  prepare(item: Inbox): unknown {
    if (item.body) return item.body;
    const conversation = this.db.prepare("SELECT session_id FROM conversations WHERE id=?").get(item.conversation) as { session_id: string } | undefined;
    const body = { schemaVersion: 1, session: conversation ? { id: conversation.session_id } : { create: { title: `${item.message.platform} · ${item.message.chatId}` } },
      content: [{ type: "text", text: item.message.text }], delivery: { mode: "enqueue" }, metadata: { correlationId: item.id, labels: { platform: item.message.platform, sourceUser: item.message.userId } } };
    this.db.prepare("UPDATE inbox SET body=? WHERE id=? AND body IS NULL").run(JSON.stringify(body), item.id);
    return body;
  }
  accepted(item: Inbox, receipt: InputReceipt) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("INSERT INTO conversations VALUES (?,?) ON CONFLICT(id) DO UPDATE SET session_id=excluded.session_id").run(item.conversation, receipt.sessionId);
      this.db.prepare("UPDATE inbox SET receipt=?,stage='accepted',attempts=0,error=NULL WHERE id=?").run(JSON.stringify(receipt), item.id);
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  defer(id: string, error?: string, terminal = false, waitMs = 3000) {
    this.db.prepare("UPDATE inbox SET next_at=?,attempts=attempts+?,error=?,stage=CASE WHEN ? THEN 'attention' ELSE stage END WHERE id=?")
      .run(Date.now() + waitMs, error ? 1 : 0, error ?? null, terminal ? 1 : 0, id);
  }
  enqueueReply(item: Inbox, identity: string, text: string, terminal: boolean) {
    const chunks = splitText(text);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const key = hash([item.id, identity]);
      const previous = this.db.prepare("SELECT fingerprint FROM reply_keys WHERE id=?").get(key) as { fingerprint: string } | undefined;
      if (previous && previous.fingerprint !== hash(text)) throw new BridgeError("REPLY_ID_CONFLICT");
      this.db.prepare("INSERT OR IGNORE INTO reply_keys VALUES (?,?)").run(key, hash(text));
      chunks.forEach((chunk, index) => this.db.prepare("INSERT OR IGNORE INTO deliveries(id,event_id,text,created_at) VALUES (?,?,?,?)")
        .run(hash([item.id, identity, index]), item.id, chunk, Date.now()));
      if (terminal) this.db.prepare("UPDATE inbox SET stage='reply' WHERE id=?").run(item.id);
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  deliveries(): Delivery[] {
    return (this.db.prepare(`SELECT d.*,i.message FROM deliveries d JOIN inbox i ON i.id=d.event_id WHERE d.state='pending'
      AND NOT EXISTS(SELECT 1 FROM deliveries earlier WHERE earlier.event_id=d.event_id AND earlier.rowid<d.rowid AND earlier.state!='sent') ORDER BY d.rowid LIMIT 4`).all() as unknown as (Omit<Delivery,"message"> & { message: string })[])
      .map(row => ({ ...row, message: JSON.parse(row.message) as Message }));
  }
  deliveryState(id: string, state: string, error?: string) {
    this.db.prepare("UPDATE deliveries SET state=?,error=? WHERE id=?").run(state, error ?? null, id);
    this.db.exec("UPDATE inbox SET stage='done',body=NULL WHERE stage='reply' AND NOT EXISTS(SELECT 1 FROM deliveries d WHERE d.event_id=inbox.id AND d.state!='sent')");
  }
  retryDelivery(id: string) {
    const result = this.db.prepare("UPDATE deliveries SET state='pending',error=NULL WHERE id=? AND state='unknown'").run(id);
    if (!result.changes) throw new BridgeError("UNKNOWN_DELIVERY_NOT_FOUND");
  }
  retryInput(id: string) {
    if (!this.db.prepare("UPDATE inbox SET stage=CASE WHEN receipt IS NULL THEN 'pending' ELSE 'accepted' END,next_at=0,error=NULL WHERE id=? AND stage='attention'").run(id).changes) throw new BridgeError("ATTENTION_INPUT_NOT_FOUND");
  }
  get(id: string): Inbox {
    const row = this.db.prepare("SELECT * FROM inbox WHERE id=?").get(id) as unknown as Row | undefined;
    if (!row) throw new BridgeError("MESSAGE_NOT_FOUND");
    return this.decode(row);
  }
  status() {
    return {
      inbox: this.db.prepare("SELECT stage,count(*) AS count FROM inbox GROUP BY stage").all(),
      delivery: this.db.prepare("SELECT state,count(*) AS count FROM deliveries GROUP BY state").all(),
      recent: this.db.prepare("SELECT id,stage,error,created_at FROM inbox ORDER BY rowid DESC LIMIT 15").all(),
      uncertainDeliveries: this.db.prepare("SELECT id,event_id,error FROM deliveries WHERE state='unknown' LIMIT 30").all()
    };
  }
}
export function splitText(text: string, limit = 3000): string[] {
  const characters = Array.from(text || "任务结束，但没有可展示的文本。请在 CoTree 查看记录。");
  const chunks: string[] = []; let part = ""; let bytes = 0;
  for (const character of characters) {
    const size = Buffer.byteLength(character);
    if (bytes + size > limit) { chunks.push(part); part = ""; bytes = 0; }
    part += character; bytes += size;
  }
  if (part) chunks.push(part);
  return chunks;
}
