/**
 * Logs every request with timestamp, method, path and auth status.
 */
const requestLogger = (req, res, next) => {
    const timestamp = new Date().toUTCString();
    let authStatus = "Non-Authenticated";

    if (req.session && req.session.user) {
        const role =
            req.session.user.role === "professor" ? "professor" : "student";
        authStatus = `Authenticated ${role}`;
    }

    console.log(
        `[${timestamp}]: ${req.method} ${req.originalUrl} (${authStatus})`
    );

    next();
};

export { requestLogger };
