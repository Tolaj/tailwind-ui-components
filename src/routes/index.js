import usersRoutes from "./user.routes.js";
import authRoutes from "./auth.routes.js";
import componentRoutes from "./component.routes.js";
import homeRoutes from "./home.routes.js";
import aiRoutes from "./ai.routes.js";

import {
    ensureAuth,
    redirectIfAuthenticated,
    noCacheAuth,
} from "../middlewares/auth.js";

const constructorMethod = (app) => {
    app.use("/users", usersRoutes);
    app.use("/auth", redirectIfAuthenticated, noCacheAuth, authRoutes)
    app.use("/api/components", componentRoutes);
    app.use("/api/ai", aiRoutes);


    // Home page
    app.use("/", homeRoutes);


    // Add this temporary debug route to your routes/index.js
    app.get("/api/debug/session", ensureAuth, (req, res) => {
        res.json({
            fullSession: req.session,
            user: req.session.user,
            userId: req.session.user?._id,
            userKeys: Object.keys(req.session.user || {})
        });
    });

    app.use("/{*splat}", (req, res) => {
        res.status(404).render("error", {
            layout: "auth",
            title: "Page Not Found",
            message: "The page you requested could not be found.",
        });
    });
};
export default constructorMethod;
