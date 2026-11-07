import { describe, expect, it } from "vitest";
import { parseConfig, type ChannelConfig } from "../src/config.js";
import { feishuMessage, dingtalkMessage } from "../src/normalize.js";
import { DingtalkAdapter, DING_TOPIC } from "../src/adapters.js";
import { splitText } from "../src/store.js";

const channel: ChannelConfig = { appId: "app", secretEnv: "SECRET", allowUsers: ["user"], allowChats: [], requireMention: true, botOpenId: "bot" };
const feishu = { sender: { sender_type: "user", sender_id: { open_id: "user" } }, message: { message_type: "text", message_id: "m1", chat_id: "chat", chat_type: "group", content: '{"text":"@_user_1 hello"}', mentions: [{ key: "@_user_1", id: { open_id: "bot" } }] } };
const ding = { msgtype: "text", msgId: "m1", conversationId: "chat", conversationType: "2", senderStaffId: "user", senderCorpId: "corp", chatbotCorpId: "corp", robotCode: "app", text: { content: "hello" }, isInAtList: true };
describe("platform input boundaries", () => {
  it("normalizes Feishu text and removes only the actual bot mention", () => {
    expect(feishuMessage(feishu, channel)).toMatchObject({ text: "hello", userId: "user", kind: "group" });
    expect(feishuMessage({ ...feishu, message: { ...feishu.message, mentions: [{ id: { open_id: "somebody-else" } }] } }, channel)).toBeUndefined();
  });
  it("rejects bots, unsupported media, unauthorized users and chats", () => {
    expect(feishuMessage({ ...feishu, sender: { ...feishu.sender, sender_type: "app" } }, channel)).toBeUndefined();
    expect(feishuMessage(feishu, { ...channel, allowUsers: [] })).toBeUndefined();
    expect(feishuMessage(feishu, { ...channel, allowChats: ["other"] })).toBeUndefined();
    expect(feishuMessage({ ...feishu, message: { ...feishu.message, message_type: "image" } }, channel)).toBeUndefined();
  });
  it("requires the DingTalk app, enterprise identity and group mention", () => {
    expect(dingtalkMessage(ding, channel)).toMatchObject({ text: "hello", platform: "dingtalk" });
    for (const patch of [{ robotCode: "other" }, { senderCorpId: "external" }, { isInAtList: false }, { msgtype: "picture" }, { senderStaffId: "unauthorized" }]) {
      expect(dingtalkMessage({ ...ding, ...patch }, channel)).toBeUndefined();
    }
  });
  it("acknowledges DingTalk callbacks after persistence; receipt failure prevents ACK", () => {
    const adapter = new DingtalkAdapter(channel, "synthetic");
    const frame = { type: "CALLBACK", headers: { topic: DING_TOPIC, messageId: "transport-id" }, data: JSON.stringify(ding) };
    let saved = false;
    const ack = adapter.handleFrame(frame, () => { saved = true; });
    expect(saved).toBe(true); expect(ack).toMatchObject({ code: 200, headers: { messageId: "transport-id" } });
    expect(() => adapter.handleFrame(frame, () => { throw new Error("disk full"); })).toThrow("disk full");
    expect(adapter.handleFrame({ type: "SYSTEM", headers: { topic: "ping", messageId: "p" }, data: "test" }, () => {})).toMatchObject({ code: 200, data: "test" });
  });
  it("rejects plaintext remote endpoints, embedded credentials and wildcard users", () => {
    const base = { schemaVersion: 1, cotreeUrl: "http://127.0.0.1:19191", workspaceId: "w", tokenEnv: "TOKEN", feishu: channel };
    expect(parseConfig(base).workspaceId).toBe("w");
    for (const patch of [{ cotreeUrl: "http://example.com" }, { cotreeUrl: "https://token@example.com" }, { appSecret: "secret" }, { feishu: { ...channel, allowUsers: ["*"] } }]) expect(() => parseConfig({ ...base, ...patch })).toThrow();
  });
  it("splits Chinese and emoji without cutting UTF-8 characters", () => {
    const text = "你好🙂".repeat(1600), parts = splitText(text);
    expect(parts.length).toBeGreaterThan(1); expect(parts.join("")).toBe(text);
    expect(parts.every(part => Buffer.byteLength(part) <= 3000 && !part.includes("\uFFFD"))).toBe(true);
  });
});
