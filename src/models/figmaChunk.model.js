import mongoose from "mongoose";

// One piece of a large upload from the Figma plugin. A host may refuse a request body over a few MB, and its servers share no memory
// between requests, so the pieces wait here (for an hour at most) until the plugin says they are all sent.
const figmaChunkSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uploadId: { type: String, required: true },
    index: { type: Number, required: true },
    data: { type: Buffer, required: true },
    createdAt: { type: Date, default: Date.now, expires: 3600 },
});
figmaChunkSchema.index({ uploadId: 1, index: 1 }, { unique: true });

export default mongoose.model("FigmaChunk", figmaChunkSchema);
