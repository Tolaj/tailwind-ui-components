# Known Bugs

## Critical

### 1. Plaintext passwords
`user.controller.js:51` — Passwords stored and compared as plaintext. Should use bcrypt.

### 2. Missing `validator.js` utility
`generateOTP.js:1` imports `../utils/validator.js` which does not exist. Server will crash if OTP flow is triggered.

### 3. Missing npm dependencies for email
`sendEmail.js` imports `nodemailer` and `googleapis` but neither is in `package.json`. The `sendEmail.js` module throws at import time if loaded (those env vars are also missing in most environments, causing an eager throw).

### 4. `toggleLike` always increments
`component.controller.js:187` — `toggleLike` only increments, never toggles. A user can spam likes indefinitely. There's no per-user tracking.

## Medium

### 5. Session cookie name mismatch
`sessionConfig.js:9` names the cookie `SlackOverflowSession` — a leftover from another project. Should match this project.

### 6. `requestLogger` role labels wrong
`requestLogger.js:10` labels users as "professor" or "student" — remnants from another project. This app has no roles.

### 7. `llama.local.routes.js` dead code
Imported nowhere (not mounted in `routes/index.js`). Superseded by `ai.routes.js`. Should be removed.

### 8. `lastSeen` middleware never wired
Defined in `middlewares/lastSeen.js` but not used in `app.js` or anywhere.

### 9. `registerHandlebarsHelpers` function unused
`handlebars-helpers.js` exports a `registerHandlebarsHelpers` function that duplicates helpers already registered inline in `app.js`. Dead code.

## Low

### 10. `package.json` main field wrong
`"main": "index.js"` but entry is `src/server.js`.

### 11. dotenv called multiple times
`dotenv.config()` is called in `app.js`, `server.js`, `settings.js`, `sessionConfig.js`, and `llama.local.routes.js`. Only one call in `server.js` (or `--env-file` in the start script) is needed.
