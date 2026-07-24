import express from "express";
import Component from "../models/component.model.js";

const router = express.Router();

// Category definitions with display names
const categories = {
    'marketing-hero': { name: 'Hero Sections', group: 'Marketing' },
    'marketing-hero-forms': { name: 'Hero Forms', group: 'Marketing' },
    'marketing-icons': { name: 'Icon Sections', group: 'Marketing' },
    'marketing-pricing': { name: 'Pricing Sections', group: 'Marketing' },
    'marketing-faq': { name: 'FAQ Sections', group: 'Marketing' },
    'marketing-blog': { name: 'Blog Sections', group: 'Marketing' },
    'marketing-testimonials': { name: 'Testimonials', group: 'Marketing' },
    'marketing-team': { name: 'Team Sections', group: 'Marketing' },
    'marketing-features': { name: 'Features', group: 'Marketing' },
    'marketing-announcements': { name: 'Announcement Banners', group: 'Marketing' },
    'marketing-cards': { name: 'Card Sections', group: 'Marketing' },
    'marketing-clients': { name: 'Clients Sections', group: 'Marketing' },
    'marketing-galleries': { name: 'Galleries', group: 'Marketing' },
    'marketing-timeline': { name: 'Timeline', group: 'Marketing' },
    'ui-dropdowns': { name: 'Dropdowns', group: 'UI Components' },
    'ui-selects': { name: 'Selects', group: 'UI Components' },
    'ui-buttons': { name: 'Button Groups', group: 'UI Components' },
    'ui-modals': { name: 'Modals', group: 'UI Components' },
    'ui-cookie-banners': { name: 'Cookie Banners', group: 'UI Components' },
    'navigation-navbars': { name: 'Navbars / Headers', group: 'Navigation' },
    'navigation-mega-menu': { name: 'Mega Menu', group: 'Navigation' },
    'layout-basic': { name: 'Layouts', group: 'Layout' },
    'forms-authentication': { name: 'Authentication', group: 'Forms' },
    'forms-feedback': { name: 'Feedback', group: 'Forms' },
    'forms-subscribe': { name: 'Subscribe', group: 'Forms' },
    'forms-textarea': { name: 'Textarea Inputs', group: 'Forms' },
    'pages-pricing': { name: 'Pricing Page', group: 'Pages' },
    'ecommerce-products': { name: 'Product Listings', group: 'E-Commerce' },
    'apps-general': { name: 'Application Components', group: 'Applications' },
    'apps-invoice': { name: 'Invoice', group: 'Applications' },
    'apps-tables': { name: 'Tables', group: 'Applications' },
    'apps-stats': { name: 'Stats', group: 'Applications' },
    'apps-charts': { name: 'Charts', group: 'Applications' },
    'apps-ai-prompt': { name: 'AI Prompt', group: 'Applications' },
    'footer-contact': { name: 'Contact Sections', group: 'Footer' },
    'footer-footers': { name: 'Footers', group: 'Footer' }
};

// Home page - Shows only categories that have components
router.get("/", async (req, res) => {
    try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const results = await Component.aggregate([
            { $match: { isPublished: true } },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    newCount: {
                        $sum: { $cond: [{ $gte: ["$createdAt", oneMonthAgo] }, 1, 0] }
                    }
                }
            }
        ]);

        let totalComponents = 0;
        const categoryCards = results
            .filter(r => r.count > 0)
            .map(r => {
                totalComponents += r.count;
                return {
                    slug: r._id,
                    name: categories[r._id]?.name || r._id,
                    group: categories[r._id]?.group || 'Other',
                    count: r.count,
                    newCount: r.newCount,
                    hasNew: r.newCount > 0
                };
            });

        res.status(200).render("main/home", {
            activePage: 'home',
            layout: 'main',
            title: 'Tailwind UI Components',
            user: req.session.user || null,
            categories: categoryCards,
            totalComponents
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.status(500).render("error", {
            layout: "main",
            title: "Error",
            message: "Failed to load components",
        });
    }
});

// Category detail page - Shows components in that category
router.get("/category/:category", async (req, res) => {
    try {
        const { category } = req.params;

        // Get category counts for sidebar via aggregation
        const countResults = await Component.aggregate([
            { $match: { isPublished: true } },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        const allCategories = countResults
            .filter(r => r.count > 0)
            .map(r => ({
                slug: r._id,
                name: categories[r._id]?.name || r._id,
                count: r.count,
                isActive: r._id === category
            }));

        // Get components for current category
        const components = await Component.find({
            category: category,
            isPublished: true
        })
            .populate('createdBy', 'name email')
            .sort('-createdAt')
            .lean();

        const categoryInfo = categories[category];

        if (!categoryInfo) {
            return res.status(404).render("error", {
                layout: "main",
                title: "Category Not Found",
                message: "The category you're looking for doesn't exist.",
            });
        }

        // Mark which components are new
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        components.forEach(component => {
            component.isNew = new Date(component.createdAt) >= oneMonthAgo;
        });

        res.status(200).render("main/category-detail", {
            activePage: 'category',
            layout: 'main',
            title: categoryInfo.name,
            user: req.session.user || null,
            components: components,
            categoryName: categoryInfo.name,
            categorySlug: category,
            categories: allCategories
        });
    } catch (error) {
        console.error('Error loading category:', error);
        res.status(500).render("error", {
            layout: "main",
            title: "Error",
            message: "Failed to load category",
        });
    }
});

// Component detail page
router.get("/component/:id", async (req, res) => {
    try {
        const component = await Component.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        ).populate('createdBy', 'name email');

        if (!component) {
            return res.status(404).render("error", {
                layout: "main",
                title: "Component Not Found",
                message: "The component you're looking for doesn't exist.",
            });
        }

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        component.isNew = new Date(component.createdAt) >= oneMonthAgo;

        res.status(200).render("main/component-detail", {
            activePage: 'component',
            layout: 'main',
            title: component.title,
            user: req.session.user || null,
            component: component
        });
    } catch (error) {
        console.error('Error loading component:', error);
        res.status(500).render("error", {
            layout: "main",
            title: "Error",
            message: "Failed to load component",
        });
    }
});

export default router;