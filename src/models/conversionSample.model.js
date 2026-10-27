import mongoose from "mongoose";

// A design a user chose to share to improve the Figma converter ("share" when saving, "report" with a note). Kept as the layer data
// without pictures (and, if asked, with the text replaced), plus what the converter made of it. Gzipped to keep them small.
const conversionSampleSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        kind: { type: String, enum: ["share", "report"], default: "share" },
        converter: { type: String, default: "" },
        title: { type: String, default: "", maxlength: 120 },
        width: { type: Number, default: null },
        height: { type: Number, default: null },
        note: { type: String, default: "", maxlength: 1000 },
        anonymized: { type: Boolean, default: false },
        snapshotGz: { type: Buffer, required: true },
        htmlGz: { type: Buffer, required: true },
    },
    { timestamps: true }
);

export default mongoose.model("ConversionSample", conversionSampleSchema);
