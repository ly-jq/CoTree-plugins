import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { projectName, writeNewProject } from './new-project.mjs';

export const templateVersion = '4.0.506';
export function bootstrapRemotion(output, name) {
  projectName(name);
  return { ...writeNewProject(output, {
    'package.json': JSON.stringify({ name, version: '0.1.0', private: true, scripts: { studio: 'remotion studio src/index.ts --no-open', compositions: 'remotion compositions src/index.ts' }, dependencies: { remotion: templateVersion, '@remotion/cli': templateVersion, react: '19.2.0', 'react-dom': '19.2.0' } }, null, 2) + '\n',
    'src/index.ts': "import {registerRoot} from 'remotion';\nimport {Root} from './Root';\nregisterRoot(Root);\n",
    'src/Root.tsx': "import React from 'react';\nimport {AbsoluteFill, Composition, interpolate, useCurrentFrame} from 'remotion';\nconst Demo = () => { const frame = useCurrentFrame(); return <AbsoluteFill style={{backgroundColor:'#132a3d',color:'#e8f6ff',fontFamily:'sans-serif',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:64,transform:`translateY(${interpolate(frame,[0,30],[30,0],{extrapolateRight:'clamp'})}px)`}}>CoTree Studio</div><div style={{position:'absolute',bottom:60,left:80,width:800*frame/59,height:8,backgroundColor:'#65dfc5'}} /></AbsoluteFill>; };\nexport const Root = () => <Composition id=\"Demo\" component={Demo} width={960} height={540} fps={30} durationInFrames={60}/>;\n",
    '.gitignore': 'node_modules/\nout/\n.remotion/\n.env\n.env.*\n',
    'README.md': '# Local Remotion starter\n\nPinned Remotion 4.0.506 reference sample, not a latest-version promise. Install with your package manager and retain its lockfile. Use the plugin render plan with src/index.ts and Demo; review and run the resulting argument array via the host shell tool. The sample has 60 frames at 30 fps, no remote assets or audio. Studio may execute project code; use trusted projects only. No dependencies, browser or cloud services were installed by this generator.\n'
  }), templateVersion, credentialsUsed: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { const { values } = parseArgs({ options: { name: { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean' } } });
    if (values.help) console.log('bootstrap.mjs --name video-project --output new-directory; no install, startup or render.');
    else console.log(JSON.stringify(bootstrapRemotion(values.output, values.name), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
