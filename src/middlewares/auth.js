const ensureAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/auth/sign-in");
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

const ensureProfessor = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== "professor") {
        return res.status(403).send("Access denied");
    }
    next();
};

const setSessionLocals = (req, res, next) => {
    res.locals.user = req.session?.user || null;
    next();
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
    ensureAuth,
    ensureAuthAPI,
    ensureProfessor,
    setSessionLocals,
    redirectIfAuthenticated,
    noCacheAuth,
};
