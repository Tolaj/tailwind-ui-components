import express from "express";
import {
    getAllComponents,
    getComponentById,
    createComponent,
    updateComponent,
    deleteComponent,
    getVersions,
    restoreVersion,
    exportComponentCode,
    setLike,
    reportComponent,
    forkComponent,
    getProfile
} from "../controllers/component.controller.js";
import { ensureAuthAPI } from "../middlewares/auth.js";
import { importDesign } from "../services/import.service.js";
import { resolveProject } from "../services/project.service.js";

const router = express.Router();

// Public routes
router.get("/", getAllComponents);
router.get("/:id/export", exportComponentCode);
router.get("/:id/profile", ensureAuthAPI, getProfile);
router.get("/:id/versions", ensureAuthAPI, getVersions);
router.post("/:id/versions/:version/restore", ensureAuthAPI, restoreVersion);
router.get("/:id", getComponentById);

// Protected routes - using ensureAuthAPI instead of ensureAuth
router.post("/", ensureAuthAPI, createComponent);
router.post("/import", ensureAuthAPI, async (req, res) => {
    const { items, split, tags, summarize, project: projectRef } = req.body || {};
    const project = await resolveProject(req.session.user.id, projectRef); // every design belongs to a project
    if (!project) return res.status(400).json({ success: false, message: "Choose a project to import into" });
    if (!Array.isArray(items) || !items.length || items.length > 50) {
        return res.status(400).json({ success: false, message: "Provide 1 to 50 items" });
    }
    const results = [];
    for (const item of items) {
        try {
            results.push({ ok: true, ...(await importDesign(req.session.user.id, { title: item.title, html: item.html, tags, project: project._id, split: split !== false, summarize: summarize !== false })) });
        } catch (error) {
            results.push({ ok: false, title: item?.title || "", message: error.message });
        }
    }
    res.status(200).json({ success: true, results });
});
router.put("/:id", ensureAuthAPI, updateComponent);
router.delete("/:id", ensureAuthAPI, deleteComponent);
router.post("/:id/like", ensureAuthAPI, setLike);
router.post("/:id/report", ensureAuthAPI, reportComponent);
router.post("/:id/fork", ensureAuthAPI, forkComponent);

export default router;