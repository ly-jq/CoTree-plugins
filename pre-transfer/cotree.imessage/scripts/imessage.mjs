import { execFile } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
export function sendPlan(input) {
  if(typeof input.chat_id!=='string'||!input.chat_id.startsWith('iMessage;')||input.chat_id.length>512||/[\u0000-\u001f]/.test(input.chat_id))throw new Error('Provide an observed iMessage chat GUID');
  const text=typeof input.text==='string'?input.text:'';if((!text&&!input.file)||text.length>10000||text.includes('\0'))throw new Error('Provide up to 10000 text characters or one explicit file');
  if(text&&input.file)throw new Error('Send text and an attachment as separate explicit operations to preserve individual receipts');
  let value=text;const attachment=Boolean(input.file);
  if(attachment){const file=path.resolve(input.file),stat=lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8388608)throw new Error('Attachment must be a regular file up to 8 MiB');value=file;}
  return {command:'/usr/bin/osascript',args:['-',value,input.chat_id],script:attachment?'on run argv\n tell application "Messages" to send (POSIX file (item 1 of argv)) to chat id (item 2 of argv)\nend run':'on run argv\n tell application "Messages" to send (item 1 of argv) to chat id (item 2 of argv)\nend run',executed:false};
}
function allow(chat,env){let ids;try{ids=JSON.parse(env.COTREE_IMESSAGE_ALLOWED_CHATS??'[]');}catch{throw new Error('COTREE_IMESSAGE_ALLOWED_CHATS must be a JSON array');}if(!Array.isArray(ids)||!ids.includes(chat))throw new Error('Chat GUID is not explicitly allowlisted');}
export function attributedText(blob) {
  if(!blob)return null;const bytes=Buffer.from(blob);if(bytes.length>1048576)return null;let i=bytes.indexOf('NSString');if(i<0)return null;i+=8;while(i<bytes.length&&bytes[i]!==43)i++;i++;if(i>=bytes.length)return null;const tag=bytes[i++];let length=tag;const n=tag===129?1:tag===130?2:tag===131?3:0;if(n){if(i+n>bytes.length)return null;length=bytes.readUIntLE(i,n);i+=n;}if(length>10000||i+length>bytes.length)return null;return bytes.toString('utf8',i,i+length);
}
export function readHistory(db,input) {
  if(typeof input.chat_id!=='string'||!input.chat_id.startsWith('iMessage;'))throw new Error('An observed iMessage chat GUID is required');
  const limit=input.limit??30,after=input.after_rowid??0;if(!Number.isSafeInteger(limit)||limit<1||limit>100||!Number.isSafeInteger(after)||after<0)throw new Error('Use limit 1-100 and a nonnegative row cursor');
  const rows=db.prepare('SELECT m.ROWID AS rowid,m.guid,m.text,m.attributedBody,m.date,m.is_from_me,m.cache_has_attachments,h.id AS sender FROM message m JOIN chat_message_join j ON j.message_id=m.ROWID JOIN chat c ON c.ROWID=j.chat_id LEFT JOIN handle h ON h.ROWID=m.handle_id WHERE c.guid=? AND m.service=? AND m.ROWID>? ORDER BY m.ROWID DESC LIMIT ?').all(input.chat_id,'iMessage',after,limit);
  return rows.reverse().map(row=>{if(!row.guid)throw new Error('Message database returned a row without a GUID');return {id:row.guid,rowid:row.rowid,text:typeof row.text==='string'?row.text:attributedText(row.attributedBody),textEvidence:typeof row.text==='string'?'plain-column':row.attributedBody?'decoded-attributed-body-may-be-unavailable':'no-text-column',timestamp:new Date(Number(row.date)/1e6+978307200000).toISOString(),fromMe:Boolean(row.is_from_me),...(row.sender?{sender:row.sender}:{}),attachments:row.cache_has_attachments?db.prepare('SELECT a.filename,a.mime_type,a.transfer_name FROM attachment a JOIN message_attachment_join j ON j.attachment_id=a.ROWID WHERE j.message_id=?').all(row.rowid):[]};});
}
export async function runIMessage(mode,input,options={}) {
  if(mode==='plan-send')return sendPlan(input);
  if(process.platform!=='darwin')throw new Error('iMessage runtime requires macOS, Messages and user-granted Full Disk Access/Automation permissions');
  const env=options.env??process.env;allow(input.chat_id,env);
  if(mode==='history'){if(!env.IMESSAGE_DB_PATH||!path.isAbsolute(env.IMESSAGE_DB_PATH))throw new Error('Set IMESSAGE_DB_PATH explicitly to the authorized Messages chat.db');const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(env.IMESSAGE_DB_PATH,{readOnly:true});try{return {chat_id:input.chat_id,messages:readHistory(db,input),source:'macOS Messages readonly database'};}finally{db.close();}}
  if(mode==='send'){const plan=sendPlan(input);return new Promise((resolve,reject)=>{const child=execFile(plan.command,plan.args,{timeout:15000,maxBuffer:65536,signal:options.signal},error=>{if(error)reject(new Error('Messages automation did not confirm completion; inspect macOS permission and chat identity before retrying'));else resolve({chat_id:input.chat_id,submitted:true,delivered:null,evidence:'AppleScript accepted send; this interface supplies no delivery receipt or message GUID'});});child.stdin.end(plan.script);});}
  throw new Error('Use history, plan-send or send');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{const [mode,file]=process.argv.slice(2);if(!file||process.argv.length!==4||lstatSync(file).size>131072)throw new Error('Usage: node imessage.mjs history|plan-send|send request.json (128 KiB maximum)');console.log(JSON.stringify(await runIMessage(mode,JSON.parse(readFileSync(file,'utf8')))));}catch(error){console.error(error.message);process.exitCode=1;}}
