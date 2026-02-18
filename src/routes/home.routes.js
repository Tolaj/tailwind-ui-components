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
        const components = await Component.find({ isPublished: true }).lean();

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const categoryCounts = {};
        const categoryNewCounts = {};

        components.forEach(component => {
            const cat = component.category;
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

            if (new Date(component.createdAt) >= oneMonthAgo) {
                categoryNewCounts[cat] = (categoryNewCounts[cat] || 0) + 1;
            }
        });

        const categoryCards = Object.keys(categoryCounts)
            .filter(key => categoryCounts[key] > 0)
            .map(key => ({
                slug: key,
                name: categories[key]?.name || key,
                group: categories[key]?.group || 'Other',
                count: categoryCounts[key],
                newCount: categoryNewCounts[key] || 0,
                hasNew: categoryNewCounts[key] > 0
            }));

        res.status(200).render("main/home", {
            activePage: 'home',
            layout: 'main',
            title: 'Tailwind UI Components',
            user: req.session.user || null,
            categories: categoryCards,
            totalComponents: components.length  // ✅ Add total count
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

        // Get all components for counts
        const allComponents = await Component.find({ isPublished: true }).lean();

        // Get category counts for sidebar
        const categoryCounts = {};
        allComponents.forEach(component => {
            categoryCounts[component.category] = (categoryCounts[component.category] || 0) + 1;
        });

        // Build sidebar categories list
        const allCategories = Object.keys(categoryCounts)
            .filter(key => categoryCounts[key] > 0)
            .map(key => ({
                slug: key,
                name: categories[key]?.name || key,
                count: categoryCounts[key],
                isActive: key === category
            }));

        // Get components for current category
        const components = await Component.find({
            category: category,
            isPublished: true
        })
            .populate('createdBy', 'name email last_name')
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
        const component = await Component.findById(req.params.id)
            .populate('createdBy', 'name email last_name');

        if (!component) {
            return res.status(404).render("error", {
                layout: "main",
                title: "Component Not Found",
                message: "The component you're looking for doesn't exist.",
            });
        }

        component.views += 1;
        await component.save();

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