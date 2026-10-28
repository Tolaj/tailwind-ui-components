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