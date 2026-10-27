import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { buildGenerateSystem, buildUserMessage, parseEnrichment, generateStream, SYSTEM_PROMPT } from "../index.js";

test("the system prompt grows only when there are library references", () => {
    assert.equal(buildGenerateSystem(), SYSTEM_PROMPT);
    const system = buildGenerateSystem({ references: [{ title: "Hero", htmlCode: "<section>x</section>" }], tokensMarkdown: "- radius: lg" });
    assert.match(system, /design system/);
    assert.match(system, /- radius: lg/);
    assert.match(system, /Reference 1: Hero/);
});

test("the user message asks for a new component or a change", () => {
    assert.match(buildUserMessage({ prompt: "a pricing table" }), /^Create a Tailwind CSS HTML component for: a pricing table/);
    assert.match(buildUserMessage({ prompt: "make it blue", currentHtml: "<p>hi</p>" }), /<p>hi<\/p>[\s\S]*make it blue/);
});

test("the metadata reply is read from JSON and cut short; anything else is null", () => {
    const meta = parseEnrichment('Sure! {"summary":"A card","useWhen":"lists","avoidWhen":"' + "x".repeat(400) + '"}');
    assert.equal(meta.summary, "A card");
    assert.equal(meta.avoidWhen.length, 240);
    assert.equal(parseEnrichment("no json here"), null);
    assert.equal(parseEnrichment("{broken"), null);
    assert.equal(parseEnrichment(null), null);
});

test("a local server's stream comes out as deltas and a done", async () => {
    const server = http.createServer((req, res) => {
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        res.write('data: {"choices":[{"delta":{"content":"<p>"}}]}\n\n');
        res.write('data: {"choices":[{"delta":{"content":"hi</p>"}}]}\n\ndata: [DONE]\n\n');
        res.end();
    });
    await new Promise((r) => server.listen(0, r));
    try {
        const events = [];
        for await (const e of generateStream({ provider: "local", localLlmUrl: `http://127.0.0.1:${server.address().port}` }, { prompt: "x" })) events.push(e);
        assert.deepEqual(events, [{ type: "delta", text: "<p>" }, { type: "delta", text: "hi</p>" }, { type: "done" }]);
    } finally { server.close(); }
});

test("missing settings and a failing server come out as error events, not throws", async () => {
    const none = [];
    for await (const e of generateStream({ provider: "anthropic" }, { prompt: "x" })) none.push(e);
    assert.deepEqual(none, [{ type: "error", message: "Anthropic API key not configured" }]);
    const noUrl = [];
    for await (const e of generateStream({ provider: "local" }, { prompt: "x" })) noUrl.push(e);
    assert.deepEqual(noUrl, [{ type: "error", message: "Local LLM URL not configured" }]);
    const server = http.createServer((req, res) => { res.writeHead(500).end(); });
    await new Promise((r) => server.listen(0, r));
    try {
        const failed = [];
        for await (const e of generateStream({ provider: "local", localLlmUrl: `http://127.0.0.1:${server.address().port}` }, { prompt: "x" })) failed.push(e);
        assert.equal(failed.length, 1);
        assert.match(failed[0].message, /LLM server error: 500/);
    } finally { server.close(); }
});
