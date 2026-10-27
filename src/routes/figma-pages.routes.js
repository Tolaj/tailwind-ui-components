import express from "express";
import crypto from "crypto";
import { pendingLink, approveLink } from "../services/figma-link.service.js";

/** The page the plugin opens in the browser: sign in (or sign up) if needed, then approve the plugin for this account. */
const router = express.Router();

const done = (res, title, message) => res.render("main/figma-authorize", { layout: "auth", title, done: true, message });

router.get("/authorize", async (req, res) => {
    const code = String(req.query.code || "");
    if (!req.session.user) return res.redirect(`/auth/sign-in?returnTo=${encodeURIComponent(req.originalUrl)}`);
    if (!(await pendingLink(code))) return done(res, "Link expired", "This sign-in link has expired or was already used. Go back to Figma and press Sign in again.");
    req.session.figmaCsrf = crypto.randomBytes(24).toString("hex");
    res.set("Cache-Control", "no-store");
    res.render("main/figma-authorize", { layout: "auth", title: "Connect Figma", code, csrf: req.session.figmaCsrf, userEmail: req.session.user.email });
});

router.post("/authorize", express.urlencoded({ extended: false }), async (req, res) => {
    if (!req.session.user) return res.redirect("/auth/sign-in");
    const { code, csrf, decision } = req.body || {};
    if (!csrf || !req.session.figmaCsrf || csrf !== req.session.figmaCsrf) return done(res, "Expired", "This request expired. Go back to Figma and press Sign in again.");
    req.session.figmaCsrf = null;
    if (decision !== "allow") return done(res, "Cancelled", "Nothing was connected. You can close this tab.");
    const ok = await approveLink(code, req.session.user.id);
    done(res, ok ? "Connected" : "Link expired", ok ? "Done. Go back to Figma: the plugin is signed in. You can close this tab." : "This sign-in link has expired or was already used. Go back to Figma and press Sign in again.");
});

export default router;
