import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

test("Glowe Studio MCP exposes its private studio tools", async () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const child = spawn(process.execPath, [path.join(root, "bin/mcp-server.mjs")], { stdio: ["pipe", "pipe", "pipe"] });
  const messages = [];
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    for (const line of chunk.split("\n").filter(Boolean)) {
      try { messages.push(JSON.parse(line)); } catch {}
    }
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } })}\n`);
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} })}\n`);
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("MCP handshake timeout")), 5000);
    const poll = setInterval(() => {
      if (messages.some((message) => message.id === 2)) { clearInterval(poll); clearTimeout(timeout); resolve(); }
    }, 25);
  });
  const tools = messages.find((message) => message.id === 2).result.tools.map((tool) => tool.name);
  assert.ok(tools.includes("glowe_studio_remix_slides"));
  assert.ok(tools.includes("glowe_studio_export_slides"));
  child.kill();
});
