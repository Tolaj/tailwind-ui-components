import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        apiTokenHash: { type: String, default: "", index: true },
        apiTokenPrefix: { type: String, default: "" },
        llmSettings: {
            enabled: { type: Boolean, default: false },
            provider: { type: String, enum: ["anthropic", "local"], default: "anthropic" },
            anthropicApiKey: { type: String, default: "" },
            localLlmUrl: { type: String, default: "" },
        },
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);
