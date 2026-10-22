import mongoose from "mongoose";

const oauthClientSchema = new mongoose.Schema(
    {
        clientId: { type: String, required: true, unique: true },
        clientName: { type: String, default: "Unnamed app" },
        redirectUris: { type: [String], required: true },
    },
    { timestamps: true }
);

export default mongoose.model("OAuthClient", oauthClientSchema);
