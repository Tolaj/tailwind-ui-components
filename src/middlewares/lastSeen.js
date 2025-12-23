const lastSeenMiddleware = (req, res, next) => {
    if (req.session && req.session.user) {
        req.session.lastSeen = Date.now();
    }
    next();
};

export default lastSeenMiddleware;