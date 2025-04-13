// Main JavaScript file for SPX STUDIO website

document.addEventListener('DOMContentLoaded', function() {
    // Check user authentication status
    checkAuthStatus();
    
    // Mobile menu toggle
    const mobileMenuButton = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            this.classList.toggle('active');
        });
    }
    
    // Function to check if user is logged in
    function checkAuthStatus() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userId = localStorage.getItem('userId');
        const userName = localStorage.getItem('userName');
        
        // Get auth buttons and user menu if they exist
        const authButtons = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        const menuUsername = document.getElementById('menu-username');
        
        if (isLoggedIn && userId) {
            // User is logged in
            if (authButtons && userMenu) {
                // Hide login/signup buttons and show user menu
                authButtons.style.display = 'none';
                userMenu.style.display = 'flex';
                
                // Set username in menu
                if (menuUsername) {
                    menuUsername.textContent = userName || userId;
                }
            }
            
            // Check if current page requires authentication
            const securePages = [
                'create.html',
                'my-websites.html',
                'dashboard.html'
            ];
            
            const currentPage = window.location.pathname.split('/').pop();
            
            // Skip dashboard as it has its own check
            if (currentPage !== 'dashboard.html') {
                // Ensure creation pages redirect non-logged-in users to login
                if (securePages.includes(currentPage) && (!isLoggedIn || !userId)) {
                    // Redirect to login page
                    window.location.href = 'login.html';
                }
            }
        } else {
            // User is not logged in
            if (authButtons && userMenu) {
                // Show login/signup buttons and hide user menu
                authButtons.style.display = 'flex';
                userMenu.style.display = 'none';
            }
        }
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            e.preventDefault();
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Testimonial slider
    const testimonials = document.querySelectorAll('.testimonial');
    let currentTestimonial = 0;
    
    if (testimonials.length > 1) {
        // Hide all testimonials except the first one
        testimonials.forEach((testimonial, index) => {
            if (index !== 0) {
                testimonial.style.display = 'none';
            }
        });
        
        // Set up automatic slider
        setInterval(() => {
            testimonials[currentTestimonial].style.display = 'none';
            currentTestimonial = (currentTestimonial + 1) % testimonials.length;
            testimonials[currentTestimonial].style.display = 'block';
        }, 5000);
    }
    
    // Form validation
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            let isValid = true;
            
            // Basic validation for required fields
            const requiredFields = form.querySelectorAll('[required]');
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                } else {
                    field.classList.remove('error');
                }
            });
            
            // Email validation
            const emailFields = form.querySelectorAll('input[type="email"]');
            emailFields.forEach(field => {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (field.value && !emailPattern.test(field.value)) {
                    isValid = false;
                    field.classList.add('error');
                }
            });
            
            // If the form is not valid, prevent submission
            if (!isValid) {
                e.preventDefault();
                alert('Please fill in all required fields correctly.');
            }
            
        
        });
    });
    
    // Add animation effects on scroll
    const animatedElements = document.querySelectorAll('.feature-card, .blog-card, .event-card, .testimonial');
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        animatedElements.forEach(element => {
            observer.observe(element);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        animatedElements.forEach(element => {
            element.classList.add('animated');
        });
    }
});