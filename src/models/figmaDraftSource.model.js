import mongoose from "mongoose";

// The Figma layer data of a design opened in the editor with Edit (a draft, not yet a page). If the user saves the draft as a page,
// the data moves to the page (see adoptDraftSource); if not, it goes with the draft after a day.
const figmaDraftSourceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    draft: { type: mongoose.Schema.Types.ObjectId, ref: "FigmaDraft", required: true, unique: true },
    converter: { type: String, default: "" },
    rulesVersion: { type: String, default: "" },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    snapshotGz: { type: Buffer, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export default mongoose.model("FigmaDraftSource", figmaDraftSourceSchema);
