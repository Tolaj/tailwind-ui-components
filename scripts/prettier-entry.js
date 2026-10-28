// Prettier's browser build with the plugins HTML needs (CSS in <style>, JavaScript in <script>), bundled into packages/editor/vendor/prettier.js
// by scripts/build-codemirror.mjs. The code editor loads it the first time something is formatted.
import * as prettier from "prettier/standalone";
import * as html from "prettier/plugins/html";
import * as postcss from "prettier/plugins/postcss";
import * as babel from "prettier/plugins/babel";
import * as estree from "prettier/plugins/estree";

/** Formats a component's source (HTML with its <style> and <script>). Rejects with Prettier's error when the markup can't be parsed. */
export function formatSource(text, options = {}) {
    return prettier.format(text, { parser: "html", plugins: [html, postcss, babel, estree], printWidth: 100, tabWidth: 2, ...options });
}
