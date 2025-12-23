import { Router } from "express";

const router = Router();

router.get("/sign-in", (req, res) => {
    return res.render("auth/signin", { layout: 'auth', title: 'Sign In' });
});

// Sign Out
router.get('/sign-out', (req, res) => {
    return req.session.destroy(() => {
        res.clearCookie('SlackOverflowSession');
        res.redirect('/auth/sign-in');
    });
});

// Sign Up
router.get("/sign-up", (req, res) => {
    return res.render("auth/signup", { layout: 'auth', title: "Sign Up" });
});

// OTP Verification
router.get("/verify-otp", (req, res) => {
    return res.render("auth/verification", { layout: 'auth', title: "OTP Verification" });
});

export default router;
