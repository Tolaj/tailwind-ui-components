// The design page's entry: gives the editor the app's host, then loads it (the editor reads the host as it starts).
import { setHost } from "./design/host.js";
import { appHost } from "./app-host.js";

setHost(appHost);
await import("./design/editor.js");
