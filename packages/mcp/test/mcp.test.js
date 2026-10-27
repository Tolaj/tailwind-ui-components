import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createMcpRouter, text, fail, annotateTools } from "../index.js";

const tools = [
    { name: "read_it", description: "reads", inputSchema: { type: "object", properties: {} }, title: "Read it", readOnly: true },
    { name: "write_it", description: "writes", inputSchema: { type: "object", properties: {} }, destructive: true },
];

async function serve(extra = {}) {
    const app = express();
    app.use(express.json());
    app.use("/mcp", createMcpRouter({
        serverInfo: { name: "t", version: "1" },
        instructions: async (who) => `hello ${who}`,
        tools,
        callTool: async (who, name, args) => (name === "read_it" ? text({ who, args }) : fail(`Unknown tool: ${name}`)),
        authenticate: (req) => (req.get("authorization") === "Bearer ok" ? "u1" : null),
        challenge: () => 'Bearer realm="t"',
        ...extra,
    }));
    const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
    const url = `http://127.0.0.1:${server.address().port}/mcp`;
    const post = (body, headers = { authorization: "Bearer ok" }) =>
        fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
    return { server, url, post };
}

test("tools are listed with a title and safety hints", () => {
    const [r, w] = annotateTools(tools);
    assert.equal(r.title, "Read it");
    assert.deepEqual(r.annotations, { title: "Read it", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
    assert.equal(w.title, "write_it");
    assert.equal(w.annotations.destructiveHint, true);
    assert.equal("readOnly" in r, false);
});

test("initialize, list and call work for a signed-in caller", async () => {
    const { server, post } = await serve();
    try {
        const init = await (await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } })).json();
        assert.equal(init.result.protocolVersion, "2025-03-26");
        assert.equal(init.result.instructions, "hello u1");
        assert.deepEqual(init.result.serverInfo, { name: "t", version: "1" });
        const list = await (await post({ jsonrpc: "2.0", id: 2, method: "tools/list" })).json();
        assert.deepEqual(list.result.tools.map((t) => t.name), ["read_it", "write_it"]);
        const call = await (await post({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "read_it", arguments: { a: 1 } } })).json();
        assert.deepEqual(JSON.parse(call.result.content[0].text), { who: "u1", args: { a: 1 } });
        const bad = await (await post({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "nope" } })).json();
        assert.equal(bad.result.isError, true);
    } finally { server.close(); }
});

test("a caller without a token gets a 401 with the challenge", async () => {
    const { server, post } = await serve();
    try {
        const res = await post({ jsonrpc: "2.0", id: 1, method: "ping" }, {});
        assert.equal(res.status, 401);
        assert.equal(res.headers.get("www-authenticate"), 'Bearer realm="t"');
        assert.equal((await res.json()).error.code, -32001);
    } finally { server.close(); }
});

test("batches, notifications, unknown methods and wrong verbs", async () => {
    const { server, post, url } = await serve();
    try {
        const batch = await (await post([{ jsonrpc: "2.0", id: 1, method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }])).json();
        assert.equal(batch.length, 1);
        assert.deepEqual(batch[0], { jsonrpc: "2.0", id: 1, result: {} });
        assert.equal((await post({ jsonrpc: "2.0", method: "notifications/initialized" })).status, 202);
        const unknown = await (await post({ jsonrpc: "2.0", id: 9, method: "nope/nope" })).json();
        assert.equal(unknown.error.code, -32601);
        assert.equal((await post({ nope: true })).status, 200);
        assert.equal((await post([])).status, 400);
        const get = await fetch(url);
        assert.equal(get.status, 405);
        assert.equal(get.headers.get("allow"), "POST, OPTIONS");
        const options = await fetch(url, { method: "OPTIONS" });
        assert.equal(options.status, 204);
        assert.equal(options.headers.get("access-control-allow-origin"), "*");
    } finally { server.close(); }
});
