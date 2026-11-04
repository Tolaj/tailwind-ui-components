// Category page specific functionality
// Previews are drawn from each component's own code (the Code panel holds it), read by the browser

import { DEVICES, buildDeviceFrame } from '@windcraft/editor/design/device-frame.js';

(function () {
    'use strict';

    // ─── Icons ───────────────────────────────────────────────────────────────

    const sunIcon = `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" /></svg>`;
    const moonIcon = `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>`;

    // ─── Dark mode CSS string (reused for both page injection and iframe) ─────

    function getDarkCSS(selector) {
        return `
            ${selector} {
                background-color: #111827 !important;
                color: #f9fafb !important;
            }
            ${selector} *:not(svg):not(path):not(circle):not(img) {
                background-color: inherit !important;
                color: inherit !important;
                border-color: #374151 !important;
            }
            ${selector} a { color: #93c5fd !important; }
            ${selector} button,
            ${selector} input,
            ${selector} select,
            ${selector} textarea {
                background-color: #1f2937 !important;
                color: #f9fafb !important;
                border-color: #374151 !important;
            }
            ${selector} [class*="bg-white"] { background-color: #1f2937 !important; }
            ${selector} [class*="bg-gray-50"],
            ${selector} [class*="bg-gray-100"] { background-color: #111827 !important; }
            ${selector} [class*="text-gray-900"],
            ${selector} [class*="text-gray-800"],
            ${selector} [class*="text-gray-700"] { color: #f9fafb !important; }
            ${selector} [class*="text-gray-500"],
            ${selector} [class*="text-gray-400"] { color: #9ca3af !important; }
            ${selector} [class*="border-gray-200"],
            ${selector} [class*="border-gray-300"] { border-color: #374151 !important; }
            ${selector} [class*="shadow"] { box-shadow: 0 1px 3px rgba(0,0,0,0.5) !important; }
        `;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    const componentStates = {};

    function getState(id) {
        if (!componentStates[id]) {
            componentStates[id] = { device: 'desktop', isDark: false };
        }
        return componentStates[id];
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    /** Draws a component from its code: its styles and markup (scripts are left out, as before). */
    function renderComponent(componentId) {
        const previewInner = document.getElementById(`preview-inner-${componentId}`);
        const code = document.getElementById(`code-content-${componentId}`);
        if (!previewInner || !code) return;
        const doc = new DOMParser().parseFromString(code.textContent, "text/html");
        doc.querySelectorAll("script").forEach((s) => s.remove());
        previewInner.replaceChildren(...doc.head.querySelectorAll("style"), ...doc.body.childNodes);
        setTimeout(() => fixComponentPositioning(componentId), 50);
    }

    function fixComponentPositioning(componentId) {
        const previewInner = document.getElementById(`preview-inner-${componentId}`);
        const preview = document.getElementById(`preview-${componentId}`);
        if (!previewInner) return;

        if (preview) {
            preview.style.position = 'relative';
            preview.style.overflow = 'hidden';
        }

        previewInner.style.position = 'relative';

        previewInner.querySelectorAll('*').forEach(el => {
            const computedStyle = window.getComputedStyle(el);
            const position = computedStyle.position;

            if (position === 'fixed' || el.classList.contains('fixed')) {
                el.style.position = 'absolute';
                el.classList.forEach(cls => { if (cls.includes('fixed')) el.classList.remove(cls); });
            }

            if (position === 'sticky' || el.classList.contains('sticky')) {
                el.style.position = 'relative';
                el.style.top = 'auto';
                el.classList.forEach(cls => { if (cls.includes('sticky')) el.classList.remove(cls); });
            }

            const zIndex = parseInt(computedStyle.zIndex);
            if (zIndex > 50) el.style.zIndex = '10';
        });
    }

    // ─── Build iframe HTML (with optional dark mode baked in) ─────────────────

    function buildIframeHTML(html, isDark, width = 390) {
        const darkStyle = isDark
            ? `<style>${getDarkCSS('body')}</style>`
            : '';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=${width}, initial-scale=1.0">
                <script src="https://cdn.tailwindcss.com"><\/script>
                <style>body { margin: 0; padding: 0; ${isDark ? 'background:#111827; color:#f9fafb;' : ''} }<\/style>                
                ${darkStyle}
            </head>
            <body>${html}</body>
            </html>
        `;
    }

    // ─── Preview / Code Tab ───────────────────────────────────────────────────

    window.toggleTab = function (id, tab) {
        const preview = document.getElementById(`preview-${id}`);
        const code = document.getElementById(`code-${id}`);
        const previewBtn = document.getElementById(`preview-btn-${id}`);
        const codeBtn = document.getElementById(`code-btn-${id}`);

        if (tab === 'preview') {
            preview.classList.remove('hidden');
            code.classList.add('hidden');
            previewBtn.classList.add('bg-white', 'shadow', 'text-gray-900');
            previewBtn.classList.remove('text-gray-600');
            codeBtn.classList.remove('bg-white', 'shadow', 'text-gray-900');
            codeBtn.classList.add('text-gray-600');
        } else {
            preview.classList.add('hidden');
            code.classList.remove('hidden');
            codeBtn.classList.add('bg-white', 'shadow', 'text-gray-900');
            codeBtn.classList.remove('text-gray-600');
            previewBtn.classList.remove('bg-white', 'shadow', 'text-gray-900');
            previewBtn.classList.add('text-gray-600');
        }
    };

    // ─── Device: Desktop (default), Tablet or Mobile ──────────────────────────
    // Tablet and Mobile show the component in a device frame at the device's real screen size (device-frame.js, as in the prototype).

    const DEVICES_OK = { desktop: true, tablet: true, mobile: true };

    // the device options are a Preview / Code-style pill; the three dots at the end hold Save and Open in editor
    window.closeMoreMenus = () => document.querySelectorAll('[id^="more-menu-"]').forEach((m) => m.classList.add('hidden'));
    window.toggleMoreMenu = function (id) {
        const menu = document.getElementById(`more-menu-${id}`);
        if (!menu) return;
        const open = menu.classList.contains('hidden');
        window.closeMoreMenus();
        menu.classList.toggle('hidden', !open);
    };
    document.addEventListener('click', (e) => { if (!e.target.closest('[id^="more-menu-"]') && !e.target.closest('[id^="more-btn-"]')) window.closeMoreMenus(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.closeMoreMenus(); });

    window.addEventListener('resize', () => Object.values(componentStates).forEach((st) => st.fit && st.fit()));

    window.setViewDevice = function (id, device) {
        const preview = document.getElementById(`preview-${id}`);
        if (!preview || !DEVICES_OK[device]) return;

        const state = getState(id);
        if (state.device === device) return;
        const was = state.device;
        state.device = device;

        if (device !== 'desktop') {
            // the component's markup: from the desktop preview the first time, kept for switching between devices
            if (was === 'desktop') {
                const inner = document.getElementById(`preview-inner-${id}`);
                state.html = inner ? inner.innerHTML : '';
            }
            const html = state.html || '';

            const frame = buildDeviceFrame(device, 1, { shadow: '0 8px 24px rgba(0,0,0,0.22)' }); // a light shadow: it stays inside the card
            const iframe = document.createElement('iframe');
            iframe.id = `preview-iframe-${id}`;
            iframe.style.cssText = frame.parts.frame;
            frame.screen.appendChild(iframe);

            // the whole device is scaled down to the card's width and to the screen's height (a phone is 872 pixels high: it must not
            // stretch the page); the card keeps its own background and clips anything that would spill out of it
            preview.classList.remove('bg-gray-900', 'text-white', 'bg-white');
            preview.classList.add('bg-gray-100');
            preview.style.background = '';
            preview.style.overflow = 'hidden';
            preview.innerHTML = '';
            preview.appendChild(frame.root);
            const fit = () => {
                const maxH = Math.max(480, Math.min(window.innerHeight - 140, 780));
                const k = Math.min(1, (preview.clientWidth - 32) / frame.parts.w, maxH / frame.parts.h);
                frame.root.style.width = `${frame.parts.w * k}px`;
                frame.root.style.height = `${frame.parts.h * k}px`;
                frame.root.firstElementChild.style.transform = `scale(${k})`;
            };
            state.fit = fit;
            fit();

            // the page inside is built at the device's width, so its own responsive styles apply; dark styles baked in when dark mode is on
            iframe.contentDocument.open();
            iframe.contentDocument.write(buildIframeHTML(html, state.isDark, frame.dev.w));
            iframe.contentDocument.close();
        } else {
            // Restore desktop preview div
            state.fit = null;
            preview.style.background = '';
            preview.classList.remove('bg-gray-900', 'text-white', 'bg-gray-100');
            preview.classList.add('bg-white');
            preview.style.overflow = 'hidden';
            preview.innerHTML = `<div id="preview-inner-${id}" class="w-full" style="position: relative; min-height: 200px; contain: layout style;"></div>`;

            // Restore dark bg if needed
            if (state.isDark) {
                preview.classList.remove('bg-white');
                preview.classList.add('bg-gray-900');
                injectDarkStyles(id);
            } else {
                preview.classList.add('bg-white');
            }

            renderComponent(id);
        }

        // the pill shows the current device, like Preview / Code
        document.querySelectorAll(`#device-pill-${id} [data-device]`).forEach((b) => {
            const on = b.dataset.device === device;
            b.setAttribute('aria-pressed', String(on));
            b.classList.toggle('bg-white', on);
            b.classList.toggle('shadow', on);
            b.classList.toggle('text-gray-900', on);
            b.classList.toggle('text-gray-600', !on);
        });
    };

    // ─── Theme Toggle (Light default) ─────────────────────────────────────────

    window.toggleTheme = function (id) {
        const preview = document.getElementById(`preview-${id}`);
        const btn = document.getElementById(`theme-btn-${id}`);
        if (!preview || !btn) return;

        const state = getState(id);
        state.isDark = !state.isDark;

        if (state.device !== 'desktop') {
            // In a device frame: rebuild iframe with dark/light styles baked in
            const iframe = document.getElementById(`preview-iframe-${id}`);
            if (iframe) {
                const html = iframe.contentDocument.body
                    ? iframe.contentDocument.body.innerHTML
                    : '';

                // Keep preview bg always white in mobile mode (iframe handles its own bg)
                preview.classList.remove('bg-gray-900');
                preview.classList.add('bg-white');

                iframe.contentDocument.open();
                iframe.contentDocument.write(buildIframeHTML(html, state.isDark, DEVICES[state.device].w));
                iframe.contentDocument.close();
            }
        } else {
            // Desktop mode: toggle bg and inject/remove scoped styles
            if (state.isDark) {
                preview.classList.remove('bg-white');
                preview.classList.add('bg-gray-900');
                injectDarkStyles(id);
            } else {
                preview.classList.remove('bg-gray-900');
                preview.classList.add('bg-white');
                const styleTag = document.getElementById(`dark-style-${id}`);
                if (styleTag) styleTag.remove();
            }
        }

        btn.innerHTML = state.isDark ? moonIcon : sunIcon;
        btn.title = state.isDark ? 'Switch to light mode' : 'Switch to dark mode';
    };

    function injectDarkStyles(id) {
        const existing = document.getElementById(`dark-style-${id}`);
        if (existing) existing.remove();

        const style = document.createElement('style');
        style.id = `dark-style-${id}`;
        style.textContent = getDarkCSS(`#preview-inner-${id}`);
        document.head.appendChild(style);
    }

    // ─── Copy Code ────────────────────────────────────────────────────────────

    window.copyCode = function (id) {
        const codeEl = document.getElementById(`code-content-${id}`);
        const btn = document.getElementById(`copy-btn-${id}`);
        if (!codeEl || !btn) return;

        navigator.clipboard.writeText(codeEl.innerText).then(() => {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
            btn.classList.add('text-green-500');
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('text-green-500');
            }, 2000);
        }).catch(err => console.error('Failed to copy:', err));
    };

    // ─── Fullscreen ───────────────────────────────────────────────────────────

    window.toggleComponentFullscreen = function (id) {
        const preview = document.getElementById(`preview-${id}`);
        if (!preview) return;

        if (!document.fullscreenElement) {
            preview.requestFullscreen().catch(err => {
                console.error(`Fullscreen error: ${err.message}`);
            });

            const inner = document.getElementById(`preview-inner-${id}`);
            if (inner) {
                inner.style.contain = 'none';
                inner.style.width = '100%';
            }

            preview.style.display = 'flex';
            preview.style.justifyContent = 'center';
            preview.style.overflow = 'auto';

            // Wait for fullscreen to activate then check content height
            setTimeout(() => {
                const contentHeight = inner ? inner.scrollHeight : 0;
                const screenHeight = window.screen.height;
                preview.style.alignItems = contentHeight < screenHeight ? 'center' : 'flex-start';
            }, 100);

            document.addEventListener('fullscreenchange', function onExit() {
                if (!document.fullscreenElement) {
                    if (inner) {
                        inner.style.contain = 'layout style';
                        inner.style.width = '';
                    }
                    preview.style.display = '';
                    preview.style.alignItems = '';
                    preview.style.justifyContent = '';
                    preview.style.overflow = 'hidden';

                    document.removeEventListener('fullscreenchange', onExit);
                }
            });

        } else {
            document.exitFullscreen();
        }
    };

    // ─── Init ─────────────────────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-component-id]').forEach((component) => renderComponent(component.dataset.componentId));
    });

})();