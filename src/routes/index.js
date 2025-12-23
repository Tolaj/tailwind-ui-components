import usersRoutes from "./user.routes.js";
import authRoutes from "./auth.routes.js";

import {
    ensureAuth,
    redirectIfAuthenticated,
    noCacheAuth,
} from "../middlewares/auth.js";

const constructorMethod = (app) => {
    app.use("/users", usersRoutes);
    app.use("/auth", redirectIfAuthenticated, noCacheAuth, authRoutes)


    // Home page
    app.get("/", ensureAuth, noCacheAuth, (req, res) => {
        res.status(200).render("main/home", { layout: 'main', title: 'Tailwind UI Components' })
    });

    app.use("/{*splat}", (req, res) => {
        res.status(404).render("error", {
            layout: "main",
            title: "Page Not Found",
            message: "The page you requested could not be found.",
        });
    });
};
export default constructorMethod;
