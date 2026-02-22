





// // ─── AI Component Generator ────────────────────────────────────────────────

// const addAIMessage = (text, role = "ai") => {
//     const container = document.getElementById("aiMessages");
//     if (!container) return;

//     container.classList.remove("hidden");

//     const msg = document.createElement("div");
//     msg.className =
//         role === "user"
//             ? "ml-auto bg-white text-black text-xs px-3 py-2 rounded-xl max-w-[85%] break-words"
//             : "bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs px-3 py-2 rounded-xl max-w-[85%] break-words";
//     msg.textContent = text;
//     container.appendChild(msg);
//     container.scrollTop = container.scrollHeight;
// };

// const setAILoading = (loading) => {
//     const btn = document.getElementById("aiGenerateBtn");
//     const sendIcon = document.getElementById("aiSendIcon");
//     const spinner = document.getElementById("aiSpinner");
//     const input = document.getElementById("aiPromptInput");

//     btn.disabled = loading;
//     input.disabled = loading;

//     if (loading) {
//         sendIcon.classList.add("hidden");
//         spinner.classList.remove("hidden");
//         input.classList.add("opacity-50");
//     } else {
//         sendIcon.classList.remove("hidden");
//         spinner.classList.add("hidden");
//         input.classList.remove("opacity-50");
//     }
// };

// const handleAIGenerate = async () => {
//     const input = document.getElementById("aiPromptInput");
//     const prompt = input?.value?.trim();

//     if (!prompt) {
//         input?.focus();
//         return;
//     }

//     // Get current HTML from editor (pass it so Claude can modify existing code)
//     const currentHtml = document.getElementById("htmlEditor")?.value?.trim() || "";

//     addAIMessage(prompt, "user");
//     input.value = "";
//     setAILoading(true);

//     try {
//         const response = await fetch("/api/ai/generate", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ prompt, currentHtml }),
//         });

//         const result = await response.json();

//         if (!result.success) {
//             addAIMessage(`Error: ${result.message}`, "ai");
//             return;
//         }

//         // Inject the returned HTML into the editor textarea
//         const editor = document.getElementById("htmlEditor");
//         if (editor) {
//             editor.value = result.html;
//             // Trigger the live preview update
//             editor.dispatchEvent(new Event("input", { bubbles: true }));
//         }

//         addAIMessage("✓ Component generated — review it in the editor above.", "ai");

//     } catch (err) {
//         console.error("AI generate error:", err);
//         addAIMessage("Server error. Please try again.", "ai");
//     } finally {
//         setAILoading(false);
//     }
// };

// // Allow pressing Enter in the AI prompt input to trigger generation
// document.addEventListener("DOMContentLoaded", () => {
//     const input = document.getElementById("aiPromptInput");
//     if (input) {
//         input.addEventListener("keydown", (e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 handleAIGenerate();
//             }
//         });
//     }
// });


// // ─── AI Component Generator (Streaming) ────────────────────────────────────

// const addAIMessage = (text, role = "ai") => {
//     const container = document.getElementById("aiMessages");
//     if (!container) return;
//     container.classList.remove("hidden");
//     const msg = document.createElement("div");
//     msg.className = role === "user"
//         ? "ml-auto bg-white text-black text-xs px-3 py-2 rounded-xl max-w-[85%] break-words"
//         : "bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs px-3 py-2 rounded-xl max-w-[85%] break-words";
//     msg.textContent = text;
//     container.appendChild(msg);
//     container.scrollTop = container.scrollHeight;
// };

// const showAISkeleton = (visible) => {
//     const skeleton = document.getElementById("aiSkeleton");
//     if (!skeleton) return;
//     skeleton.classList.toggle("hidden", !visible);
//     skeleton.classList.toggle("flex", visible);
// };

// const setAILoading = (loading) => {
//     const btn = document.getElementById("aiGenerateBtn");
//     const send = document.getElementById("aiSendIcon");
//     const spin = document.getElementById("aiSpinner");
//     const input = document.getElementById("aiPromptInput");

