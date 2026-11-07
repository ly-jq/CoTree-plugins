import { existsSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeNewProject } from './new-project.mjs';

export function planDevServer(options = {}) {
  for (const key of Object.keys(options)) if (!['cli', 'port', 'database'].includes(key)) throw new Error('Unsupported local server option.');
  const port = options.port ?? 17233;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a port from 1024 to 65535.');
  let command = options.cli ?? 'temporal';
  if (command !== 'temporal') {
    if (typeof command !== 'string' || !path.isAbsolute(command) || !lstatSync(command).isFile() || /\.(?:cmd|bat)$/i.test(command)) throw new Error('CLI must be an absolute executable file or temporal on PATH.');
    command = realpathSync(command);
  }
  const args = ['--disable-config-file', '--disable-config-env', 'server', 'start-dev', '--ip', '127.0.0.1', '--port', String(port), '--headless'];
  if (options.database !== undefined) {
    if (typeof options.database !== 'string' || !options.database.trim()) throw new Error('Choose a new database file.');
    const file = path.resolve(options.database);
    if (existsSync(file) || existsSync(file + '-wal') || existsSync(file + '-shm')) throw new Error('Database or sidecar already exists.');
    const parent = realpathSync(path.dirname(file));
    if (!lstatSync(parent).isDirectory()) throw new Error('Database parent must be a directory.');
    args.push('--db-filename', path.join(parent, path.basename(file)));
  }
  return { command, args, address: `127.0.0.1:${port}`, namespace: 'default', execution: 'not-started', cloudAccess: false, persistent: options.database !== undefined,
    note: 'Run in a task-owned process with isolated HOME / USERPROFILE. Check the installed CLI supports these flags. Recheck that a new database path stays unused until launch; this plan does not reserve it. An in-memory server loses state on exit.' };
}

const sample = `from datetime import timedelta
from temporalio import activity, workflow
from temporalio.common import RetryPolicy

@activity.defn
async def double_value(value: int) -> dict:
    # Deliberately fail once: no external effects, then prove retry by attempt count.
    attempt = activity.info().attempt
    if attempt == 1:
        raise RuntimeError("intentional sample retry")
    return {"value": value * 2, "attempt": attempt}

@workflow.defn
class LocalExample:
    @workflow.run
    async def run(self, value: int) -> dict:
        return await workflow.execute_activity(double_value, value,
            start_to_close_timeout=timedelta(seconds=10),
            retry_policy=RetryPolicy(initial_interval=timedelta(milliseconds=100), maximum_attempts=2))
`;
const runner = `import argparse
import asyncio
import json
import uuid
from temporalio.client import Client
from temporalio.worker import Worker
from sample import LocalExample, double_value

async def main(args):
    # Only this explicit loopback endpoint; no cloud identity or config loading.
    client = await Client.connect(f"127.0.0.1:{args.port}", namespace="default")
    identity = "cotree-local-" + uuid.uuid4().hex
    async with Worker(client, task_queue=identity, workflows=[LocalExample], activities=[double_value]):
        handle = await client.start_workflow(LocalExample.run, 21, id=identity, task_queue=identity)
        result = await asyncio.wait_for(handle.result(), timeout=30)
        description = await handle.describe()
        history = await handle.fetch_history()
        assert result == {"value": 42, "attempt": 2}, result
        assert description.status.name == "COMPLETED", description.status
        print(json.dumps({"workflowId": identity, "runId": description.run_id,
            "status": description.status.name, "result": result, "historyEvents": len(history.events)}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=17233)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error("port must be 1024..65535")
    asyncio.run(main(args))
`;

export function bootstrapTemporal(output) {
  return { ...writeNewProject(output, {
    'sample.py': sample, 'run.py': runner, 'requirements.txt': 'temporalio==1.34.0\n',
    '.gitignore': '.venv/\n__pycache__/\n*.db*\n.env\n',
    'README.md': '# CoTree local Temporal sample\n\nPython 3.10+; create a project-local virtual environment and install requirements.txt. Start an isolated Temporal CLI dev server on 127.0.0.1:17233 using the packaged local plan, then run python run.py --port 17233. The Activity deliberately fails once, retries once, and returns value 42 with attempt 2. The runner reads Workflow status and Event History. It exits its Worker on completion. Stop only your dev-server process.\n\nNo cloud account, payment, external Activity, credentials or deployment. Pins are a reference snapshot, not a latest-version promise. In-memory state is lost when the server stops. Production needs the actual SDK / server compatibility, durable infrastructure and idempotent external Activities.\n'
  }), sdkVersion: '1.34.0', workflowStarted: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [mode, ...args] = process.argv.slice(2); const options = {};
    if (mode === '--help') { console.log('temporal-local.mjs bootstrap --output NEW_DIRECTORY | plan [--cli ABSOLUTE_EXECUTABLE] [--port NUMBER] [--database NEW_FILE]'); process.exit(0); }
    for (let i = 0; i < args.length; i += 2) {
      if (!['--output', '--cli', '--port', '--database'].includes(args[i]) || !args[i + 1] || options[args[i].slice(2)] !== undefined) throw new Error('Invalid arguments.');
      options[args[i].slice(2)] = args[i] === '--port' ? Number(args[i + 1]) : args[i + 1];
    }
    if (mode === 'bootstrap' && Object.keys(options).length === 1 && options.output) console.log(JSON.stringify(bootstrapTemporal(options.output), null, 2));
    else if (mode === 'plan') console.log(JSON.stringify(planDevServer(options), null, 2));
    else throw new Error('Choose bootstrap or plan.');
  } catch { console.error('Temporal local preparation failed; check mode, options and new output paths. No service was started.'); process.exitCode = 1; }
}
