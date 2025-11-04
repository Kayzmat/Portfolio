function initScrollNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    let lastScrollTop = 0;
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 0) {
            // Scroll Down
            navbar.classList.add('navbar-hidden');
        } else if (scrollTop ===0) {
            // Scroll Up to Top
            navbar.classList.remove('navbar-hidden');
        }
        lastScrollTop = scrollTop;
    });
}

// Attendre que la navbar soit incluse
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initScrollNavbar, 300);
});