//     if (!btn) return;
//     btn.disabled = loading;
//     input.disabled = loading;
//     send.classList.toggle("hidden", loading);
//     spin.classList.toggle("hidden", !loading);
//     input.classList.toggle("opacity-50", loading);
// };

// /**
//  * Streams delta text into the editor character-by-character (typewriter effect).
//  * Fires an "input" event after every chunk so the live preview stays in sync.
//  */
// const streamIntoEditor = (() => {
//     let queue = [];
//     let running = false;
//     let editor = null;

//     const flush = () => {
//         if (!queue.length) { running = false; return; }
//         running = true;
//         const chunk = queue.shift();
//         if (editor) {
//             editor.value += chunk;
//             editor.dispatchEvent(new Event("input", { bubbles: true }));
//             // Scroll the textarea to the bottom so the user sees new lines appear
//             editor.scrollTop = editor.scrollHeight;
//         }
//         // ~16ms per chunk ≈ 60fps feel; adjust lower for faster typing
//         setTimeout(flush, 16);
//     };

//     return {
//         init() { editor = document.getElementById("htmlEditor"); queue = []; running = false; },
//         push(t) { queue.push(t); if (!running) flush(); },
//         clear() { if (editor) editor.value = ""; queue = []; running = false; }
//     };
// })();

// const handleAIGenerate = async () => {
//     const input = document.getElementById("aiPromptInput");
//     const prompt = input?.value?.trim();
//     if (!prompt) { input?.focus(); return; }

//     const currentHtml = document.getElementById("htmlEditor")?.value?.trim() || "";

//     addAIMessage(prompt, "user");
//     input.value = "";

//     setAILoading(true);
//     showAISkeleton(true);

//     // Clear the editor before streaming begins
//     streamIntoEditor.init();
//     streamIntoEditor.clear();
//     // Also clear the live preview immediately
//     const preview = document.getElementById("preview");
//     if (preview) preview.innerHTML = "";

//     let firstChunkReceived = false;

//     try {
//         const response = await fetch("/api/ai/generate-stream", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ prompt, currentHtml }),
//         });

//         if (!response.ok) {
//             const err = await response.json().catch(() => ({ message: "Unknown error" }));
//             addAIMessage(`Error: ${err.message}`, "ai");
//             return;
//         }

//         const reader = response.body.getReader();
//         const decoder = new TextDecoder();
//         let leftover = "";

//         while (true) {
//             const { done, value } = await reader.read();
//             if (done) break;

//             leftover += decoder.decode(value, { stream: true });

//             // SSE lines are separated by "\n\n"
//             const parts = leftover.split("\n\n");
//             leftover = parts.pop(); // keep incomplete last chunk

//             for (const part of parts) {
//                 const line = part.trim();
//                 if (!line.startsWith("data:")) continue;

//                 let parsed;
//                 try { parsed = JSON.parse(line.slice(5).trim()); }
//                 catch { continue; }

//                 if (parsed.type === "delta") {
//                     // Hide skeleton on first real content
//                     if (!firstChunkReceived) {
//                         firstChunkReceived = true;
//                         showAISkeleton(false);
//                         setAILoading(false);
//                     }
//                     // Strip accidental markdown fences that may appear in first chunk
//                     const clean = parsed.text.replace(/^```[\w]*\n?/g, "").replace(/```/g, "");
//                     streamIntoEditor.push(clean);
//                 }

//                 if (parsed.type === "done") {
//                     addAIMessage("✓ Component generated — review it in the editor.", "ai");
//                 }

//                 if (parsed.type === "error") {
//                     addAIMessage(`Error: ${parsed.message}`, "ai");
//                     showAISkeleton(false);
//                     setAILoading(false);
//                 }
//             }
//         }
//     } catch (err) {
//         console.error("AI stream error:", err);
//         addAIMessage("Server error. Please try again.", "ai");
//     } finally {
//         showAISkeleton(false);
//         setAILoading(false);
//     }
// };

// // Press Enter to generate
// document.addEventListener("DOMContentLoaded", () => {
//     const input = document.getElementById("aiPromptInput");
//     if (input) {
//         input.addEventListener("keydown", (e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 handleAIGenerate();
//             }
//         });
//     }
// });


