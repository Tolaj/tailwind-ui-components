# Known Bugs

## Fixed

- ~~Plaintext passwords~~ — Now using bcrypt for hashing and comparison
- ~~Missing `validator.js`~~ — Created with email validation
- ~~`toggleLike` always increments~~ — Now tracks per-user likes via `likedBy` array
- ~~Session cookie name mismatch~~ — Renamed to `TailwindUISession`
- ~~`requestLogger` role labels wrong~~ — Now shows user email
- ~~`llama.local.routes.js` dead code~~ — Removed
- ~~`registerHandlebarsHelpers` unused~~ — Removed
- ~~`package.json` main field wrong~~ — Fixed to `src/server.js`
- ~~dotenv called multiple times~~ — Consolidated to `server.js` only
- ~~`ensureProfessor` middleware~~ — Removed (no roles in this app)

## Remaining

### Critical

#### Missing npm dependencies for email
`sendEmail.js` imports `nodemailer` and `googleapis` but neither is in `package.json`. The module throws at import time if loaded. The email/OTP flow is non-functional until these are added.

### Low

#### `lastSeen` middleware never wired
Defined in `middlewares/lastSeen.js` but not used in `app.js` or anywhere. Either wire it up or remove it.
