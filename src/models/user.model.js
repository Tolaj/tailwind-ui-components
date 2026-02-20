import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String },
        email: { type: String, require: true },
        password: { type: String },
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);
