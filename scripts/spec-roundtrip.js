// How well the design spec holds up on the real library. Read only: nothing is written.
//   npm run spec:roundtrip
// For each design: does spec -> HTML -> spec come back the same, does a patch leave the untouched code as written, and how
// many of its classes the spec understands as props (the rest are kept as raw classes).
import mongoose from "mongoose";
import Component from "../src/models/component.model.js";
import { toSpec, toHtml } from "../src/public/js/shared/design-spec.js";
import { readHtml, applyOps } from "../src/services/design-spec.service.js";
import { isDeepStrictEqual } from "node:util";

await mongoose.connect(process.env.MONGO_URI);
const all = await Component.find({}, { title: 1, htmlCode: 1 }).lean();

const count = (tree, acc = { props: 0, raw: 0, elements: 0 }) => {
    for (const n of tree) {
        if (!n.tag) continue;
        acc.elements++;
        acc.props += Object.values(n.props || {}).reduce((s, p) => s + Object.keys(p).length, 0);
        acc.raw += (n.raw || []).length;
        if (n.children) count(n.children, acc);
    }
    return acc;
};

const rows = [];
for (const c of all) {
    const row = { title: c.title.slice(0, 32) };
    try {
        const spec = toSpec(readHtml(c.htmlCode));
        row.specRoundTrip = isDeepStrictEqual(toSpec(readHtml(toHtml(spec))), spec) ? "same" : "DIFFERS";
        // a patch that changes nothing: is every other byte left as written?
        const first = spec.tree[0];
        if (first) {
            try {
                const out = applyOps(c.htmlCode, [{ op: "attr", id: first.id, name: "data-probe", value: "1" }, { op: "attr", id: first.id, name: "data-probe", value: null }]).html;
                row.untouchedCode = out === c.htmlCode ? "identical" : "reformatted";
            } catch (e) {
                row.untouchedCode = /malformed/.test(e.message) ? "malformed: refused" : `ERROR ${e.message}`;
            }
        }
        const k = count(spec.tree);
        row.elements = k.elements;
        row.understood = k.props + k.raw ? `${Math.round((100 * k.props) / (k.props + k.raw))}%` : "-";
    } catch (e) {
        row.specRoundTrip = `ERROR ${e.message}`;
    }
    rows.push(row);
}
console.table(rows);
const same = rows.filter((r) => r.specRoundTrip === "same").length;
const identical = rows.filter((r) => r.untouchedCode === "identical").length;
const malformed = rows.filter((r) => /malformed/.test(r.untouchedCode || "")).length;
console.log(`${all.length} designs: spec round trip same for ${same}; untouched code identical after a patch for ${identical}; ${malformed} malformed (patches refused).`);
await mongoose.disconnect();
