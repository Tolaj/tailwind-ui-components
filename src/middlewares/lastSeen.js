// Writing the session on every request is one more database write that can fail (and on a serverless host each request is cold-start
// work): the time is only refreshed when it is a few minutes old, so most requests leave the session untouched and unsaved.
const REFRESH_MS = 5 * 60 * 1000;

const lastSeenMiddleware = (req, res, next) => {
    if (req.session && req.session.user && (!req.session.lastSeen || Date.now() - req.session.lastSeen > REFRESH_MS)) {
        req.session.lastSeen = Date.now();
    }
    next();
};

export default lastSeenMiddleware;