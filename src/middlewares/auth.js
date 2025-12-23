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

export {
    ensureAuth,
    ensureProfessor,
    setSessionLocals,
    redirectIfAuthenticated,
    noCacheAuth,
};
