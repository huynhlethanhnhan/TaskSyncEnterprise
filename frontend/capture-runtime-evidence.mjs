import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(here, '..');
const root = path.join(workspace, 'docs/evidence/phase-4');
const dockerDir = path.join(root, 'docker');
const alembicDir = path.join(root, 'alembic');
await Promise.all([mkdir(dockerDir, { recursive: true }), mkdir(alembicDir, { recursive: true })]);

const composeArgs = ['compose', '--env-file', '.env.production', '-f', 'docker-compose.production.yml'];
const run = (command, args) => execFileSync(command, args, { cwd: workspace, encoding: 'utf8', windowsHide: true });
const docker = (...args) => run('docker', args);
const compose = (...args) => docker(...composeArgs, ...args);
const save = (file, content) => writeFile(file, content.endsWith('\n') ? content : `${content}\n`, 'utf8');

await save(path.join(dockerDir, 'docker_version.txt'), docker('version'));
await save(path.join(dockerDir, 'compose_version.txt'), docker('compose', 'version'));
await save(path.join(dockerDir, 'ps_output.txt'), compose('ps'));

for (const [name, container] of [
  ['backend', 'tasksync-backend-prod'],
  ['frontend', 'tasksync-frontend-prod'],
  ['nginx', 'tasksync-nginx-prod'],
  ['sqlserver', 'tasksync-sqlserver-prod'],
  ['redis', 'tasksync-redis-prod'],
]) {
  await save(path.join(dockerDir, `${name}_health.json`), docker('inspect', '--format={{json .State.Health}}', container));
}

await save(path.join(dockerDir, 'backend_logs.txt'), compose('logs', '--no-color', '--tail', '200', 'backend'));
await save(path.join(dockerDir, 'nginx_logs.txt'), compose('logs', '--no-color', '--tail', '200', 'nginx'));

const health = {};
for (const url of ['http://127.0.0.1/healthz', 'http://127.0.0.1/health', 'http://127.0.0.1/api/v1/health/ready']) {
  const response = await fetch(url);
  health[url] = { status: response.status, body: await response.text() };
}
await save(path.join(dockerDir, 'health_endpoints.json'), JSON.stringify({ generatedAt: new Date().toISOString(), health }, null, 2));

await save(path.join(dockerDir, 'redis_ping.txt'), docker('exec', 'tasksync-redis-prod', 'redis-cli', 'ping'));
const sqlCommand = '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -W -h -1 -Q "SET NOCOUNT ON; SELECT 1 AS reachable; SELECT COUNT(*) AS employees FROM TaskSyncEnterprise.dbo.employees; SELECT COUNT(*) AS tasks FROM TaskSyncEnterprise.dbo.tasks; SELECT COUNT(*) AS vacations FROM TaskSyncEnterprise.dbo.vacations; SELECT COUNT(*) AS notifications FROM TaskSyncEnterprise.dbo.notifications;"';
await save(path.join(dockerDir, 'sqlserver_reachability_and_counts.txt'), docker('exec', 'tasksync-sqlserver-prod', '/bin/bash', '-lc', sqlCommand));

await save(path.join(alembicDir, 'current.txt'), docker('exec', 'tasksync-backend-prod', 'alembic', 'current'));
await save(path.join(alembicDir, 'heads.txt'), docker('exec', 'tasksync-backend-prod', 'alembic', 'heads'));
await save(path.join(alembicDir, 'history.txt'), docker('exec', 'tasksync-backend-prod', 'alembic', 'history'));

console.log(JSON.stringify({ status: 'ok', generatedAt: new Date().toISOString(), root }, null, 2));
