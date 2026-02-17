import Component from "../models/component.model.js";

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
        const component = await Component.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!component) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        // Increment views
        component.views += 1;
        await component.save();

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
        const { title, category, description, htmlCode, elementsDescription } = req.body;  // ✅ Added elementsDescription

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
            elementsDescription: elementsDescription || [],  // ✅ Added this
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

        // Allow updating elementsDescription too
        const { title, category, description, htmlCode, elementsDescription, isPublished } = req.body;

        const updateData = {};
        if (title) updateData.title = title;
        if (category) updateData.category = category;
        if (description) updateData.description = description;
        if (htmlCode) updateData.htmlCode = htmlCode;
        if (elementsDescription) updateData.elementsDescription = elementsDescription;  // ✅ Added this
        if (typeof isPublished !== 'undefined') updateData.isPublished = isPublished;

        const updated = await Component.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

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

        component.likes += 1;
        await component.save();

        res.status(200).json({
            success: true,
            likes: component.likes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};