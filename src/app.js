import express from "express";
import configRoutes from "./routes/index.js";
import handlebars from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import { requestLogger } from "./middlewares/requestLogger.js";
import { sessionConfig } from "./middlewares/sessionConfig.js";
import { setSessionLocals } from "./middlewares/auth.js";
import lastSeenMiddleware from "./middlewares/lastSeen.js";
import connectDB from "./config/mongoConnection.js";

import { formatDate, substring } from './utils/handlebars-helpers.js';

const app = express();

// Behind a proxy (Vercel, Render, nginx) req.protocol must come from X-Forwarded-Proto so URLs and cookies are https.
app.set("trust proxy", 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middlewares
app.use("/public", express.static(path.join(__dirname, "public")));
// @windcraft/core as the browser sees it (the layouts map the package name to this path with an import map)
app.use("/editor", express.static(path.join(__dirname, "..", "packages", "editor"), { index: false }));
app.use("/core", express.static(path.join(__dirname, "..", "packages", "core"), { index: false }));
// Every request waits for MongoDB (cached after the first), so a cold start never races the connection.
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        const body = { error: "database_unavailable", message: "The database is not reachable right now. Try again in a moment." };
        if (req.path.startsWith("/mcp")) return res.status(503).set("Retry-After", "5").json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: body.message } });
        res.status(503).set("Retry-After", "5").json(body);
    }
});

// the Figma plugin sends whole designs (up to 5 MB, gzipped on the wire): read those bodies with a bigger limit before the general parser
app.use(["/api/figma/send", "/api/figma/draft", "/api/figma/sample"], express.json({ limit: "12mb" }));
app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sessionConfig);

// handlebars setup
app.use(setSessionLocals);
app.use(lastSeenMiddleware);
app.use(requestLogger);
app.engine(
    "handlebars",
    handlebars.engine({
        defaultLayout: "main",
        helpers: {
            eq: (a, b) => a === b,
            notEq: (a, b) => a !== b,
            eqStr: (a, b) => String(a) === String(b),
            or: (a, b) => a || b,
            and: (a, b) => a && b,
            not: (a) => !a,
            lt: (a, b) => a < b,
            gt: (a, b) => a > b,
            minus: (a, b) => a - b,
            any: (v, ...opts) => opts.slice(0, -1).includes(v), // {{#if (any activePage "home" "category")}}: is the value one of these
            json: (obj) => JSON.stringify(obj),
            formatDate: formatDate,
            substring: substring
        },
        partialsDir: [path.join(__dirname, "views/partials/")]
    })
);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

configRoutes(app);

// Machine clients (MCP and OAuth) must get JSON errors, not an HTML error page.
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    if (req.path.startsWith("/mcp")) {
        return res.status(status).json({ jsonrpc: "2.0", id: null, error: { code: status === 400 ? -32700 : -32603, message: status === 400 ? "Parse error: send valid JSON" : "Internal error" } });
    }
    if (req.path.startsWith("/oauth")) {
        return res.status(status).json({ error: status === 400 ? "invalid_request" : "server_error", error_description: err.message });
    }
    // A page the browser asked for with fetch (the editor, the Figma plugin) must get a message it can show, not an HTML error page it
    // cannot read. The reason is short and has no addresses in it.
    if (req.method !== "GET" && (req.path.startsWith("/api/") || /json/.test(req.get("content-type") || ""))) {
        console.error("Request failed:", req.method, req.originalUrl, err);
        const reason = String((err && err.message) || err).replace(/mongodb(\+srv)?:\/\/\S+/gi, "[database]").replace(/\b\d{1,3}(\.\d{1,3}){3}(:\d+)?\b/g, "[address]").slice(0, 140);
        return res.status(status).json({ success: false, ok: false, message: `Server error (${(err && err.name) || "Error"}): ${reason}` });
    }
    return next(err);
});


export default app;
