import mongoose from "mongoose";

// A sign-in in progress: the plugin opens the browser with `code`, the user approves there, then the plugin collects its token with `secret`.
const figmaLinkSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    secretHash: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export default mongoose.model("FigmaLink", figmaLinkSchema);
