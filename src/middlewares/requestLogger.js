/**
 * Logs every request with timestamp, method, path and auth status.
 */
const requestLogger = (req, res, next) => {
    const timestamp = new Date().toUTCString();
    let authStatus = "Non-Authenticated";

    if (req.session && req.session.user) {
        authStatus = `Authenticated (${req.session.user.email})`;
    }

    console.log(
        `[${timestamp}]: ${req.method} ${req.originalUrl} (${authStatus})`
    );

    next();
};

export { requestLogger };
