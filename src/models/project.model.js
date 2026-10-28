import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 80 },
        description: { type: String, default: "", trim: true, maxlength: 300 },
        brief: { type: String, default: "", trim: true, maxlength: 4000 },
        // the head the project's pages share (fonts, the Tailwind script and config...): save_pages reuses it when it is not sent again
        sharedHead: { type: String, default: "", maxlength: 20000 },
        // the project's theme (brand colour, gray palette, font, radius): see packages/core/theme.js; null until it is set, then the default applies
        theme: { type: mongoose.Schema.Types.Mixed, default: null },
        // the share link: anyone with /p/<shareToken> can look at the project and copy its code (no account); empty = not shared
        shareToken: { type: String, default: "", index: true },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    },
    { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
