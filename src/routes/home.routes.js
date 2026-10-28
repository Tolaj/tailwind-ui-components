import express from "express";
import { families, summary } from "../services/catalog.service.js";

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

// Home page: what Windcraft is, and a look at the catalog
router.get("/", async (req, res) => {
    try {
        res.status(200).render("main/home", {
            activePage: 'home',
            layout: 'main',
            title: 'Windcraft',
            user: req.session.user || null,
            families: (await families()).map(summary),
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        res.status(500).render("error", { layout: "main", title: "Error", message: "Failed to load the page" });
    }
});

// The public gallery is replaced by the catalog: old links land there
router.get("/category/:category", (req, res) => res.redirect(301, "/catalog"));
router.get("/component/:id", (req, res) => res.redirect(301, "/catalog"));

export default router;
export { categories }; // the editor's details form still offers these until designs are filed by catalog family