// // ─── AI Component Generator (Streaming + Cursor Edit Animation) good ────────────

// const addAIMessage = (text, role = "ai") => {
//     const container = document.getElementById("aiMessages");
//     if (!container) return;
//     container.classList.remove("hidden");
//     const msg = document.createElement("div");
//     msg.className = role === "user"
//         ? "ml-auto bg-white text-black text-xs px-3 py-2 rounded-xl max-w-[85%] break-words"
//         : "bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs px-3 py-2 rounded-xl max-w-[85%] break-words";
//     msg.textContent = text;
//     container.appendChild(msg);
//     container.scrollTop = container.scrollHeight;
// };

// const showAISkeleton = (visible) => {
//     const skeleton = document.getElementById("aiSkeleton");
//     if (!skeleton) return;
//     skeleton.classList.toggle("hidden", !visible);
//     skeleton.classList.toggle("flex", visible);
// };

// const setAILoading = (loading) => {
//     const btn = document.getElementById("aiGenerateBtn");
//     const send = document.getElementById("aiSendIcon");
//     const spin = document.getElementById("aiSpinner");
//     const input = document.getElementById("aiPromptInput");
//     if (!btn) return;
//     btn.disabled = loading;
//     input.disabled = loading;
//     send.classList.toggle("hidden", loading);
//     spin.classList.toggle("hidden", !loading);
//     input.classList.toggle("opacity-50", loading);
// };

// const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// const scrollToIndex = (textarea, index) => {
//     textarea.focus();
//     textarea.setSelectionRange(index, index);
// };

// // ── LCS line differ ──────────────────────────────────────────────────────────
// const diffLines = (oldText, newText) => {
//     const a = oldText === "" ? [] : oldText.split("\n");
//     const b = newText === "" ? [] : newText.split("\n");
//     const m = a.length, n = b.length;
//     const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
//     for (let i = m - 1; i >= 0; i--)
//         for (let j = n - 1; j >= 0; j--)
//             dp[i][j] = a[i] === b[j]
//                 ? dp[i + 1][j + 1] + 1
//                 : Math.max(dp[i + 1][j], dp[i][j + 1]);

//     const ops = [];
//     let i = 0, j = 0;
//     while (i < m || j < n) {
//         if (i < m && j < n && a[i] === b[j]) {
//             ops.push({ type: "keep", lineA: a[i], lineB: b[j] }); i++; j++;
//         } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
//             ops.push({ type: "add", lineB: b[j] }); j++;
//         } else {
//             ops.push({ type: "remove", lineA: a[i] }); i++;
//         }
//     }
//     return ops;
// };

// // ── Group ops into hunks: consecutive removes/adds batched together ──────────
// // Each hunk = { keeps_before, removes[], adds[] }
// // This guarantees we always delete first, then insert, for every changed region.
// const groupIntoHunks = (ops) => {
//     const hunks = [];
//     let i = 0;
//     while (i < ops.length) {
//         if (ops[i].type === "keep") {
//             hunks.push({ type: "keep", line: ops[i].lineA });
//             i++;
//         } else {
//             // Collect all consecutive removes and adds
//             const removes = [];
//             const adds = [];
//             while (i < ops.length && ops[i].type === "remove") { removes.push(ops[i].lineA); i++; }
//             while (i < ops.length && ops[i].type === "add") { adds.push(ops[i].lineB); i++; }
//             // If they were interleaved (add before remove), keep collecting
//             while (i < ops.length && (ops[i].type === "remove" || ops[i].type === "add")) {
//                 if (ops[i].type === "remove") removes.push(ops[i].lineA);
//                 else adds.push(ops[i].lineB);
//                 i++;
//             }
//             hunks.push({ type: "change", removes, adds });
//         }
//     }
//     return hunks;
// };

// // ── Core animation ───────────────────────────────────────────────────────────
// const animateEdits = async (oldHtml, newHtml) => {
//     const editor = document.getElementById("htmlEditor");
//     if (!editor) return;

