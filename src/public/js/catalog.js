// The catalog pages: the list (a sample of each family) and a family's page (customise a part, see every variant, copy the code).
// Parts are rendered in the browser from catalog/<family>/family.js (served as /catalog-src), inside iframes that carry the chosen theme.
import { GRAYS, RADII, DEFAULT_THEME, SYSTEM_FONT, normalizeTheme, themeHead, tailwindConfig, fontUrl } from "@windcraft/core/theme.js";
import { exportComponent } from "@windcraft/core/exporters.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** A preview document: Tailwind and the theme, light or dark. */
function previewDoc(body, theme, dark, pad = 16) {
    return `<!DOCTYPE html><html${dark ? ' class="dark"' : ""}><head><meta charset="utf-8"><script src="https://cdn.tailwindcss.com"><\/script>${themeHead(theme)}
<style>html,body{margin:0}body{padding:${pad}px;font-family:${theme.font === SYSTEM_FONT ? "system-ui" : `'${theme.font}'`},system-ui,sans-serif}</style></head>
<body class="${dark ? "bg-gray-950" : "bg-white"}">${body}</body></html>`;
}
/** Shows `body` in an iframe. An automatic frame follows its content's height (the frame is same-origin, so the page can watch it). */
function show(frame, body, theme, dark, auto = false, pad) {
    if (auto) {
        frame.onload = () => {
            const b = frame.contentDocument && frame.contentDocument.body;
            if (!b) return;
            const fit = () => { frame.style.height = `${b.offsetHeight}px`; };
            new ResizeObserver(fit).observe(b);
            fit();
        };
    }
    frame.srcdoc = previewDoc(body, theme, dark, pad);
}

// ── The list ─────────────────────────────────────────────────────────────────
if ($("catalogData")) {
    const list = JSON.parse($("catalogData").textContent);
    document.querySelectorAll("[data-sample]").forEach((f) => {
        const fam = list.find((x) => x.slug === f.dataset.sample);
        if (fam) show(f, `<div class="flex h-full min-h-[8rem] items-center justify-center">${fam.sample}</div>`, DEFAULT_THEME, false, false, 0);
    });
}

