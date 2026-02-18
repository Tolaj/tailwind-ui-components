// Category page specific functionality
// This file works alongside home.js and uses the existing createElementFromDescription function

(function () {
    'use strict';

    // ─── Icons ───────────────────────────────────────────────────────────────

    const mobileIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>`;
    const desktopIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" /></svg>`;
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
            componentStates[id] = { isMobile: false, isDark: false };
        }
        return componentStates[id];
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    function renderComponent(componentId, elementsDescription) {
        const previewInner = document.getElementById(`preview-inner-${componentId}`);
        if (!previewInner || !elementsDescription) return;

        previewInner.innerHTML = '';

        if (typeof createElementFromDescription === 'function') {
            elementsDescription.forEach(description => {
                const element = createElementFromDescription(description, false);
                previewInner.appendChild(element);
            });
            setTimeout(() => fixComponentPositioning(componentId), 50);
        } else {
            console.error('createElementFromDescription is not defined. Make sure home.js is loaded first.');
        }
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

    function buildIframeHTML(html, isDark) {
        const darkStyle = isDark
            ? `<style>${getDarkCSS('body')}</style>`
            : '';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=390, initial-scale=1.0">
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

    // ─── View Size Toggle (Desktop default) ───────────────────────────────────

    window.toggleViewSize = function (id) {
        const preview = document.getElementById(`preview-${id}`);
        const btn = document.getElementById(`size-btn-${id}`);
        if (!preview || !btn) return;

        const state = getState(id);
        state.isMobile = !state.isMobile;

        if (state.isMobile) {
            const inner = document.getElementById(`preview-inner-${id}`);
            const html = inner ? inner.innerHTML : '';

            const iframe = document.createElement('iframe');
            iframe.id = `preview-iframe-${id}`;
            iframe.style.cssText = `
    width: 100%;
    height: 600px;
    border: none;
    display: block;
    border-radius: 34px;
    background: white;
    overflow: hidden;
`;

            // Reset preview container — no dark bg, just white wrapper
            // Phone frame wrapper
            const phoneFrame = document.createElement('div');
            phoneFrame.style.cssText = `
    width: 390px;
    background: #1a1a1a;
    border-radius: 44px;
    padding: 10px;
    margin: 16px auto;
    box-shadow: 0 0 0 1px #333, 0 20px 60px rgba(0,0,0,0.4);
`;
            // Notch
            const notch = document.createElement('div');
            notch.style.cssText = `
    width: 80px;
    height: 20px;
    background: #1a1a1a;
    border-radius: 0 0 14px 14px;
    margin: 0 auto 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
`;
            notch.innerHTML = `
    <div style="width:7px;height:7px;background:#333;border-radius:50%;"></div>
    <div style="width:32px;height:5px;background:#333;border-radius:4px;"></div>
`;


            // Home bar
            const homeBar = document.createElement('div');
            homeBar.style.cssText = `
    width: 80px;
    height: 4px;
    background: #444;
    border-radius: 4px;
    margin: 6px auto 0;
`;

            phoneFrame.appendChild(notch);
            phoneFrame.appendChild(iframe);
            phoneFrame.appendChild(homeBar);

            preview.classList.remove('bg-gray-900', 'text-white');
            preview.classList.add('bg-gray-100');
            preview.style.overflow = 'visible';
            preview.innerHTML = '';
            preview.appendChild(phoneFrame);

            // Write iframe HTML with dark styles baked in if dark mode active
            iframe.contentDocument.open();
            iframe.contentDocument.write(buildIframeHTML(html, state.isDark));
            iframe.contentDocument.close();

            btn.innerHTML = desktopIcon;
            btn.title = 'Switch to desktop view';

        } else {
            // Restore desktop preview div
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

            // Re-render component
            const componentEl = document.querySelector(`[data-component-id="${id}"]`);
            if (componentEl) {
                try {
                    const elementsDescription = JSON.parse(componentEl.dataset.elements);
                    renderComponent(id, elementsDescription);
                } catch (e) { }
            }

            btn.innerHTML = mobileIcon;
            btn.title = 'Switch to mobile view';
        }
    };

    // ─── Theme Toggle (Light default) ─────────────────────────────────────────

    window.toggleTheme = function (id) {
        const preview = document.getElementById(`preview-${id}`);
        const btn = document.getElementById(`theme-btn-${id}`);
        if (!preview || !btn) return;

        const state = getState(id);
        state.isDark = !state.isDark;

        if (state.isMobile) {
            // In mobile mode: rebuild iframe with dark/light styles baked in
            const iframe = document.getElementById(`preview-iframe-${id}`);
            if (iframe) {
                const html = iframe.contentDocument.body
                    ? iframe.contentDocument.body.innerHTML
                    : '';

                // Keep preview bg always white in mobile mode (iframe handles its own bg)
                preview.classList.remove('bg-gray-900');
                preview.classList.add('bg-white');

                iframe.contentDocument.open();
                iframe.contentDocument.write(buildIframeHTML(html, state.isDark));
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
        document.querySelectorAll('[data-component-id]').forEach(component => {
            const componentId = component.dataset.componentId;
            const elementsData = component.dataset.elements;

            if (elementsData) {
                try {
                    renderComponent(componentId, JSON.parse(elementsData));
                } catch (error) {
                    console.error(`Error parsing elements for component ${componentId}:`, error);
                }
            }
        });
    });

})();