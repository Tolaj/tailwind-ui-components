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

