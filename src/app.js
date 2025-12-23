import express from "express";
import configRoutes from "./routes/index.js";
import handlebars from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";

import { requestLogger } from "./middlewares/requestLogger.js";
import { sessionConfig } from "./middlewares/sessionConfig.js";
import { setSessionLocals } from "./middlewares/auth.js";
import lastSeenMiddleware from "./middlewares/lastSeen.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middlewares
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionConfig);
app.use(lastSeenMiddleware);

// handlebars setup
app.use(setSessionLocals);
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
        },
        partialsDir: [path.join(__dirname, "views/partials/")]
    })
);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

configRoutes(app);


export default app;
