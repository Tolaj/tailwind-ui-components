// Category page specific functionality
// This file works alongside home.js and uses the existing createElementFromDescription function

(function () {
    'use strict';

    // Render component from elementsDescription
    // Uses the global createElementFromDescription from home.js
    function renderComponent(componentId, elementsDescription) {
        const previewInner = document.getElementById(`preview-inner-${componentId}`);
        if (!previewInner || !elementsDescription) return;

        // Clear existing content
        previewInner.innerHTML = '';

        // Render each element from description
        // Use the global function from home.js
        if (typeof createElementFromDescription === 'function') {
            elementsDescription.forEach(description => {
                const element = createElementFromDescription(description, false);
                previewInner.appendChild(element);
            });

            // Fix positioning issues after render
            setTimeout(() => {
                fixComponentPositioning(componentId);
            }, 50);
        } else {
            console.error('createElementFromDescription is not defined. Make sure home.js is loaded first.');
        }
    }

    // Fix positioning issues in rendered components
    function fixComponentPositioning(componentId) {
        const previewInner = document.getElementById(`preview-inner-${componentId}`);
        const preview = document.getElementById(`preview-${componentId}`);
        if (!previewInner) return;

        // Make preview container a positioning context
        if (preview) {
            preview.style.position = 'relative';
            preview.style.overflow = 'hidden';
        }

        // Make inner container a positioning context
        previewInner.style.position = 'relative';

        // Find and fix elements with problematic positioning
        const allElements = previewInner.querySelectorAll('*');

        allElements.forEach(el => {
            const computedStyle = window.getComputedStyle(el);
            const position = computedStyle.position;

            // Convert fixed to absolute
            if (position === 'fixed' || el.classList.contains('fixed')) {
                el.style.position = 'absolute';

                // Remove Tailwind fixed classes
                el.classList.forEach(cls => {
                    if (cls.includes('fixed')) {
                        el.classList.remove(cls);
                    }
                });
            }

            // Convert sticky to relative
            if (position === 'sticky' || el.classList.contains('sticky')) {
                el.style.position = 'relative';
                el.style.top = 'auto';

                // Remove Tailwind sticky classes
                el.classList.forEach(cls => {
                    if (cls.includes('sticky')) {
                        el.classList.remove(cls);
                    }
                });
            }

            // Cap z-index to prevent overlapping platform UI
            const zIndex = parseInt(computedStyle.zIndex);
            if (zIndex > 50) {
                el.style.zIndex = '10';
            }
        });
    }

    // Make functions globally available for onclick handlers
    window.toggleTab = function (id, tab) {
        const preview = document.getElementById(`preview-${id}`);
        const code = document.getElementById(`code-${id}`);
        const previewBtn = document.getElementById(`preview-btn-${id}`);
        const codeBtn = document.getElementById(`code-btn-${id}`);

        if (tab === "preview") {
            preview.classList.remove("hidden");
            code.classList.add("hidden");
            previewBtn.classList.add("bg-white", "shadow", "text-gray-900");
            codeBtn.classList.remove("bg-white", "shadow", "text-gray-900");
        } else {
            preview.classList.add("hidden");
            code.classList.remove("hidden");
            codeBtn.classList.add("bg-white", "shadow", "text-gray-900");
            previewBtn.classList.remove("bg-white", "shadow", "text-gray-900");
        }
    };

    // Copy code to clipboard
    window.copyCode = function (id) {
        const code = document.getElementById(`code-content-${id}`).innerText;
        navigator.clipboard.writeText(code).then(() => {
            // Visual feedback
            const btn = event.target.closest('button');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            `;
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code:', err);
        });
    };

    // Set theme (light/dark)
    window.setTheme = function (id, theme) {
        const preview = document.getElementById(`preview-${id}`);
        if (!preview) return;

        if (theme === "dark") {
            preview.classList.remove("bg-white");
            preview.classList.add("bg-gray-900", "text-white");
        } else {
            preview.classList.remove("bg-gray-900", "text-white");
            preview.classList.add("bg-white");
        }
    };

    // Toggle width between full and centered
    window.toggleWidth = function (id) {
        const inner = document.getElementById(`preview-inner-${id}`);
        if (!inner) return;

        inner.classList.toggle("max-w-md");
        inner.classList.toggle("mx-auto");
    };

    // Toggle between mobile and desktop view
    window.toggleViewSize = function (id) {
        const inner = document.getElementById(`preview-inner-${id}`);
        if (!inner) return;

        const checkbox = document.getElementById(`view-toggle-${id}`);
        const isMobile = inner.classList.contains("max-w-md");

        if (isMobile) {
            // Switch to desktop view
            inner.classList.remove("max-w-md", "mx-auto");
            inner.classList.add("w-full");
            if (checkbox) checkbox.checked = true;
        } else {
            // Switch to mobile view
            inner.classList.remove("w-full");
            inner.classList.add("max-w-md", "mx-auto");
            if (checkbox) checkbox.checked = false;
        }
    };

    // Toggle fullscreen mode
    window.toggleComponentFullscreen = function (id) {
        const preview = document.getElementById(`preview-${id}`);
        if (!preview) return;

        if (!document.fullscreenElement) {
            preview.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Initialize all components on page load
    document.addEventListener('DOMContentLoaded', () => {
        // Find all components with data-elements attribute
        const components = document.querySelectorAll('[data-component-id]');

        components.forEach(component => {
            const componentId = component.dataset.componentId;
            const elementsData = component.dataset.elements;

            if (elementsData) {
                try {
                    const elementsDescription = JSON.parse(elementsData);
                    renderComponent(componentId, elementsDescription);
                } catch (error) {
                    console.error(`Error parsing elements for component ${componentId}:`, error);
                    // Fallback: keep the HTML that was already rendered
                }
            }
        });
    });

})();