//     const ops = diffLines(oldHtml, newHtml);
//     const hunks = groupIntoHunks(ops);

//     let current = oldHtml;
//     let charOffset = 0;

//     for (const hunk of hunks) {
//         if (hunk.type === "keep") {
//             charOffset += hunk.line.length + 1; // +1 for \n
//             continue;
//         }

//         // ── STEP 1: delete all removed lines first ───────────────────────
//         for (const removedLine of hunk.removes) {
//             const lineLen = removedLine.length;
//             const hasNewline = current[charOffset + lineLen] === "\n";
//             const deleteLen = lineLen + (hasNewline ? 1 : 0);

//             scrollToIndex(editor, charOffset);
//             await sleep(40);

//             for (let k = 0; k < deleteLen; k++) {
//                 current = current.slice(0, charOffset) + current.slice(charOffset + 1);
//                 editor.value = current;
//                 editor.setSelectionRange(charOffset, charOffset);
//                 editor.dispatchEvent(new Event("input", { bubbles: true }));
//                 await sleep(6);
//             }
//             // charOffset stays — next line is now at same position
//         }

//         // ── STEP 2: type all added lines after ───────────────────────────
//         for (const addedLine of hunk.adds) {
//             const toInsert = addedLine + "\n";

//             scrollToIndex(editor, charOffset);
//             await sleep(30);

//             for (const ch of toInsert) {
//                 current = current.slice(0, charOffset) + ch + current.slice(charOffset);
//                 charOffset++;
//                 editor.value = current;
//                 editor.setSelectionRange(charOffset, charOffset);
//                 editor.dispatchEvent(new Event("input", { bubbles: true }));
//                 await sleep(10);
//             }
//         }
//     }

//     // Final write to guarantee correctness
//     editor.value = newHtml;
//     editor.dispatchEvent(new Event("input", { bubbles: true }));
// };

// // ── Main handler ─────────────────────────────────────────────────────────────
// const handleAIGenerate = async () => {
//     const input = document.getElementById("aiPromptInput");
//     const prompt = input?.value?.trim();
//     if (!prompt) { input?.focus(); return; }

//     const editor = document.getElementById("htmlEditor");
//     const currentHtml = editor?.value ?? "";
//     const isModify = currentHtml.trim().length > 0;

//     addAIMessage(prompt, "user");
//     input.value = "";

//     setAILoading(true);
//     showAISkeleton(true);

//     let accumulated = "";
//     let firstChunkReceived = false;

//     try {
//         const response = await fetch("/api/ai/generate-stream", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ prompt, currentHtml }),
//         });

//         if (!response.ok) {
//             const err = await response.json().catch(() => ({ message: "Unknown error" }));
//             addAIMessage(`Error: ${err.message}`, "ai");
//             return;
//         }

//         const reader = response.body.getReader();
//         const decoder = new TextDecoder();
//         let leftover = "";

//         while (true) {
//             const { done, value } = await reader.read();
//             if (done) break;

//             leftover += decoder.decode(value, { stream: true });
//             const parts = leftover.split("\n\n");
//             leftover = parts.pop();

//             for (const part of parts) {
//                 const line = part.trim();
//                 if (!line.startsWith("data:")) continue;
//                 let parsed;
//                 try { parsed = JSON.parse(line.slice(5).trim()); } catch { continue; }

//                 if (parsed.type === "delta") {
//                     if (!firstChunkReceived) {
//                         firstChunkReceived = true;
//                         showAISkeleton(false);
//                         setAILoading(false);

//                         if (!isModify) {
//                             if (editor) editor.value = "";
//                             const preview = document.getElementById("preview");
//                             if (preview) preview.innerHTML = "";
//                         }
//                     }

//                     const clean = parsed.text
//                         .replace(/^```[\w]*\n?/g, "")
//                         .replace(/```/g, "");

//                     accumulated += clean;

//                     // Fresh generate: show live as it streams
//                     if (!isModify && editor) {
//                         editor.value = accumulated;
//                         editor.scrollTop = editor.scrollHeight;
//                         editor.dispatchEvent(new Event("input", { bubbles: true }));
//                     }
//                 }

