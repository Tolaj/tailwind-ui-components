import mongoose from "mongoose";

// One collection for authorization codes, access tokens and refresh tokens (all stored hashed).
const oauthTokenSchema = new mongoose.Schema({
    type: { type: String, enum: ["code", "access", "refresh"], required: true },
    tokenHash: { type: String, required: true, unique: true },
    clientId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    scope: { type: String, default: "library" },
    resource: { type: String, default: "" },
    redirectUri: { type: String, default: "" },
    codeChallenge: { type: String, default: "" },
    familyId: { type: String, default: "" },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("OAuthToken", oauthTokenSchema);
