# Bug Tracker

All issues from the initial audit have been resolved.

## Fixed (initial audit)

- Plaintext passwords — Now using bcrypt for hashing and comparison
- Missing `validator.js` — Created with email validation
- Missing `nodemailer`/`googleapis` deps — Installed; sendEmail.js lazily initializes so server doesn't crash without email env vars
- `toggleLike` always increments — Now tracks per-user likes via `likedBy` array
- Session cookie named `SlackOverflowSession` — Renamed to `TailwindUISession`
- `requestLogger` role labels ("professor"/"student") — Now shows user email
- `llama.local.routes.js` dead code — Removed
- `registerHandlebarsHelpers` unused — Removed
- `ensureProfessor` middleware — Removed
- `package.json` main field wrong — Fixed to `src/server.js`
- `dotenv.config()` called multiple times — Consolidated to `server.js`
- `lastSeen` middleware never wired — Now wired in `app.js`
- `sendEmail.js` "SlackOverflow" branding — Renamed to "Tailwind UI"