//                 if (parsed.type === "done") {
//                     const finalHtml = accumulated
//                         .replace(/^```[\w]*\n?/gm, "")
//                         .replace(/```$/gm, "")
//                         .trim();

//                     if (isModify) {
//                         await animateEdits(currentHtml, finalHtml);
//                     } else {
//                         if (editor) {
//                             editor.value = finalHtml;
//                             editor.dispatchEvent(new Event("input", { bubbles: true }));
//                         }
//                     }

//                     addAIMessage(
//                         isModify ? "✓ Changes applied." : "✓ Component generated.",
//                         "ai"
//                     );
//                 }

//                 if (parsed.type === "error") {
//                     addAIMessage(`Error: ${parsed.message}`, "ai");
//                     showAISkeleton(false);
//                     setAILoading(false);
//                 }
//             }
//         }
//     } catch (err) {
//         console.error("AI stream error:", err);
//         addAIMessage("Server error. Please try again.", "ai");
//     } finally {
//         showAISkeleton(false);
//         setAILoading(false);
//     }
// };

// // Enter to submit
// document.addEventListener("DOMContentLoaded", () => {
//     const input = document.getElementById("aiPromptInput");
//     if (input) {
//         input.addEventListener("keydown", (e) => {
//             if (e.key === "Enter" && !e.shiftKey) {
//                 e.preventDefault();
//                 handleAIGenerate();
//             }
//         });
//     }
// });

// ─── AI Component Generator (Streaming + Cursor Edit Animation) ────────────

const addAIMessage = (text, role = "ai") => {
    const container = document.getElementById("aiMessages");
    if (!container) return;
    container.classList.remove("hidden");
    const msg = document.createElement("div");
    msg.className = role === "user"
        ? "ml-auto bg-white text-black text-xs px-3 py-2 rounded-xl max-w-[85%] break-words"
        : "bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs px-3 py-2 rounded-xl max-w-[85%] break-words";
    msg.textContent = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
};

const showAISkeleton = (visible) => {
    const skeleton = document.getElementById("aiSkeleton");
    if (!skeleton) return;
    skeleton.classList.toggle("hidden", !visible);
    skeleton.classList.toggle("flex", visible);
};

