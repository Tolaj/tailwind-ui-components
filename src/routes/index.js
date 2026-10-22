import usersRoutes from "./user.routes.js";
import authRoutes from "./auth.routes.js";
import componentRoutes from "./component.routes.js";
import homeRoutes from "./home.routes.js";
import aiRoutes from "./ai.routes.js";
import mcpRoutes from "./mcp.routes.js";
import libraryRoutes from "./library.routes.js";
import infoRoutes from "./info.routes.js";
import connectRoutes from "./connect.routes.js";
import oauthRoutes from "./oauth.routes.js";
import designRoutes from "./design.routes.js";

import {
    redirectIfAuthenticated,
    noCacheAuth,
    ensureAuth,
} from "../middlewares/auth.js";

const constructorMethod = (app) => {
    app.use("/", oauthRoutes);
    app.use("/users", usersRoutes);
    app.use("/auth", redirectIfAuthenticated, noCacheAuth, authRoutes)
    app.use("/api/components", componentRoutes);
    app.use("/api/ai", aiRoutes);
    app.use("/mcp", mcpRoutes);
    app.get("/my-components", (req, res) => res.redirect("/library"));
    app.use("/library", ensureAuth, libraryRoutes);
    app.use("/connect", ensureAuth, connectRoutes);
    app.use("/design", ensureAuth, designRoutes);


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
