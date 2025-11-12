// ============================================
// NAVIGATION FUNCTIONALITY
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    // Mobile Menu Toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navbarNav = document.getElementById('navbarNav');

    if (mobileMenuToggle && navbarNav) {
        mobileMenuToggle.addEventListener('click', function () {
            this.classList.toggle('active');
            navbarNav.classList.toggle('active');
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function (event) {
            if (!mobileMenuToggle.contains(event.target) && !navbarNav.contains(event.target)) {
                mobileMenuToggle.classList.remove('active');
                navbarNav.classList.remove('active');
            }
        });

        // Close mobile menu when clicking on a nav link
        const navLinks = navbarNav.querySelectorAll('.nav-link');
        navLinks.forEach((link) => {
            link.addEventListener('click', function () {
                mobileMenuToggle.classList.remove('active');
                navbarNav.classList.remove('active');
            });
        });
    }

    // Active Page Highlighting
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach((link) => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Smooth Scroll for Anchor Links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach((link) => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href !== '') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const offset = 80; // Navbar height
                    const targetPosition = target.offsetTop - offset;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth',
                    });
                }
            }
        });
    });

    // Navbar Scroll Effect
    let lastScroll = 0;
    const navbar = document.querySelector('.navbar');

    if (navbar) {
        window.addEventListener('scroll', function () {
            const currentScroll = window.pageYOffset;

            // Add shadow on scroll
            if (currentScroll > 10) {
                navbar.style.boxShadow =
                    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            } else {
                navbar.style.boxShadow = '';
            }

            // Hide/show navbar on scroll (optional)
            if (currentScroll > lastScroll && currentScroll > 100) {
                // Scrolling down
                navbar.style.transform = 'translateY(-100%)';
            } else {
                // Scrolling up
                navbar.style.transform = 'translateY(0)';
            }

            lastScroll = currentScroll <= 0 ? 0 : currentScroll;
        });
    }
});