const setAILoading = (loading) => {
    const btn = document.getElementById("aiGenerateBtn");
    const send = document.getElementById("aiSendIcon");
    const spin = document.getElementById("aiSpinner");
    const input = document.getElementById("aiPromptInput");
    if (!btn) return;
    btn.disabled = loading;
    input.disabled = loading;
    send.classList.toggle("hidden", loading);
    spin.classList.toggle("hidden", !loading);
    input.classList.toggle("opacity-50", loading);
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Skeleton blink on the editor ────────────────────────────────────────────
// Code stays fully visible but pulses opacity like a skeleton loader,
// signalling "thinking" without hiding what's already there.
const SKELETON_STYLE_ID = "ai-editor-skeleton-style";

const setEditorSkeleton = (active) => {
    const editor = document.getElementById("htmlEditor");
    if (!editor) return;

    let styleEl = document.getElementById(SKELETON_STYLE_ID);

    if (active) {
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = SKELETON_STYLE_ID;
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
            @keyframes ai-blink {
                0%, 100% { opacity: 1;   }
                50%       { opacity: 0.5; }
            }
            #htmlEditor.ai-skeleton {
                animation: ai-blink 1.4s ease-in-out infinite !important;
                pointer-events: none;
            }
        `;
        editor.classList.add("ai-skeleton");
    } else {
        editor.classList.remove("ai-skeleton");
        setTimeout(() => {
            styleEl = document.getElementById(SKELETON_STYLE_ID);
            if (styleEl) styleEl.textContent = "";
        }, 300);
    }
};

// ── Scroll so the line at charIndex is vertically centred ───────────────────
// Uses a hidden mirror div that exactly clones the textarea's layout so we
// can measure the real pixel offset of any character, then centre it.
let _scrollMirror = null;
const scrollToChar = (textarea, charIndex) => {
    if (!_scrollMirror) {
        _scrollMirror = document.createElement("div");
        _scrollMirror.setAttribute("aria-hidden", "true");
        Object.assign(_scrollMirror.style, {
            position: "absolute",
            top: "-9999px",
            left: "-9999px",
            visibility: "hidden",
            overflow: "hidden",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            boxSizing: "border-box",
        });
        document.body.appendChild(_scrollMirror);
    }

    // Clone every layout-affecting style from the textarea
    const cs = window.getComputedStyle(textarea);
    [
        "width", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
        "borderTopWidth", "borderBottomWidth", "fontFamily", "fontSize",
        "fontWeight", "fontStyle", "letterSpacing", "lineHeight", "tabSize"
    ].forEach(p => _scrollMirror.style[p] = cs[p]);

    // Fill mirror with the text up to charIndex then a marker span
    const before = document.createTextNode(textarea.value.slice(0, charIndex));
    const marker = document.createElement("span");
    marker.textContent = "\u200b"; // zero-width space — just a measurement anchor
    _scrollMirror.innerHTML = "";
    _scrollMirror.appendChild(before);
    _scrollMirror.appendChild(marker);

    // offsetTop of the marker = exact pixel top of our target line
    const lineTop = marker.offsetTop;
    const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
    const centred = lineTop - (textarea.clientHeight / 2) + (lineHeight / 2);
    textarea.scrollTop = Math.max(0, centred);
};

// ── LCS line differ ──────────────────────────────────────────────────────────
const diffLines = (oldText, newText) => {
    const a = oldText === "" ? [] : oldText.split("\n");
    const b = newText === "" ? [] : newText.split("\n");
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
    for (let i = m - 1; i >= 0; i--)
        for (let j = n - 1; j >= 0; j--)
            dp[i][j] = a[i] === b[j]
                ? dp[i + 1][j + 1] + 1
                : Math.max(dp[i + 1][j], dp[i][j + 1]);

    const ops = [];
    let i = 0, j = 0;
    while (i < m || j < n) {
        if (i < m && j < n && a[i] === b[j]) {
            ops.push({ type: "keep", lineA: a[i] }); i++; j++;
        } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
            ops.push({ type: "add", lineB: b[j] }); j++;
        } else {
            ops.push({ type: "remove", lineA: a[i] }); i++;
        }
    }
    return ops;
};

// Group so removes always come before adds per changed region
const groupIntoHunks = (ops) => {
    const hunks = [];
    let i = 0;
    while (i < ops.length) {
        if (ops[i].type === "keep") {
            hunks.push({ type: "keep", line: ops[i].lineA }); i++;
        } else {
            const removes = [], adds = [];
            while (i < ops.length && ops[i].type !== "keep") {
                if (ops[i].type === "remove") removes.push(ops[i].lineA);
                else adds.push(ops[i].lineB);
                i++;
            }
            hunks.push({ type: "change", removes, adds });
        }
    }
    return hunks;
};

// ── Core animation ───────────────────────────────────────────────────────────
const animateEdits = async (oldHtml, newHtml) => {
    const editor = document.getElementById("htmlEditor");
    if (!editor) return;

    const hunks = groupIntoHunks(diffLines(oldHtml, newHtml));

    let current = oldHtml;
    let charOffset = 0;

    for (const hunk of hunks) {
        if (hunk.type === "keep") {
            charOffset += hunk.line.length + 1; // +1 for \n
            continue;
        }

        // Centre the textarea on this hunk's start line
        scrollToChar(editor, charOffset);
        editor.focus();
        editor.setSelectionRange(charOffset, charOffset);
        await sleep(120); // pause so user can see where we are

        // ── STEP 1: backspace removed lines ───────────────────────────────
        for (const removedLine of hunk.removes) {
            const hasNewline = current[charOffset + removedLine.length] === "\n";
            const deleteLen = removedLine.length + (hasNewline ? 1 : 0);

            for (let k = 0; k < deleteLen; k++) {
                current = current.slice(0, charOffset) + current.slice(charOffset + 1);
                editor.value = current;
                editor.setSelectionRange(charOffset, charOffset);
                editor.dispatchEvent(new Event("input", { bubbles: true }));
                await sleep(5);
            }
        }

        // ── STEP 2: type added lines ──────────────────────────────────────
        for (const addedLine of hunk.adds) {
            for (const ch of addedLine + "\n") {
                current = current.slice(0, charOffset) + ch + current.slice(charOffset);
                charOffset++;
                editor.value = current;
                editor.setSelectionRange(charOffset, charOffset);
                scrollToChar(editor, charOffset);
                editor.dispatchEvent(new Event("input", { bubbles: true }));
                await sleep(9);
            }
        }
    }

    // Guarantee final correctness
    editor.value = newHtml;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
};

// ── Main handler ─────────────────────────────────────────────────────────────
export const handleAIGenerate = async () => {
    const input = document.getElementById("aiPromptInput");
    const prompt = input?.value?.trim();
    if (!prompt) { input?.focus(); return; }

    const editor = document.getElementById("htmlEditor");
    const currentHtml = editor?.value ?? "";
    const isModify = currentHtml.trim().length > 0;

    addAIMessage(prompt, "user");
    input.value = "";

    setAILoading(true);
    showAISkeleton(true);

    // Start skeleton blink immediately while Claude thinks
    if (isModify) setEditorSkeleton(true);

    let accumulated = "";
    let firstChunkReceived = false;

    try {
        const response = await fetch("/api/ai/generate-stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, currentHtml }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: "Unknown error" }));
            addAIMessage(`Error: ${err.message}`, "ai");
            setEditorSkeleton(false);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let leftover = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            leftover += decoder.decode(value, { stream: true });
            const parts = leftover.split("\n\n");
            leftover = parts.pop();

            for (const part of parts) {
                const line = part.trim();
                if (!line.startsWith("data:")) continue;
                let parsed;
                try { parsed = JSON.parse(line.slice(5).trim()); } catch { continue; }

                if (parsed.type === "delta") {
                    if (!firstChunkReceived) {
                        firstChunkReceived = true;
                        showAISkeleton(false);
                        setAILoading(false);

                        if (!isModify) {
                            if (editor) editor.value = "";
                            const preview = document.getElementById("preview");
                            if (preview) preview.innerHTML = "";
                        }
                    }

                    const clean = parsed.text
                        .replace(/^```[\w]*\n?/g, "")
                        .replace(/```/g, "");
                    accumulated += clean;

                    // Fresh generate: stream live into editor
                    if (!isModify && editor) {
                        editor.value = accumulated;
                        editor.scrollTop = editor.scrollHeight;
                        editor.dispatchEvent(new Event("input", { bubbles: true }));
                    }
                    // Modify: skeleton stays on while we silently accumulate
                }

                if (parsed.type === "done") {
                    const finalHtml = accumulated
                        .replace(/^```[\w]*\n?/gm, "")
                        .replace(/```$/gm, "")
                        .trim();

                    if (isModify) {
                        // Remove skeleton → brief pause → start cursor animation
                        setEditorSkeleton(false);
                        await sleep(300);
                        await animateEdits(currentHtml, finalHtml);
                    } else {
                        if (editor) {
                            editor.value = finalHtml;
                            editor.dispatchEvent(new Event("input", { bubbles: true }));
                        }
                    }

                    addAIMessage(
                        isModify ? "✓ Changes applied." : "✓ Component generated.",
                        "ai"
                    );
                }

                if (parsed.type === "error") {
                    addAIMessage(`Error: ${parsed.message}`, "ai");
                    showAISkeleton(false);
                    setAILoading(false);
                    setEditorSkeleton(false);
                }
            }
        }
    } catch (err) {
        console.error("AI stream error:", err);
        addAIMessage("Server error. Please try again.", "ai");
        setEditorSkeleton(false);
    } finally {
        showAISkeleton(false);
        setAILoading(false);
    }
};

