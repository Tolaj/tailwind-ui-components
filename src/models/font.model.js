import mongoose from "mongoose";

// One shared library: the first person to upload a font family/weight/style adds it for everyone, and later designs
// from any user use it without uploading again. The uploader said they have the right to share it; only they can remove it.
const fontSchema = new mongoose.Schema(
    {
        uploader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        shareConfirmed: { type: Boolean, default: false },
        family: { type: String, required: true, trim: true, maxlength: 80 },
        weight: { type: Number, default: 400, min: 1, max: 1000 },
        style: { type: String, enum: ["normal", "italic"], default: "normal" },
        format: { type: String, enum: ["woff2", "woff", "truetype", "opentype"], required: true },
        data: { type: Buffer, required: true },
    },
    { timestamps: true }
);
fontSchema.index({ family: 1, weight: 1, style: 1 }, { unique: true });

export default mongoose.model("Font", fontSchema);
