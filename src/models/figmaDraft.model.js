import mongoose from "mongoose";

// A design sent from Figma only to be edited: it is not in the library until the editor saves it. Gone after a day.
const figmaDraftSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "", maxlength: 120 },
    html: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export default mongoose.model("FigmaDraft", figmaDraftSchema);
