import express from "express";
import mongoose from "mongoose";
import Font from "../models/font.model.js";
import { mimeOf } from "../services/fonts.service.js";

/** The font files themselves: a design's page loads them from here, so they are open to any page but only by their unguessable id. */
const router = express.Router();

router.get("/:id", async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.sendStatus(404);
    const font = await Font.findById(req.params.id).select("format data").lean();
    if (!font) return res.sendStatus(404);
    res.set({ "Content-Type": mimeOf(font.format), "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" });
    res.send(font.data.buffer ? Buffer.from(font.data.buffer) : font.data);
});

export default router;
