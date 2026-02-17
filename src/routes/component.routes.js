import express from "express";
import {
    getAllComponents,
    getComponentById,
    createComponent,
    updateComponent,
    deleteComponent,
    toggleLike
} from "../controllers/component.controller.js";
import { ensureAuthAPI } from "../middlewares/auth.js";  // Changed import

const router = express.Router();

// Public routes
router.get("/", getAllComponents);
router.get("/:id", getComponentById);

// Protected routes - using ensureAuthAPI instead of ensureAuth
router.post("/", ensureAuthAPI, createComponent);
router.put("/:id", ensureAuthAPI, updateComponent);
router.delete("/:id", ensureAuthAPI, deleteComponent);
router.post("/:id/like", ensureAuthAPI, toggleLike);

export default router;