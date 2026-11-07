import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { copyFileSync, existsSync, lstatSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const execute = promisify(execFile);
function inputFile(value) { if (typeof value !== 'string' || !path.isAbsolute(value) || !statSync(value).isFile() || lstatSync(value).isSymbolicLink()) throw new Error('Input must be an explicit absolute regular file'); return value; }
function outputFile(value) { if (typeof value !== 'string' || !path.isAbsolute(value) || !value.toLowerCase().endsWith('.mp4') || existsSync(value) || !statSync(path.dirname(value)).isDirectory()) throw new Error('Output must be a new absolute .mp4 path in an existing directory'); return value; }
const positive = (value, name, max) => { if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > max) throw new Error(`${name} must be positive and at most ${max}`); return value; };
export function mediaPlan(action, input) {
  if (!input || typeof input !== 'object') throw new Error('Media input must be an object');
  if (action === 'probe') return { command: 'ffprobe', args: ['-v','error','-show_streams','-show_format','-of','json',inputFile(input.file)] };
  if (action === 'burn') { inputFile(input.video); inputFile(input.srt); outputFile(input.output); return { command: 'ffmpeg', args: ['-n','-v','error','-i',input.video,'-vf',"subtitles=captions.srt:force_style='FontName=Arial,Fontsize=13,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=28'",'-map','0:v:0','-map','0:a?','-c:v','libx264','-preset','veryfast','-crf','20','-c:a','copy','-movflags','+faststart',input.output], staging: 'Copy only the supplied SRT to a temporary captions.srt; no remote media or shell filters.' }; }
  if (action !== 'assemble') throw new Error('Action must be probe, burn or assemble');
  if (!Array.isArray(input.segments) || input.segments.length < 1 || input.segments.length > 20) throw new Error('Provide 1 to 20 explicit segments');
  const width = positive(input.width, 'width', 3840), height = positive(input.height,'height',3840), fps = positive(input.fps,'fps',60);
  if (![width,height,fps].every(Number.isInteger) || width % 2 || height % 2) throw new Error('Width/height must be even integers and fps an integer');
  outputFile(input.output); const args=['-n','-v','error'], filters=[]; let total=0;
  input.segments.forEach((s,i)=>{ inputFile(s.file); const duration=positive(s.duration,'segment duration',300); total+=duration; if (!['image','video'].includes(s.kind)) throw new Error('Each segment kind must be image or video'); if(s.kind==='image'){if(!['.png','.jpg','.jpeg','.webp'].includes(path.extname(s.file).toLowerCase()))throw new Error('Image segment must be PNG/JPEG/WebP'); args.push('-loop','1');} args.push('-t',String(duration),'-i',s.file); filters.push(`[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},setpts=PTS-STARTPTS,format=yuv420p[v${i}]`); });
  if(total>600)throw new Error('Assembly is limited to 600 seconds per invocation');
  if(input.audio)args.push('-i',inputFile(input.audio)); filters.push(input.segments.map((_,i)=>`[v${i}]`).join('')+`concat=n=${input.segments.length}:v=1:a=0[vout]`);
  args.push('-filter_complex',filters.join(';'),'-map','[vout]'); if(input.audio)args.push('-map',`${input.segments.length}:a:0`,'-af','apad','-c:a','aac');
  args.push('-t',String(total),'-c:v','libx264','-preset','veryfast','-crf','20','-movflags','+faststart',input.output);
  return {command:'ffmpeg',args,requestedDuration:total,audio:input.audio?'explicit supplied track':'none; no synthesized voice',output:input.output};
}
export function validateSrt(text, duration) {
  if (Buffer.byteLength(text)>1024*1024) throw new Error('SRT exceeds 1 MiB');
  const blocks=text.replaceAll('\r\n','\n').trim().split(/\n\s*\n/); if(!blocks.length||blocks.length>5000)throw new Error('SRT must contain 1 to 5000 cues');let previous=-1;
  const seconds = value => {const [h,m,s,ms]=value.split(/[:,]/).map(Number);if(m>59||s>59)throw new Error('Invalid SRT time');return h*3600+m*60+s+ms/1000;};
  for(const block of blocks){const lines=block.split('\n');if(!/^\d+$/.test(lines[0]))throw new Error('SRT needs numeric cue indices');const match=/^(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})$/.exec(lines[1]??'');if(!match||!lines.slice(2).join('\n').trim())throw new Error('SRT needs exact timing and nonempty caption text');const start=seconds(match[1]),end=seconds(match[2]);if(start<previous||end<=start||end>duration+0.1)throw new Error('Caption time is out of order or outside the media duration');previous=start;}
  return {cues:blocks.length,authoredTextPreserved:true,transcriptionPerformed:false};
}
export async function runMedia(action,input,options={}) {
  const plan=mediaPlan(action,input);const run=(command,args,extra={})=>execute(command,args,{windowsHide:true,shell:false,encoding:'utf8',maxBuffer:2*1024*1024,timeout:120000,signal:options.signal,...extra});
  if(action==='probe'){const {stdout}=await run(plan.command,plan.args);const data=JSON.parse(stdout);const duration=Number(data.format?.duration);if(!Number.isFinite(duration)||duration<=0)throw new Error('ffprobe did not supply a positive media duration');return {duration,streams:data.streams,format:data.format};}
  let staging,captionEvidence;
  try{
    if(action==='burn'){const info=await runMedia('probe',{file:input.video},options);if(statSync(input.srt).size>1024*1024)throw new Error('SRT exceeds 1 MiB');captionEvidence=validateSrt(readFileSync(input.srt,'utf8'),info.duration);staging=mkdtempSync(path.join(path.dirname(input.output),'.cotree-media-'));copyFileSync(input.srt,path.join(staging,'captions.srt'));}
    if(action==='assemble'){for(const s of input.segments)if(s.kind==='video'){const info=await runMedia('probe',{file:s.file},options);if(info.duration+0.05<s.duration)throw new Error('Requested segment exceeds the observed video duration');}}
    await run(plan.command,plan.args,staging?{cwd:staging}:{}); const result=await runMedia('probe',{file:input.output},options);
    return {output:input.output,bytes:statSync(input.output).size,...result,...(captionEvidence?{captions:captionEvidence}:{}),semanticReview:'Inspect actual frames and listen to the exported audio; process success alone does not verify story or speech.'};
  }finally{if(staging){const parent=path.resolve(path.dirname(input.output));if(path.dirname(path.resolve(staging))!==parent||!path.basename(staging).startsWith('.cotree-media-'))throw new Error('Unsafe staging cleanup');rmSync(staging,{recursive:true,force:true});}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{const [mode,action,file]=process.argv.slice(2);if(!['plan','run'].includes(mode)||!file)throw new Error('Usage: media-finishing.mjs plan|run probe|burn|assemble request.json');const raw=readFileSync(file);if(raw.length>1024*1024)throw new Error('Input exceeds 1 MiB');const input=JSON.parse(raw.toString('utf8'));console.log(JSON.stringify(mode==='plan'?mediaPlan(action,input):await runMedia(action,input),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
