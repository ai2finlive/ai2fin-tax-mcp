// Runs the connector against a local stand-in for the endpoint: a request gets its reply,
// a notification gets none, and an unreachable endpoint becomes a JSON-RPC error.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROXY = fileURLToPath(new URL('../bin/stdio-proxy.mjs', import.meta.url));

function runProxy(url, lines) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [PROXY], { env: { ...process.env, TAX_MCP_URL: url } });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('close', () => resolve(out.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))));
    child.stdin.end(lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  });
}

test('relays requests, drops notification replies', async () => {
  const seen = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d)).on('end', () => {
      const msg = JSON.parse(body);
      seen.push(msg.method);
      if (!('id' in msg)) return res.writeHead(202).end();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'tax_rate_lookup' }] } }));
    });
  });
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const replies = await runProxy(url, [
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 7, method: 'tools/list' },
  ]);
  server.close();
  assert.deepEqual(seen.sort(), ['notifications/initialized', 'tools/list']);
  assert.equal(replies.length, 1);
  assert.equal(replies[0].id, 7);
  assert.equal(replies[0].result.tools[0].name, 'tax_rate_lookup');
});

test('an unreachable endpoint answers with a JSON-RPC error, not silence', async () => {
  const replies = await runProxy('http://127.0.0.1:1', [{ jsonrpc: '2.0', id: 1, method: 'tools/list' }]);
  assert.equal(replies.length, 1);
  assert.equal(replies[0].id, 1);
  assert.match(replies[0].error.message, /unreachable/);
});
