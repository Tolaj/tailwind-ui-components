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
        views: {
            type: Number,
            default: 0
        },
        likes: {
            type: Number,
            default: 0
        },
        likedBy: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "User",
            default: []
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
        profile: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        forkedFrom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Component",
            default: null
        },
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

export default mongoose.model("Component", componentSchema);
