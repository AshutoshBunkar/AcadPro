import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const localEnv = new URL('../.env', import.meta.url);
let connectionString = process.env.MDB_MCP_CONNECTION_STRING;

if (!connectionString) {
  try {
    const config = parseEnv(readFileSync(localEnv, 'utf8'));
    connectionString = config.MDB_MCP_CONNECTION_STRING || config.MONGO_DB_URL;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

if (!/^mongodb(?:\+srv)?:\/\//.test(connectionString ?? '')) {
  console.error('Set MDB_MCP_CONNECTION_STRING or MONGO_DB_URL in Backend/.env.');
  process.exit(1);
}

const npmArgs = ['--yes', 'mongodb-mcp-server@3.4.0'];
const server = process.platform === 'win32'
  ? spawn('cmd.exe', ['/d', '/c', 'npx.cmd', ...npmArgs], launchOptions())
  : spawn('npx', npmArgs, launchOptions());

server.on('error', (error) => {
  console.error(`Could not start MongoDB MCP (${error.code ?? 'unknown error'}).`);
  process.exitCode = 1;
});
server.on('exit', (code) => {
  process.exitCode = code ?? 1;
});

function launchOptions() {
  return {
    stdio: 'inherit',
    env: {
      ...process.env,
      MDB_MCP_CONNECTION_STRING: connectionString,
      MDB_MCP_TELEMETRY: 'disabled',
      MDB_MCP_TRANSPORT: 'stdio',
    },
  };
}
