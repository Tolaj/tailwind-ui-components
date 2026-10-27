import mongoose from "mongoose";

// A sign-in made by the Figma plugin (it stays valid until the user signs out in the plugin). Stored hashed, like the API token.
const figmaTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("FigmaToken", figmaTokenSchema);
