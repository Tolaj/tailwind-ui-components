import mongoose from "mongoose";
import usersRoutes from "./user.routes.js";
import authRoutes from "./auth.routes.js";
import componentRoutes from "./component.routes.js";
import homeRoutes from "./home.routes.js";
import aiRoutes from "./ai.routes.js";
import mcpRoutes from "./mcp.routes.js";
import figmaRoutes from "./figma.routes.js";
import fontsRoutes from "./fonts.routes.js";
import figmaPages from "./figma-pages.routes.js";
import infoRoutes from "./info.routes.js";
import connectRoutes from "./connect.routes.js";
import oauthRoutes from "./oauth.routes.js";
import designRoutes from "./design.routes.js";
import { projectPages, projectApi, sharePages } from "./project.routes.js";
import { adminPages, adminApi } from "./admin.routes.js";

import {
    redirectIfAuthenticated,
    noCacheAuth,
    ensureAuth,
    ensureAuthAPI,
    ensureAdmin,
} from "../middlewares/auth.js";

const constructorMethod = (app) => {
    // Health check: open /healthz to see whether the server can reach the database.
    app.get("/healthz", async (req, res) => {
        const started = Date.now();
        try {
            await mongoose.connection.db.admin().ping();
            res.json({ ok: true, db: "up", ms: Date.now() - started, serverless: Boolean(process.env.VERCEL), node: process.version });
        } catch (error) {
            res.status(503).json({ ok: false, db: "down", ms: Date.now() - started });
        }
    });

    app.use("/", oauthRoutes);
    app.use("/users", usersRoutes);
    app.use("/auth", redirectIfAuthenticated, noCacheAuth, authRoutes)
    app.use("/api/components", componentRoutes);
    app.use("/api/ai", aiRoutes);
    app.use("/mcp", mcpRoutes);
    app.use("/api/figma", figmaRoutes);
    app.use("/fonts", fontsRoutes);
    app.use("/figma", figmaPages);
    // the Library is gone: a design lives in its project
    app.get(["/library", "/my-components"], (req, res) => res.redirect("/projects"));
    app.get("/library/design-guide.md", (req, res) => res.redirect("/projects/design-guide.md" + (req.query.download ? "?download=1" : "")));
    app.use("/connect", ensureAuth, connectRoutes);
    app.use("/design", ensureAuth, designRoutes);
    app.use("/projects", ensureAuth, projectPages);
    app.use("/api/projects", ensureAuthAPI, projectApi);
    app.use("/admin", ensureAuth, ensureAdmin, adminPages);
    app.use("/api/admin", ensureAuthAPI, ensureAdmin, adminApi);
    app.use("/p", sharePages); // a project's share link: open to anyone who has it
    app.get(["/catalog", "/catalog/{*rest}"], (req, res) => res.redirect(301, "/")); // the gallery is the catalog


    app.use("/", infoRoutes);

    // Home page
    app.use("/", homeRoutes);


    app.use("/{*splat}", (req, res) => {
        res.status(404).render("error", {
            layout: "auth",
            title: "Page Not Found",
            message: "The page you requested could not be found.",
        });
    });
};
export default constructorMethod;
