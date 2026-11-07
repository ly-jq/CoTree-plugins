import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const supported = new Set(['discord', 'telegram']);
const string = (value, label, max = 4096) => { if (typeof value !== 'string' || !value || value.length > max || value.includes('\0')) throw new Error(`${label} is required and must fit ${max} characters`); return value; };
function identity(value, service, label) { const id = string(value, label, 40); if (!(service === 'telegram' ? /^-?\d{1,20}$/ : /^\d{1,20}$/).test(id)) throw new Error(`Invalid ${label}`); return id; }
function messageId(value, service) { const id=identity(value,service,'message_id'); if (service==='telegram' && (!Number.isSafeInteger(Number(id)) || Number(id)<1))throw new Error('Telegram message_id must be a positive safe integer');return service==='telegram'?Number(id):id; }
function tokenFor(service, env) { const token=env[service==='discord'?'DISCORD_BOT_TOKEN':'TELEGRAM_BOT_TOKEN'];if(typeof token!=='string'||!token||/[\s/]/.test(token))throw new Error(`Configure the independent ${service} bot token in the process environment`);return token; }
function allowedChat(service, chat, env) { let ids;try {ids=JSON.parse(env[`COTREE_${service.toUpperCase()}_ALLOWED_CHATS`]??'[]');}catch{throw new Error('Allowed chat configuration must be a JSON array of exact IDs');}if(!Array.isArray(ids)||!ids.every(id=>typeof id==='string')||!ids.includes(chat))throw new Error('Target chat is not explicitly allowlisted'); }
export function botRequest(service, input) {
  if(!supported.has(service)||!input||typeof input!=='object'||Array.isArray(input))throw new Error('Select discord or telegram and an explicit request object');
  const action=input.action;
  if(action==='identity')return {service,action,method:'GET',route:service==='discord'?'/users/@me':'getMe',write:false};
  const chat=identity(input.chat_id,service,'chat_id');
  if(service==='discord') {
    const root=`/channels/${chat}/messages`;
    if(action==='history') {const limit=input.limit??30;if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('history limit must be 1-100');const query=new URLSearchParams({limit:String(limit)});if(input.after)query.set('after',identity(input.after,service,'after'));return {service,action,chat,method:'GET',route:`${root}?${query}`,write:false};}
    if(action==='reply'||action==='edit') {const content=string(input.text,'text',2000);const body={content,allowed_mentions:{parse:[],replied_user:false}};if(action==='reply'&&input.reply_to)body.message_reference={message_id:messageId(input.reply_to,service),fail_if_not_exists:true};return {service,action,chat,method:action==='reply'?'POST':'PATCH',route:action==='reply'?root:`${root}/${messageId(input.message_id,service)}`,body,write:true,...(input.files?{files:input.files}:{})};}
    if(action==='react')return {service,action,chat,method:'PUT',route:`${root}/${messageId(input.message_id,service)}/reactions/${encodeURIComponent(string(input.emoji,'emoji',100))}/@me`,write:true};
    if(action==='download')return {service,action,chat,method:'GET',route:`${root}/${messageId(input.message_id,service)}`,attachment:identity(input.attachment_id,service,'attachment_id'),write:false};
  } else {
    const body={chat_id:chat};
    if(action==='reply'||action==='edit') {body.text=string(input.text,'text',4096);body.link_preview_options={is_disabled:true};if(input.reply_to)body.reply_parameters={message_id:messageId(input.reply_to,service),allow_sending_without_reply:false};if(action==='edit')body.message_id=messageId(input.message_id,service);return {service,action,chat,method:'POST',route:action==='reply'?'sendMessage':'editMessageText',body,write:true};}
    if(action==='react')return {service,action,chat,method:'POST',route:'setMessageReaction',body:{...body,message_id:messageId(input.message_id,service),reaction:[{type:'emoji',emoji:string(input.emoji,'emoji',32)}],is_big:false},write:true};
    if(action==='upload')return {service,action,chat,method:'POST',route:'sendDocument',body,...(input.text?{caption:string(input.text,'caption',1024)}:{}),files:[string(input.file,'file')],write:true};
    if(action==='download')return {service,action,chat,method:'POST',route:'getFile',body:{file_id:string(input.file_id,'file_id',512)},write:false};
    if(action==='history'||action==='updates')throw new Error('Telegram has no bot history API; use the existing CoTree Gateway for getUpdates, never start a second consumer');
  }
  throw new Error(`Unsupported ${service} action; use identity, reply, edit, react, download, plus Discord history or Telegram upload`);
}
async function readBounded(response, maxBytes) {const reader=response.body?.getReader();if(!reader)throw new Error('Response has no body');const parts=[];let total=0;try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>maxBytes)throw new Error('Response exceeds configured byte limit');parts.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}return Buffer.concat(parts);}
function upload(file) {const full=path.resolve(string(file,'file')),stat=lstatSync(full);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8388608)throw new Error('Upload must be an explicit regular file of at most 8 MiB');return {name:path.basename(full),bytes:readFileSync(full)};}
export async function executeBot(service, input, options={}) {
  const request=botRequest(service,input),env=options.env??process.env;
  if(request.chat)allowedChat(service,request.chat,env);
  const token=tokenFor(service,env),fetchImpl=options.fetchImpl??fetch;
  const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000);
  signal.throwIfAborted();
  const base=service==='discord'?'https://discord.com/api/v10':`https://api.telegram.org/bot${token}/`;
  const headers=service==='discord'?{Authorization:`Bot ${token}`}:{}, init={method:request.method,headers,redirect:'error',signal};
  if(request.files) {
    if(!Array.isArray(request.files)||request.files.length<1||request.files.length>4||request.action==='edit')throw new Error('Only reply/upload supports 1-4 explicit files; edit attachments separately');
    const files=request.files.map(upload), form=new FormData();
    if(service==='discord'){form.set('payload_json',JSON.stringify({...request.body,attachments:files.map((f,id)=>({id,filename:f.name}))}));files.forEach((f,id)=>form.set(`files[${id}]`,new Blob([f.bytes]),f.name));}
    else {form.set('chat_id',request.chat);if(request.caption)form.set('caption',request.caption);form.set('document',new Blob([files[0].bytes]),files[0].name);}
    init.body=form;
  } else if(request.body){headers['Content-Type']='application/json';init.body=JSON.stringify(request.body);}
  let response;
  try{response=await fetchImpl(base+request.route,init);}catch{throw new Error(`${service} request did not return a response; inspect connectivity/cancellation before retrying a write`);}
  if(!response.ok)throw new Error(`${service} HTTP ${response.status}; check identity, scope, target and rate limits; no automatic write retry`);
  let data=response.status===204?{}:JSON.parse((await readBounded(response,2097152)).toString('utf8'));
  if(service==='telegram'){if(data.ok!==true)throw new Error('Telegram rejected the API operation; inspect bot/target permissions');data=data.result;}
  if(request.action==='download') {
    let url;
    if(service==='discord'){const attachment=data.attachments?.find(a=>a.id===request.attachment);if(!attachment||!attachment.url)throw new Error('Attachment ID is absent from the requested message');url=new URL(attachment.url);if(url.protocol!=='https:'||!['cdn.discordapp.com','media.discordapp.net'].includes(url.hostname)||url.username||url.password||url.port)throw new Error('Attachment did not use an approved Discord HTTPS CDN');}
    else {const filePath=data.file_path;if(typeof filePath!=='string'||!filePath||filePath.startsWith('/')||filePath.split('/').some(p=>p==='..'||!p)||/[\\?#\u0000-\u001f]/.test(filePath))throw new Error('Telegram returned an invalid file path');url=new URL(`https://api.telegram.org/file/bot${token}/${filePath.split('/').map(encodeURIComponent).join('/')}`);}
    const output=path.resolve(string(input.output,'explicit new output file'));
    let downloaded;try{downloaded=await fetchImpl(url,{method:'GET',redirect:'error',signal});}catch{throw new Error('Attachment download failed before a response');}if(!downloaded.ok)throw new Error(`Attachment HTTP ${downloaded.status}`);
    const bytes=await readBounded(downloaded,20971520);writeFileSync(output,bytes,{flag:'wx',mode:0o600});return {service,action:request.action,output,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
  }
  // Avoid returning credential-bearing transport URLs or reflecting headers.
  return {service,action:request.action,httpStatus:response.status,result:data,evidence:request.write?'API accepted the operation; delivery/read state requires separate observation':'API response observed'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try{const [service,mode,file]=process.argv.slice(2);if(!file||!['plan','execute'].includes(mode)||process.argv.length!==5)throw new Error('Usage: node bot-request.mjs discord|telegram plan|execute request.json');const stat=lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>131072)throw new Error('Request must be a regular JSON file up to 128 KiB');const input=JSON.parse(readFileSync(file,'utf8'));console.log(JSON.stringify(mode==='plan'?{...botRequest(service,input),executed:false}:await executeBot(service,input)));}catch(error){console.error(error.message);process.exitCode=1;}
}
