#!/usr/bin/env node
/**
 * 2Fin Tax MCP — stdio connector for the hosted server at https://taxmcp.ai2fin.com
 *
 * The tax engine runs on the hosted endpoint. This file holds no tax logic: it
 * reads newline-delimited JSON-RPC messages on stdin, POSTs each one to the
 * endpoint (streamable HTTP, JSON responses, no auth) and writes the reply to
 * stdout. Use it for MCP clients that only speak stdio; clients that support
 * remote servers can connect to the URL directly.
 *
 *   node bin/stdio-proxy.mjs
 *   TAX_MCP_URL=https://taxmcp.ai2fin.com node bin/stdio-proxy.mjs
 *
 * No dependencies. Node 18+ (global fetch).
 */
import { createInterface } from 'node:readline';

const ENDPOINT = process.env.TAX_MCP_URL || 'https://taxmcp.ai2fin.com';
const TIMEOUT_MS = Number(process.env.TAX_MCP_TIMEOUT_MS) || 30_000;

const write = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`);
const log = (...a) => process.stderr.write(`[2fin-tax-mcp] ${a.join(' ')}\n`);

function errorReply(id, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code: -32603, message } };
}

async function forward(message) {
  // A notification (no id) expects no reply; the endpoint answers 202 or an empty body.
  const expectsReply = Object.prototype.hasOwnProperty.call(message, 'id');
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    if (!expectsReply) return;
    if (!res.ok) return write(errorReply(message.id, `Tax MCP endpoint answered HTTP ${res.status}`));
    write(JSON.parse(text));
  } catch (err) {
    log('request failed:', err?.message || String(err));
    if (expectsReply) write(errorReply(message.id, `Tax MCP endpoint unreachable: ${err?.message || err}`));
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
const pending = new Set();
rl.on('line', (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
  }
  const messages = Array.isArray(message) ? message : [message];
  for (const m of messages) {
    const p = forward(m).finally(() => pending.delete(p));
    pending.add(p);
  }
});
rl.on('close', async () => {
  await Promise.allSettled([...pending]);
  process.exit(0);
});
