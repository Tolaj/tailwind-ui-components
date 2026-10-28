import mongoose from "mongoose";
import FigmaSource from "../models/figmaSource.model.js";
import { adoptDraftSource } from "../services/figma-update.service.js";
import Component from "../models/component.model.js";
import { exportComponent, FORMATS } from "@windcraft/core/exporters.js";
import { normalizeGroup } from "@windcraft/core/pages.js";
import { specOf } from "../services/design-spec.service.js";
import { buildProfile, profileToMarkdown, enrichProfileWithAI } from "../services/profile.service.js";
import { resolveProject } from "../services/project.service.js";

export const normalizeTags = (tags) => {
    const list = Array.isArray(tags) ? tags : String(tags || "").split(",");
    return [...new Set(list.map((t) => String(t).trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean))].slice(0, 12);
};

// Get all components
export const getAllComponents = async (req, res) => {
    try {
        const { category } = req.query;

        let query = { isPublished: true };

        if (category) {
            query.category = category;
        }

        const components = await Component.find(query)
            .populate('createdBy', 'name email')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            data: components
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get single component
export const getComponentById = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id).populate('createdBy', 'name email');

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        res.status(200).json({
            success: true,
            data: component
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create component
export const createComponent = async (req, res) => {
    try {
        const { title, category, description, htmlCode, tags, isPublished, project: projectRef, group, draftId } = req.body;
        const project = await resolveProject(req.session.user.id, projectRef);
        if (!project) return res.status(400).json({ success: false, message: 'Choose a project: every design belongs to one' });

        if (!title || !category || !description || !htmlCode) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        const component = await Component.create({
            title,
            category,
            description,
            htmlCode,
            tags: normalizeTags(tags),
            profile: buildProfile(htmlCode),
            project: project ? project._id : null,
            kind: req.body.kind === "component" ? "component" : project ? "page" : "component", // a component made from a project stays a component, not a page
            group: project ? normalizeGroup(group) : "",
            isPublished: isPublished === undefined ? true : isPublished === true || isPublished === "true",
            createdBy: req.session.user.id
        });

        enrichProfileWithAI(component._id, req.session.user.id);

        // a design opened from Figma with Edit brings its Figma data along: it moves from the draft to this new page
        let figmaSource = null;
        if (draftId) { try { figmaSource = await adoptDraftSource(req.session.user.id, draftId, component._id); } catch (err) { console.error("Adopt draft source error:", err); } }

        res.status(201).json({
            success: true,
            message: 'Component created successfully',
            data: figmaSource ? { ...component.toObject(), figmaSource } : component
        });
    } catch (error) {
        console.error('Create component error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update component
export const updateComponent = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id);

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        if (component.createdBy.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const { title, category, description, htmlCode, isPublished, tags, note, useAsReference, project: projectRef, board, group } = req.body;
        let codeChanged = false;

        if (board !== undefined) {
            component.board = board && Number.isFinite(board.x) && Number.isFinite(board.y)
                ? { x: Math.round(board.x), y: Math.round(board.y), ...(Number.isFinite(board.w) ? { w: Math.round(board.w) } : {}), ...(Number.isFinite(board.h) ? { h: Math.round(board.h) } : {}) }
                : null;
        }

        if (projectRef !== undefined) {
            const target = await resolveProject(req.session.user.id, projectRef);
            if (projectRef && !target) return res.status(404).json({ success: false, message: 'Project not found' });
            component.project = target ? target._id : null;
            component.kind = target ? (component.kind === 'component' ? 'page' : component.kind) : 'component';
            if (!target) component.parent = null;
            await Component.updateMany({ parent: component._id }, { project: component.project });
        }

        if (htmlCode && htmlCode !== component.htmlCode) {
            component.versions.push({ version: component.version, htmlCode: component.htmlCode, note: note || "" });
            component.version += 1;
            component.htmlCode = htmlCode;
            component.profile = buildProfile(htmlCode, component.profile);
            codeChanged = true;
        }
        if (group !== undefined) component.group = normalizeGroup(group);
        if (title) component.title = title;
        if (category) component.category = category;
        if (description) component.description = description;
        if (typeof useAsReference === 'boolean') component.useAsReference = useAsReference;
        if (tags !== undefined) component.tags = normalizeTags(tags);
        if (typeof isPublished !== 'undefined') component.isPublished = isPublished === true || isPublished === "true";

        const updated = await component.save();
        if (codeChanged) enrichProfileWithAI(updated._id, req.session.user.id);

        res.status(200).json({
            success: true,
            data: updated
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete component
export const deleteComponent = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id);

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        // ✅ Changed to .id instead of ._id
        if (component.createdBy.toString() !== req.session.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        await Component.findByIdAndDelete(req.params.id);
        await FigmaSource.deleteOne({ component: req.params.id }); // the Figma data kept with the page goes with it

        res.status(200).json({
            success: true,
            message: 'Component deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Version history (owner only)
export const getVersions = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id).lean();
        if (!component) return res.status(404).json({ success: false, message: 'Component not found' });
        if (String(component.createdBy) !== req.session.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const history = [
            { version: component.version, htmlCode: component.htmlCode, note: "Current", current: true },
            ...[...(component.versions || [])].reverse(),
        ];
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const restoreVersion = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id);
        if (!component) return res.status(404).json({ success: false, message: 'Component not found' });
        if (String(component.createdBy) !== req.session.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        const target = component.versions.find((v) => v.version === Number(req.params.version));
        if (!target) return res.status(404).json({ success: false, message: 'Version not found' });

        component.versions.push({ version: component.version, htmlCode: component.htmlCode, note: `Before restoring v${target.version}` });
        component.version += 1;
        component.htmlCode = target.htmlCode;
        component.profile = buildProfile(component.htmlCode, component.profile);
        await component.save();
        enrichProfileWithAI(component._id, req.session.user.id);
        res.status(200).json({ success: true, data: component });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Export as html | react | vue | svelte, or design (the design spec as JSON) (public components, or the owner's own)
export const exportComponentCode = async (req, res) => {
    try {
        const format = String(req.query.format || "html").toLowerCase();
        if (format !== "design" && !FORMATS.includes(format)) {
            return res.status(400).json({ success: false, message: `format must be one of ${FORMATS.join(", ")}` });
        }
        const component = await Component.findById(req.params.id).lean();
        const isOwner = component && req.session?.user && String(component.createdBy) === req.session.user.id;
        if (!component || (!component.isPublished && !isOwner)) {
            return res.status(404).json({ success: false, message: 'Component not found' });
        }
        res.status(200).json({
            success: true,
            format,
            code: format === "design" ? JSON.stringify(specOf(component), null, 2) : exportComponent(component.htmlCode, format, component.title),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// Save a gallery component (or your own) as a private copy in your library
export const forkComponent = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const source = await Component.findById(req.params.id).lean();
        if (!source || (!source.isPublished && String(source.createdBy) !== userId)) {
            return res.status(404).json({ success: false, message: 'Component not found' });
        }

        const existing = await Component.findOne({ createdBy: userId, forkedFrom: source._id }).select('_id').lean();
        if (existing) {
            return res.status(200).json({ success: true, existing: true, id: String(existing._id) });
        }

        const copy = await Component.create({
            title: source.title,
            category: source.category,
            description: source.description,
            htmlCode: source.htmlCode,
            tags: source.tags,
            createdBy: userId,
            forkedFrom: source._id,
            profile: source.profile || buildProfile(source.htmlCode),
            isPublished: false,
        });
        res.status(201).json({ success: true, existing: false, id: String(copy._id) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// Profile card (owner only): structured analysis + markdown for humans and agents
export const getProfile = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id).lean();
        if (!component || String(component.createdBy) !== req.session.user.id) {
            return res.status(404).json({ success: false, message: 'Component not found' });
        }
        const profile = component.profile || buildProfile(component.htmlCode);
        res.status(200).json({ success: true, profile, markdown: profileToMarkdown({ ...component, profile }) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Like or unlike a gallery design for the signed-in person. Body `{ liked: true | false }` sets it (so a like made before signing in
 * can be applied once, safely, after); without it the like is toggled. One like per person; the count follows.
 */
export const setLike = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const id = req.params.id;
        if (!mongoose.isValidObjectId(id)) return res.status(404).json({ success: false, message: 'Component not found' });
        const component = await Component.findOne({ _id: id, isPublished: true }).select('likedBy').lean();
        if (!component) return res.status(404).json({ success: false, message: 'Component not found' });
        const has = (component.likedBy || []).some((u) => String(u) === userId);
        const want = typeof req.body?.liked === 'boolean' ? req.body.liked : !has;
        if (want && !has) {
            // the filter makes it count once even when two requests arrive together
            await Component.updateOne({ _id: id, likedBy: { $ne: userId } }, { $addToSet: { likedBy: userId }, $inc: { likes: 1 } });
        } else if (!want && has) {
            await Component.updateOne({ _id: id, likedBy: userId }, { $pull: { likedBy: userId }, $inc: { likes: -1 } });
        }
        const now = await Component.findById(id).select('likes likedBy').lean();
        res.status(200).json({ success: true, likes: Math.max(0, now.likes || 0), liked: (now.likedBy || []).some((u) => String(u) === userId) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
