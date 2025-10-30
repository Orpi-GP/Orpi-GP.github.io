const navToggle = document.getElementById('navToggle');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');

let navOverlay = document.querySelector('.nav-overlay');
if (!navOverlay) {
    navOverlay = document.createElement('div');
    navOverlay.className = 'nav-overlay';
    document.body.appendChild(navOverlay);
}

function closeMenu() {
    if (navMenu) navMenu.classList.remove('active');
    if (navOverlay) navOverlay.classList.remove('active');
    const spans = navToggle?.querySelectorAll('span');
    if (spans) {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    }
}

if (navToggle && navMenu) {
    navToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        navMenu.classList.toggle('active');
        navOverlay.classList.toggle('active');
        const spans = navToggle.querySelectorAll('span');
        const isActive = navMenu.classList.contains('active');
        spans[0].style.transform = isActive 
            ? 'rotate(45deg) translate(5px, 5px)' 
            : 'none';
        spans[1].style.opacity = isActive ? '0' : '1';
        spans[2].style.transform = isActive 
            ? 'rotate(-45deg) translate(7px, -6px)' 
            : 'none';
    });
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (!link.parentElement.classList.contains('nav-dropdown')) {
                closeMenu();
            }
        });
    });
    
    navOverlay.addEventListener('click', closeMenu);
}

document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
    let timeoutId;
    
    dropdown.addEventListener('mouseenter', () => {
        if (window.innerWidth > 768) {
            clearTimeout(timeoutId);
            document.querySelectorAll('.nav-dropdown').forEach(d => {
                if (d !== dropdown) {
                    d.classList.remove('hover');
                }
            });
            dropdown.classList.add('hover');
        }
    });
    
    dropdown.addEventListener('mouseleave', () => {
        if (window.innerWidth > 768) {
            timeoutId = setTimeout(() => {
                dropdown.classList.remove('hover');
            }, 200);
        }
    });
});

document.querySelectorAll('.nav-dropdown > .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.innerWidth <= 768) {
            const dropdown = link.parentElement;
            const wasActive = dropdown.classList.contains('active');
            document.querySelectorAll('.nav-dropdown').forEach(d => d.classList.remove('active'));
            if (!wasActive) {
                dropdown.classList.add('active');
            }
        }
    });
});
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            const offset = 70; 
            const targetPosition = target.offsetTop - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});
let lastScroll = 0;
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll <= 0) {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.15)';
    }
    lastScroll = currentScroll;
});
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });
    if (navLinks && navLinks.length > 0) {
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === current) {
                link.classList.add('active');
            }
        });
    }
});
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.8s ease forwards';
        }
    });
}, observerOptions);
document.querySelectorAll('.service-card, .stat-item').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
});
const animateCounter = (element, target) => {
    let current = 0;
    const increment = target / 100;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + (element.textContent.includes('+') ? '+' : '') + 
                                 (element.textContent.includes('%') ? '%' : '');
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current) + 
                                (element.textContent.includes('+') ? '+' : '') + 
                                (element.textContent.includes('%') ? '%' : '');
        }
    }, 20);
};
const statsSection = document.querySelector('.stats');
let statsAnimated = false;
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !statsAnimated) {
            statsAnimated = true;
            const statNumbers = document.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const target = parseInt(stat.textContent);
                animateCounter(stat, target);
            });
        }
    });
}, { threshold: 0.5 });
if (statsSection) {
    statsObserver.observe(statsSection);
}
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});
