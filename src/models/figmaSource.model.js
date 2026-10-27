import mongoose from "mongoose";

// The Figma layer data a page was converted from, kept (gzipped) next to the saved page so Windcraft can update the page with a
// newer converter later. Private to the page's owner, like the page. One per page: saving again replaces it.
const figmaSourceSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        component: { type: mongoose.Schema.Types.ObjectId, ref: "Component", required: true, unique: true },
        converter: { type: String, default: "" },
        rulesVersion: { type: String, default: "" },
        width: { type: Number, default: null },
        height: { type: Number, default: null },
        grids: { type: Array, default: undefined }, // the page frame's layout grids (columns, rows, square grid), drawn by the editor as guides
        snapshotGz: { type: Buffer, required: true },
    },
    { timestamps: true }
);

export default mongoose.model("FigmaSource", figmaSourceSchema);
