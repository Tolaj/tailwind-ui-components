import usersRoutes from "./user.routes.js";
import authRoutes from "./auth.routes.js";
import componentRoutes from "./component.routes.js";
import homeRoutes from "./home.routes.js";
import aiRoutes from "./ai.routes.js";

import {
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


    app.use("/{*splat}", (req, res) => {
        res.status(404).render("error", {
            layout: "auth",
            title: "Page Not Found",
            message: "The page you requested could not be found.",
        });
    });
};
export default constructorMethod;