// ── A family ─────────────────────────────────────────────────────────────────
if ($("catalogMeta")) {
    const meta = JSON.parse($("catalogMeta").textContent);
    const fam = await import(`/catalog-src/${meta.slug}/family.js`);
    const FORMATS = [["html", "HTML"], ["react", "React"], ["vue", "Vue"], ["svelte", "Svelte"]];
    const FONTS = ["Inter", "Roboto", "Open Sans", "Poppins", "Lato", "Montserrat", "Nunito", "DM Sans", "Work Sans", SYSTEM_FONT];
    let theme = { ...DEFAULT_THEME }, dark = false, fmt = "html";
    const pick = { style: meta.styles[0].slug, size: "md", icon: "none" };

    // theme controls
    $("thGray").innerHTML = GRAYS.map((g) => `<option>${g}</option>`).join("");
    $("thRadius").innerHTML = RADII.map((r) => `<option ${r === theme.radius ? "selected" : ""}>${r}</option>`).join("");
    $("thFonts").innerHTML = FONTS.map((f) => `<option value="${esc(f)}">`).join("");
    const readTheme = () => { theme = normalizeTheme({ brand: $("thBrandHex").value, gray: $("thGray").value, radius: $("thRadius").value, font: $("thFont").value }); draw(); };
    $("thBrand").addEventListener("input", (e) => { $("thBrandHex").value = e.target.value; readTheme(); });
    $("thBrandHex").addEventListener("input", (e) => { if (/^#?[0-9a-f]{6}$/i.test(e.target.value.trim())) { $("thBrand").value = normalizeTheme({ brand: e.target.value }).brand; readTheme(); } });
    ["thGray", "thRadius"].forEach((id) => $(id).addEventListener("change", readTheme));
    $("thFont").addEventListener("change", readTheme);
    $("darkToggle").addEventListener("click", () => { dark = !dark; $("darkToggle").setAttribute("aria-pressed", String(dark)); $("darkToggle").textContent = dark ? "Light" : "Dark"; draw(); });

    // pickers for the customised part
    const picker = (axis, label, values) => `<label class="block"><span class="mb-1 block text-xs font-medium text-gray-500">${label}</span><select data-pick="${axis}" class="h-8 rounded-md border border-gray-300 px-2 text-sm">${values.map(([v, t]) => `<option value="${v}" ${pick[axis] === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
    const drawPickers = () => {
        $("pickers").innerHTML = picker("style", "Style", meta.styles.map((s) => [s.slug, s.name]))
            + (meta.axes.size ? picker("size", "Size", meta.axes.size.map((s) => [s, s])) : "")
            + (meta.axes.icon ? picker("icon", "Icon", meta.axes.icon.map((s) => [s, s])) : "");
    };
    $("pickers").addEventListener("change", (e) => { if (e.target.dataset.pick) { pick[e.target.dataset.pick] = e.target.value; drawMain(); } });

    const mainHtml = () => fam.render({ ...pick });
    const code = () => (fmt === "html" ? mainHtml() : exportComponent(mainHtml(), fmt, meta.name));
    function drawMain() {
        $("codeTabs").innerHTML = FORMATS.map(([f, t]) => `<button type="button" role="tab" data-fmt="${f}" class="rounded-t-md px-3 py-1.5 text-xs font-semibold ${fmt === f ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}">${t}</button>`).join("");
        $("codeBox").textContent = code();
        $("setupBox").textContent = setupText();
        show($("mainPreview"), `<div class="flex min-h-[6rem] items-center justify-center">${mainHtml()}</div>`, theme, dark);
    }
    $("codeTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-fmt]"); if (b) { fmt = b.dataset.fmt; drawMain(); } });
    $("copyBtn").addEventListener("click", async () => { await navigator.clipboard.writeText(code()); $("copyBtn").textContent = "Copied"; setTimeout(() => { $("copyBtn").textContent = "Copy"; }, 1200); });
    $("setupBtn").addEventListener("click", () => $("setupBox").classList.toggle("hidden"));
    const setupText = () => {
        const url = fontUrl(theme);
        return `<!-- Tailwind (CDN) and this theme: add after the Tailwind script -->\n${url ? `<link rel="stylesheet" href="${url}">\n` : ""}<script>\n  tailwind.config = ${JSON.stringify(tailwindConfig(theme), null, 2).replace(/\n/g, "\n  ")}\n</script>\n\n<!-- With a build step, put the same object in tailwind.config.js (theme.extend). Dark mode follows a "dark" class on <html>. -->`;
    };

    // add to a project
    const drawAdd = async () => {
        const box = $("addBox");
        if (!document.querySelector("[data-signed-in]").dataset.signedIn) { box.innerHTML = `<a href="/auth/sign-in?returnTo=${encodeURIComponent(location.pathname)}" class="text-sm text-gray-600 underline">Sign in to add this to a project</a>`; return; }
        box.innerHTML = '<span class="text-sm text-gray-500">Loading projects…</span>';
        let projects = [];
        try { projects = (await (await fetch("/api/projects")).json()).data || []; } catch { /* none */ }
        if (!projects.length) { box.innerHTML = '<a href="/projects" class="text-sm text-gray-600 underline">Create a project to add this to</a>'; return; }
        box.innerHTML = `<select id="addProject" class="h-8 rounded-md border border-gray-300 px-2 text-sm">${projects.map((p) => `<option value="${p.id}" ${p.active ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select><button id="addBtn" type="button" class="h-8 rounded-md bg-black px-3 text-xs font-semibold text-white hover:bg-neutral-800">Add to project</button><span id="addMsg" class="text-xs text-gray-500"></span>`;
        $("addBtn").addEventListener("click", async () => {
            $("addMsg").textContent = "Adding…";
            const res = await fetch(`/api/catalog/${meta.slug}/add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project: $("addProject").value, ...pick }) });
            const json = await res.json();
            $("addMsg").innerHTML = json.success ? `Added. <a class="underline" href="/projects/${json.data.project}">Open the project</a>` : esc(json.message || "Could not add it");
        });
    };

    // every variant, live
    const cell = (html) => `<div class="flex items-center justify-start">${html}</div>`;
    function drawSections() {
        const S = meta.styles, sz = meta.axes.size || [""];
        const rows = S.map((s) => `<div class="mb-2 text-xs font-medium text-gray-400">${esc(s.name)}</div><div class="mb-5 flex flex-wrap items-center gap-3">${sz.map((z) => fam.render({ style: s.slug, size: z || undefined })).join("")}</div>`).join("");
        const states = (meta.axes.state || []).length ? S.map((s) => `<div class="mb-2 text-xs font-medium text-gray-400">${esc(s.name)}</div><div class="mb-5 flex flex-wrap items-center gap-3">${meta.axes.state.map((st) => fam.render({ style: s.slug, state: st })).join("")}</div>`).join("") : "";
        const icons = (meta.axes.icon || []).length ? S.filter((s) => s.slug !== "link").map((s) => `<div class="mb-2 text-xs font-medium text-gray-400">${esc(s.name)}</div><div class="mb-5 flex flex-wrap items-center gap-3">${meta.axes.icon.map((ic) => fam.render({ style: s.slug, icon: ic })).join("")}</div>`).join("") : "";
        const comps = (meta.compositions || []).map((c) => `<h3 class="mb-1 text-sm font-semibold text-gray-900">${esc(c.name)}</h3><p class="mb-3 text-xs text-gray-500">${esc(c.description)}</p><div class="mb-5">${c.html}</div>`).join("");
        const sections = [["Styles and sizes", `${S.length} styles in ${sz.length} sizes`, rows], ["States", "Hover, focus, active, disabled and loading", states], ["With an icon", "On either side, or alone", icons], ["Made of buttons", "", comps]].filter((x) => x[2]);
        $("sections").innerHTML = sections.map(([t, d, b], i) => `<section><h2 class="text-xl font-semibold text-gray-900">${t}</h2>${d ? `<p class="mb-3 text-sm text-gray-500">${d}</p>` : ""}<iframe data-sec="${i}" title="${t}" class="w-full rounded-xl border border-gray-200" style="height:200px"></iframe></section>`).join("");
        $("sections").querySelectorAll("[data-sec]").forEach((f) => show(f, sections[Number(f.dataset.sec)][2], theme, dark, true, 20));
    }
    function draw() { drawMain(); drawSections(); }
    drawPickers();
    draw();
    drawAdd();
}
