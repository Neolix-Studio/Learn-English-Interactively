// js/nav.js

document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("mobile-menu-toggle");
    const navDrawer = document.getElementById("nav-drawer");
    
    if (!menuToggle || !navDrawer) return;

    // Toggle menu state
    const toggleMenu = () => {
        const isActive = navDrawer.classList.contains("is-active");
        
        if (isActive) {
            closeMenu();
        } else {
            openMenu();
        }
    };

    const openMenu = () => {
        menuToggle.classList.add("is-active");
        navDrawer.classList.add("is-active");
        menuToggle.setAttribute("aria-expanded", "true");
        // Optional: lock body scroll when menu is open
        // document.body.style.overflow = "hidden";
    };

    const closeMenu = () => {
        menuToggle.classList.remove("is-active");
        navDrawer.classList.remove("is-active");
        menuToggle.setAttribute("aria-expanded", "false");
        // Optional: restore body scroll
        // document.body.style.overflow = "";
    };

    // Click event on hamburger button
    menuToggle.addEventListener("click", toggleMenu);

    // Close menu when a navigation link is clicked
    const navLinks = navDrawer.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    // Close menu on Escape key press for accessibility
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && navDrawer.classList.contains("is-active")) {
            closeMenu();
            menuToggle.focus(); // Return focus to the toggle button
        }
    });

    // Close menu when clicking outside of it (optional enhancement)
    document.addEventListener("click", (e) => {
        if (navDrawer.classList.contains("is-active") && !navDrawer.contains(e.target) && !menuToggle.contains(e.target)) {
            closeMenu();
        }
    });
});
