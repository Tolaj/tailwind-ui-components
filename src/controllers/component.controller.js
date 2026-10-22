import Component from "../models/component.model.js";
import { exportComponent, FORMATS } from "../utils/exporters.js";

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
        const component = await Component.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        ).populate('createdBy', 'name email');

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
        const { title, category, description, htmlCode, elementsDescription, tags, isPublished } = req.body;

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
            elementsDescription: elementsDescription || [],
            tags: normalizeTags(tags),
            isPublished: isPublished === undefined ? true : isPublished === true || isPublished === "true",
            createdBy: req.session.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Component created successfully',
            data: component
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

        const { title, category, description, htmlCode, elementsDescription, isPublished, tags, note, useAsReference } = req.body;

        if (htmlCode && htmlCode !== component.htmlCode) {
            component.versions.push({ version: component.version, htmlCode: component.htmlCode, note: note || "" });
            component.version += 1;
            component.htmlCode = htmlCode;
        }
        if (title) component.title = title;
        if (category) component.category = category;
        if (description) component.description = description;
        if (elementsDescription) component.elementsDescription = elementsDescription;
        if (typeof useAsReference === 'boolean') component.useAsReference = useAsReference;
        if (tags !== undefined) component.tags = normalizeTags(tags);
        if (typeof isPublished !== 'undefined') component.isPublished = isPublished === true || isPublished === "true";

        const updated = await component.save();

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

// Like component
export const toggleLike = async (req, res) => {
    try {
        const component = await Component.findById(req.params.id);

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        const userId = req.session.user.id;
        const index = component.likedBy.indexOf(userId);

        if (index === -1) {
            component.likedBy.push(userId);
            component.likes += 1;
        } else {
            component.likedBy.splice(index, 1);
            component.likes -= 1;
        }

        await component.save();

        res.status(200).json({
            success: true,
            likes: component.likes,
            liked: index === -1
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
        component.elementsDescription = [];
        await component.save();
        res.status(200).json({ success: true, data: component });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Export as html | react | vue | svelte (public components, or the owner's own)
export const exportComponentCode = async (req, res) => {
    try {
        const format = String(req.query.format || "html").toLowerCase();
        if (!FORMATS.includes(format)) {
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
            code: exportComponent(component.htmlCode, format, component.title),
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
            elementsDescription: source.elementsDescription,
            tags: source.tags,
            createdBy: userId,
            forkedFrom: source._id,
            isPublished: false,
        });
        res.status(201).json({ success: true, existing: false, id: String(copy._id) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
