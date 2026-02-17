export const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export const substring = (str, start, end) => {
    if (!str) return '';
    return str.substring(start, end).toUpperCase();
};

// handlebars-helpers.js
// Add this to your server configuration where you register Handlebars helpers

export function registerHandlebarsHelpers(handlebars) {
    // JSON serialization helper for passing data to JavaScript
    handlebars.registerHelper('json', function (context) {
        return JSON.stringify(context);
    });

    // Substring helper (if not already registered)
    handlebars.registerHelper('substring', function (str, start, end) {
        if (!str) return '';
        return str.substring(start, end);
    });

    // Additional helpers can be added here...
}

// If you're using a different setup, here's the standalone version:
export const jsonHelper = function (context) {
    return JSON.stringify(context);
};