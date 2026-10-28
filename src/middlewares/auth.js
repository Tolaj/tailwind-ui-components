const ensureAuth = (req, res, next) => {
    if (!req.session.user) {
        // a page asked for by link (the editor, for one) is opened after signing in
        const back = req.method === "GET" && req.originalUrl.startsWith("/") ? `?returnTo=${encodeURIComponent(req.originalUrl)}` : "";
        return res.redirect(`/auth/sign-in${back}`);
    }
    next();
};

const redirectIfAuthenticated = (req, res, next) => {
    if (req.session.user && req.originalUrl !== "/auth/sign-out") {
        return res.redirect("/");
    }
    next();
};

const noCacheAuth = (req, res, next) => {
    res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private, max-age=0"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "-1");
    next();
};

/** The site's owners: the emails in ADMIN_EMAILS (comma separated). They review reported designs. */
const isAdmin = (user) => {
    const list = String(process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    return Boolean(user && user.email && list.includes(String(user.email).toLowerCase()));
};

const setSessionLocals = (req, res, next) => {
    res.locals.user = req.session?.user || null;
    res.locals.isAdmin = isAdmin(req.session?.user);
    next();
};

const ensureAdmin = (req, res, next) => {
    if (isAdmin(req.session?.user)) return next();
    if (req.path.startsWith("/api/") || req.originalUrl.startsWith("/api/")) return res.status(403).json({ success: false, message: "Not allowed" });
    return res.status(404).render("error", { layout: "main", title: "Not found", message: "That page doesn't exist.", user: req.session?.user || null });
};

const ensureAuthAPI = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Please login to continue'
        });
    }
    next();
};

export {
    isAdmin,
    ensureAdmin,
    ensureAuth,
    ensureAuthAPI,
    setSessionLocals,
    redirectIfAuthenticated,
    noCacheAuth,
};
