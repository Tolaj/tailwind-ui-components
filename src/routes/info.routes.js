import express from "express";

const router = express.Router();

const page = (view, activePage, title) => (req, res) =>
    res.render(`main/${view}`, { layout: "main", activePage, title, user: req.session.user || null });

router.get("/documentation", page("documentation", "documentation", "Documentation"));
router.get("/about", page("about", "about", "About"));
router.get("/support", page("support", "support", "Support"));

export default router;
