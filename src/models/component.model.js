import mongoose from "mongoose";

const componentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        htmlCode: {
            type: String,
            required: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            default: null,
            index: true
        },
        kind: {
            type: String,
            enum: ["component", "page", "section"],
            default: "component"
        },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Component",
            default: null
        },
        board: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        order: {
            type: Number,
            default: 0
        },
        // the group a page belongs to in its project ("Public site", "Customer area"); empty for none
        // the width (px) the page was designed at (a Figma frame is 1920 wide): its frame on the board and in the editor starts at this width
        frameW: { type: Number, default: null, min: 200, max: 10000 },
        group: {
            type: String,
            default: "",
            maxlength: 60
        },
        profile: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        forkedFrom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Component",
            default: null
        },
        // where this part came from when it was added from the catalog: { family, variant }
        origin: { type: mongoose.Schema.Types.Mixed, default: null },
        useAsReference: {
            type: Boolean,
            default: true
        },
        tags: {
            type: [String],
            default: []
        },
        version: {
            type: Number,
            default: 1
        },
        versions: {
            type: [{
                version: Number,
                htmlCode: String,
                note: String,
                createdAt: { type: Date, default: Date.now }
            }],
            default: []
        },
        isPublished: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// A component keeps its old versions inside its own document, and MongoDB stops at 16 MB per document. With designs up to 5 MB the
// oldest versions are dropped first, so the code and its history stay under this many characters (the newest old version is always kept).
const HISTORY_BUDGET = 12_000_000;
componentSchema.pre("save", function () {
    if (!this.isModified("versions") && !this.isModified("htmlCode")) return;
    let total = (this.htmlCode || "").length + this.versions.reduce((n, v) => n + (v.htmlCode || "").length, 0);
    while (this.versions.length > 1 && total > HISTORY_BUDGET) total -= (this.versions.shift().htmlCode || "").length;
});

export default mongoose.model("Component", componentSchema);
