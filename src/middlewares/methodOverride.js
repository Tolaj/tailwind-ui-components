const methodOverride = (req, res, next) => {

    if (req.body && req.body._method) {
        req.method = req.body._method.toUpperCase();
        delete req.body._method;
    }
    next();
};

export { methodOverride }