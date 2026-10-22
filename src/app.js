import express from "express";
import configRoutes from "./routes/index.js";
import handlebars from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import { requestLogger } from "./middlewares/requestLogger.js";
import { sessionConfig } from "./middlewares/sessionConfig.js";
import { setSessionLocals } from "./middlewares/auth.js";
import lastSeenMiddleware from "./middlewares/lastSeen.js";

import { formatDate, substring } from './utils/handlebars-helpers.js';

const app = express();

// Behind a proxy (Vercel, Render, nginx) req.protocol must come from X-Forwarded-Proto so URLs and cookies are https.
app.set("trust proxy", 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middlewares
app.use("/public", express.static(path.join(__dirname, "public")));
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
    return next(err);
});


export default app;
