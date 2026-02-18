// Sidebar toggle function
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('sidebarToggle');
    const currentMargin = sidebar.style.marginLeft;

    if (currentMargin === '0px') {
        sidebar.style.marginLeft = '-256px';
        toggleButton.classList.remove('order-2');
        toggleButton.classList.add('order-first');
    } else {
        sidebar.style.marginLeft = '0';
        toggleButton.classList.remove('order-first');
        toggleButton.classList.add('order-2');
    }
}
// Search functionality
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    const cards = document.querySelectorAll('.component-card');

    cards.forEach(card => {
        const title = card.querySelector('h4').textContent.toLowerCase();
        const category = card.querySelector('p').textContent.toLowerCase();

        if (title.includes(searchTerm) || category.includes(searchTerm)) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
}

// Category filter
function handleCategoryFilter(event) {
    const category = event.target.value;

    if (category === 'all') {
        window.location.href = '/';
    } else {
        window.location.href = `/category/${category}`;
    }
}

// User menu toggle
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.classList.toggle('hidden');
}


// Close menu when clicking outside
document.addEventListener('click', (event) => {
    const userMenu = document.getElementById('userMenu');
    const userButton = event.target.closest('button[onclick="toggleUserMenu()"]');

    if (userMenu && !userMenu.contains(event.target) && !userButton) {
        userMenu.classList.add('hidden');
    }
});