import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { projectName, writeNewProject } from './new-project.mjs';

export function scaffold({ name, output }) {
  projectName(name);
  const template = file => readFileSync(new URL(`../templates/${file}`, import.meta.url), 'utf8');
  const files = {
    'server.mjs': template('server.mjs').replaceAll('__COTREE_SERVER_NAME__', name),
    'pack.mjs': template('pack.mjs'),
    'new-project.mjs': readFileSync(new URL('./new-project.mjs', import.meta.url), 'utf8'),
    'package.json': JSON.stringify({ name, version: '0.1.0', private: true, type: 'module', engines: { node: '>=20.19' }, scripts: { start: 'node server.mjs', 'start:http': 'node server.mjs --transport http', pack: 'node pack.mjs' }, dependencies: { '@modelcontextprotocol/sdk': '1.29.0', zod: '4.4.3' }, devDependencies: { esbuild: '0.27.7' } }, null, 2) + '\n',
    '.gitignore': 'node_modules/\npacked-plugin/\n.env\n.env.*\n',
    'README.md': `# ${name}\n\nNode 20.19+。先用项目包管理器安装 package.json 中固定的依赖，再 npm start（stdio）或 npm run start:http -- --port 3000（127.0.0.1 HTTP）。端口 0 可分配空闲端口，实际地址仅写 stderr。\n\n这是无上游账户的统计示例，含 summarize_numbers、usage 资源与 explain-summary prompt。换成自己的业务代码前定义 schema、权限、超时和错误行为。stdout 为 stdio 协议保留。\n\nnpm run pack -- --output 新目录：捆绑运行依赖，输出 CoTree Manifest v3 原生插件。正常安装 / 启用时由 CoTree 计算包摘要并授权；修改后重新生成并按正常更新流程安装。不要直接修改安装包。\n\nHTTP 样例只绑定 loopback，拒绝其他 Host / Origin，不实现公网身份、租户、部署或 OAuth；不能直接对外暴露。SDK 1.29.0 与当前 CoTree v1 客户端匹配，并非当前 SDK 最新主版本。协议扩展和 v2 升级另按真实宿主能力测试。\n`
  };
  return writeNewProject(output, files);
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const { values } = parseArgs({ options: { name: { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean' } }, allowPositionals: false });
    if (values.help) process.stdout.write('scaffold.mjs --name my-server --output NEW_DIRECTORY. Generates files only; does not install, run or deploy.\n');
    else process.stdout.write(JSON.stringify(scaffold(values)) + '\n');
  } catch (error) { process.stderr.write(`Scaffold failed: ${error.message}\n`); process.exitCode = 1; }
}
