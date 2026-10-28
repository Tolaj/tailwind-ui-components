// The editor's page: toolbars, panels, the canvas and the dialogs. mountEditor() puts it in the page; the editor's code finds its parts by id.
export const editorHtml = `<div class="flex h-full flex-col">

    <div class="flex min-h-0 flex-1">
                <aside id="leftPanel" class="hidden w-[240px] shrink-0 flex-col border-r border-neutral-200 bg-white">
            <div id="leftHead" class="flex items-center border-b border-neutral-200 px-2 py-2"></div>
            <div id="leftBody" class="min-h-0 flex-1 overflow-auto pb-2">
                <div id="pagesHead" class="sec2"><span>Pages</span><button id="pagesAdd" type="button" title="New page"
                        class="flex h-5 w-5 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100"><svg
                            class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg></button></div>
                <div id="pagesList" class="px-1"></div>
                <div class="mx-2 my-2 h-px bg-neutral-200"></div>
                <div id="layersHead" class="sec2"><span>Layers</span></div>
                <div id="layersHost" class="px-1">
                    <div id="layers" class="text-[12px]"></div>
                </div>
            </div>
        </aside>

        <section class="relative flex min-w-0 flex-1 flex-col">
                        <div id="pillL" class="pill absolute left-3 top-3 z-50 flex items-center gap-0.5 p-1"
                style="max-width:calc(100% - 24px)">
                                <div id="navGroup" class="flex min-w-0 items-center gap-0.5">
                    <a id="backLink" href="#" title="Back" class="tbtn"><svg
                            class="mx-auto h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m15 5-7 7 7 7" />
                        </svg></a><span id="backLabel" class="hidden">Back</span>
                    <span class="mx-0.5 h-5 w-px bg-neutral-200"></span>
                    <a id="leftProject" href="#" class="dtl" title="Open the project board"></a>
                    <button id="leftBtn" type="button" title="Layers" class="tbtn"><svg
                            class="mx-auto h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="16" rx="2" />
                            <path d="M10 4v16" />
                        </svg></button>
                    <span class="mx-0.5 h-5 w-px bg-neutral-200"></span>
                    <div class="relative min-w-0 shrink">
                        <button id="navMoreBtn" type="button" title="Page details and project" class="tbtn"><svg
                                class="mx-auto h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="5.5" cy="12" r="1.6" />
                                <circle cx="12" cy="12" r="1.6" />
                                <circle cx="18.5" cy="12" r="1.6" />
                            </svg></button>
                        <button id="designsBtn" type="button"
                            class="flex h-8 min-w-0 max-w-[220px] shrink items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-neutral-800 hover:bg-neutral-100"
                            title="Pages">
                            <span id="designsCount"
                                class="rounded-full bg-neutral-100 px-1.5 text-[11px] text-neutral-600">1</span>
                            <span id="designsName" class="truncate">Design</span>
                            <svg class="h-3.5 w-3.5 shrink-0 text-neutral-500" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
                            </svg>
                        </button>
                        <div id="designsMenu" class="pop absolute left-0 top-10 z-40 hidden w-64 p-1">
                            <div id="designs" class="max-h-72 overflow-auto text-[12px]"></div>
                            <button id="newDesignBtn" type="button"
                                class="mt-1 flex h-8 w-full items-center gap-2 rounded-lg border-t border-neutral-100 px-2 text-left text-[12px] font-medium text-neutral-700 hover:bg-neutral-100">+
                                New page</button>
                            <div class="mt-1 border-t border-neutral-100 pt-1">
                                <button id="detailsBtn" type="button" title="Name, category, tags and visibility"
                                    class="hidden h-8 w-full items-center justify-between rounded-lg px-2 text-left text-[12px] font-medium text-neutral-700 hover:bg-neutral-100"><span>Page
                                        details…</span><span id="versionBadge"
                                        class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600"></span></button>
                                <span id="titleText" class="hidden"></span><span id="projSep" class="hidden"></span>
                                <a id="projLink" href="#"
                                    class="hidden h-8 w-full items-center justify-between rounded-lg px-2 text-left text-[12px] font-medium text-neutral-700 hover:bg-neutral-100"
                                    title="Open the project board"></a>
                            </div>
                        </div>
                    </div>
                </div>
                <span id="navSep" class="mx-0.5 h-5 w-px bg-neutral-200"></span>
                <div id="toolbar" class="flex shrink-0 items-center gap-0.5"></div>
                <span class="mx-0.5 h-5 w-px bg-neutral-200"></span>
                <div class="relative">
                    <button id="addBtn" type="button" title="Insert a block" class="tbtn"><svg
                            class="mx-auto h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg></button>
                    <div id="addMenu" class="pop absolute left-0 top-10 z-40 hidden w-48 p-1"></div>
                </div>
            </div>
            <div id="pillR" class="pill absolute right-3 top-3 z-40 flex items-center gap-0.5 p-1">
                <button id="undoBtn" type="button" title="Undo (Ctrl/Cmd+Z)" class="tbtn disabled:opacity-30"><svg
                        class="mx-auto h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                    </svg></button>
                <button id="redoBtn" type="button" title="Redo (Ctrl/Cmd+Shift+Z)" class="tbtn disabled:opacity-30"><svg
                        class="mx-auto h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
                    </svg></button>
                <span class="mx-0.5 h-5 w-px bg-neutral-200"></span>
                <button id="codeBtn" type="button" title="View and edit the HTML" class="tbtn"><svg
                        class="mx-auto h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
                    </svg></button>
<button id="playBtn" type="button" title="Preview: run it with its JavaScript" class="tbtn"><svg
                        class="mx-auto h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M7 5v14l12-7z" />
                    </svg></button>
                <button id="panelBtn" type="button" title="Properties and layers" class="tbtn"><svg
                        class="mx-auto h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <path d="M14 4v16" />
                    </svg></button>
                <span class="mx-0.5 h-5 w-px bg-neutral-200"></span>
                <button id="saveBtn" type="button"
                    class="ml-0.5 h-8 min-w-[64px] rounded-lg bg-[#111] px-3 text-[13px] font-semibold text-white hover:bg-black disabled:bg-transparent disabled:text-neutral-400 disabled:hover:bg-transparent">Save</button>
                <button id="figmaBtn" type="button"
                    class="ml-1 hidden h-8 rounded-lg border border-neutral-200 px-3 text-[13px] font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
                    title="Convert this design again from the Figma data kept with it">Update from Figma</button>
                <button id="gridBtn" type="button"
                    class="ml-1 hidden h-8 rounded-lg border border-neutral-200 px-3 text-[13px] font-medium text-neutral-800 hover:bg-neutral-100"
                    title="Show the layout grid this design has in Figma">Grid</button>
                <span id="saveState" class="hidden"></span>
                <select id="zoomSel"
                    class="h-8 rounded-lg border-0 bg-transparent pl-1 pr-0 text-[13px] font-medium text-neutral-800 hover:bg-neutral-100 focus:outline-none"
                    title="Zoom (Shift+1 fit all, Shift+2 fit this design)">
                    <option value="fit">Fit all</option>
                    <option value="frame">Fit</option>
                    <option value="16">1600%</option>
                    <option value="8">800%</option>
                    <option value="4">400%</option>
                    <option value="2">200%</option>
                    <option value="1">100%</option>
                    <option value="0.75">75%</option>
                    <option value="0.5">50%</option>
                    <option value="0.25">25%</option>
                </select>
            </div>

            <main id="canvas" class="relative min-h-0 flex-1 overflow-hidden" style="touch-action:none">
                <div id="boot" role="status" aria-live="polite" class="absolute inset-0 z-[40] hidden flex-col items-center justify-center gap-3 bg-neutral-100 text-[13px] text-neutral-500">
                    <span class="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800"></span>
                    <span>Opening your design…</span>
                </div>
                <div id="plane" class="absolute left-0 top-0" style="transform-origin:0 0">
                    <div id="frames"></div>
                    <iframe id="frame" aria-label="Design canvas" sandbox="allow-scripts" class="block bg-white"
                        style="border:0;position:absolute;left:0;top:0"></iframe>
                    <div id="pgrid" class="pointer-events-none absolute hidden"></div>
                </div>
                                <div id="lines" class="pointer-events-none absolute inset-0 z-[14] overflow-hidden"></div>
                <div id="sel" class="pointer-events-none absolute inset-0 z-[15] overflow-hidden"></div>
                <div id="slbl" class="pointer-events-none absolute inset-0 z-[17] overflow-hidden"></div>
                <div id="fsel" class="pointer-events-none absolute inset-0 z-[16] overflow-hidden"></div>
                <div id="marquee" class="pointer-events-none absolute z-20"
                    style="display:none;border:1px solid #111;background:rgba(0,0,0,.06)"></div>
                <div id="panShield" class="absolute inset-0 z-20 hidden" style="cursor:grab"></div>
                <div id="ftb" class="pill absolute z-30 hidden items-center gap-0.5 p-1"></div>
                <p id="canvasHint"
                    class="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-[11px] text-neutral-500 shadow-[0_1px_4px_rgba(0,0,0,.12)]">
                    Click to select. Double-click text to edit it. Alt-drag to place freely. Scroll to pan, Ctrl/Cmd + scroll to zoom.</p>

            </main>

                        <div id="codePanel" class="relative hidden shrink-0 flex-col overflow-hidden border-t border-neutral-200 bg-white" style="height: 256px">
                                <div id="codeResize" title="Drag to resize" class="absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize"></div>
                <div
                    class="flex h-8 shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap border-b border-neutral-200 bg-neutral-50 px-3 text-[11px]">
                    <span class="shrink-0 font-semibold uppercase tracking-wide text-neutral-500">Code</span>
                    <span id="codeLines" class="min-w-0 truncate text-neutral-400"></span>
                    <button id="codeWarn" type="button" class="hidden min-w-0 truncate rounded px-1.5 py-0.5 text-left text-amber-700 hover:bg-amber-50" title="Go to the line"></button>
                    <span class="ml-auto flex shrink-0 items-center gap-1">
                        <button id="codeDock" type="button" class="flex h-6 w-6 items-center justify-center rounded text-neutral-600 hover:bg-neutral-200"></button>
                        <button id="codeFind" type="button" title="Find and replace (Ctrl/Cmd+F)" class="rounded px-2 py-0.5 text-neutral-600 hover:bg-neutral-200">Find</button>
                        <button id="codeFormat" type="button" title="Tidy the indentation (one undo step)" class="rounded px-2 py-0.5 text-neutral-600 hover:bg-neutral-200">Format</button>
                        <button id="codeCopy" type="button" title="Copy all the code" class="rounded px-2 py-0.5 text-neutral-600 hover:bg-neutral-200">Copy</button>
                        <button id="codeClose" type="button" title="Close the code" aria-label="Close the code"
                            class="flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200"><svg class="h-4 w-4"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                                <path d="M6 6l12 12M18 6 6 18" />
                            </svg></button>
                    </span>
                </div>
                                <div id="codeMount" class="min-h-0 min-w-0 flex-1 overflow-hidden bg-white"></div>
            </div>
        </section>

                <aside id="panel" class="hidden w-[240px] shrink-0 flex-col border-l border-neutral-200 bg-white">
            <div id="panelHead" class="hidden items-center gap-1 border-b border-neutral-200 px-2 py-1.5">
                <div id="panelTabs" class="flex gap-0.5">
                    <button type="button" data-ptab="props" class="ptab is-on">Properties</button>
                </div>
                <button id="panelClose" type="button" title="Close"
                    class="ml-auto flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"
                        stroke-linecap="round">
                        <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                </button>
            </div>
            <div id="inspector" class="min-h-0 flex-1 overflow-auto"></div>
        </aside>
    </div>
</div>

<dialog id="detailsDlg"
    class="m-auto w-[min(520px,92vw)] rounded-xl border border-neutral-200 p-0 shadow-[0_16px_48px_rgba(0,0,0,.2)] backdrop:bg-black/40">
    <form id="detailsForm" method="dialog">
        <div class="border-b border-neutral-200 px-5 py-3">
            <h3 id="detailsTitle" class="text-sm font-semibold text-neutral-900">Component details</h3>
        </div>
        <div class="space-y-4 p-5">
            <div><label class="mb-1 block text-xs font-medium text-neutral-700" for="dTitle">Title</label><input
                    id="dTitle" class="field" style="height:36px" placeholder="Gradient hero section" required></div>
            <div><label class="mb-1 block text-xs font-medium text-neutral-700" for="dCategory">Category</label>
                <select id="dCategory" class="field" style="height:36px" required>
                    <option value="" disabled selected>Select a category</option>
                </select>
            </div>
            <div><label class="mb-1 block text-xs font-medium text-neutral-700" for="dDesc">Description</label><textarea
                    id="dDesc" rows="3" class="field" style="font-family:inherit"
                    placeholder="What it is and when to use it" required></textarea></div>
            <div><label class="mb-1 block text-xs font-medium text-neutral-700" for="dTags">Tags</label><input
                    id="dTags" class="field" style="height:36px" placeholder="hero, dark, saas (comma separated)">
                <p class="mt-1 text-[11px] text-neutral-500">Tags help you, AI and coding agents find it.</p>
            </div>
            <div><label class="mb-1 block text-xs font-medium text-neutral-700" for="dProject">Project</label>
                <select id="dProject" class="field" style="height:36px" required></select>
            </div>
            <div><label class="mb-1 block text-xs font-medium text-neutral-700" for="dVis">Visibility</label>
                <select id="dVis" class="field" style="height:36px">
                    <option value="true">Public gallery and my library</option>
                    <option value="false">My library only (private)</option>
                </select>
            </div>
            <p id="detailsError" class="hidden text-xs text-red-700"></p>
        </div>
        <div class="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3">
            <button type="button" id="detailsCancel"
                class="h-9 rounded-md border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-50">Cancel</button>
            <button type="submit" id="detailsSave"
                class="h-9 rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">Save</button>
        </div>
    </form>
</dialog>
`;
