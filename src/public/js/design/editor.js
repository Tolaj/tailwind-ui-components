// The design editor: builds the page from its parts, in order (each part is in editor/).
import { mountDatalists } from "./panel-model.js";
import { pref, setLeft, setPanel, setPanelTab } from "./editor/color-ui.js";
import { setTool } from "./editor/toolbar.js";
import { buildWraps } from "./editor/designs.js";
import { loadFrame, updateChrome } from "./editor/docs.js";
import { renderInspector } from "./editor/inspector.js";
import { layout } from "./editor/plane.js";
import { init as init_frame_messages } from "./editor/frame-messages.js";
import { init as init_pages_panel } from "./editor/pages-panel.js";
import { init as init_inspector } from "./editor/inspector.js";
import { init as init_toolbar } from "./editor/toolbar.js";
import { init as init_code_panel } from "./editor/code-panel.js";
import { init as init_add_menu } from "./editor/add-menu.js";
import { init as init_designs } from "./editor/designs.js";
import { init as init_frame_handles } from "./editor/frame-handles.js";
import { init as init_color_ui } from "./editor/color-ui.js";

init_frame_messages();
init_pages_panel();
init_inspector();
init_toolbar();
init_code_panel();
init_add_menu();
init_designs();
init_frame_handles();
init_color_ui();

// ── Go ───────────────────────────────────────────────────────────────────────
mountDatalists();
setPanelTab("props");
setPanel(pref("wc:panel") === "1");
setLeft(pref("wc:left") === "1");
setTool("move", true); // start on the arrow, highlighted in the toolbar
buildWraps();
updateChrome();
renderInspector();
layout();
loadFrame();
