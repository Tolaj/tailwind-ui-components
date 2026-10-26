import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 80 },
        description: { type: String, default: "", trim: true, maxlength: 300 },
        brief: { type: String, default: "", trim: true, maxlength: 4000 },
        // the head the project's pages share (fonts, the Tailwind script and config...): save_pages reuses it when it is not sent again
        sharedHead: { type: String, default: "", maxlength: 20000 },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    },
    { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
