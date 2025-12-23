const applyCustomTheme = () => {
    const primary = document.getElementById('primaryColor').value;
    const secondary = document.getElementById('secondaryColor').value;
    const tertiary = document.getElementById('tertiaryColor').value;


    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--secondary', secondary);
    document.documentElement.style.setProperty('--tertiary', tertiary);
}

const handleThemeToggle = () => {
    themeDropdown = document.getElementById("themeDropdown");

    const isClosed = themeDropdown.classList.contains("hidden");

    if (isClosed) {
        themeDropdown.classList.remove(
            'hidden',
            "pointer-events-none"
        );
    } else {
        themeDropdown.classList.add(
            "hidden",
            "pointer-events-none"
        );
    }
}