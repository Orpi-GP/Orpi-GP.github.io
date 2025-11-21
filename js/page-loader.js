let loaderHidden = false;

function hideLoader() {
    if (loaderHidden) return;
    loaderHidden = true;
    const loader = document.getElementById('pageLoader');
    if (loader) {
        loader.classList.add('loaded');
    }
}

window.addEventListener('load', () => {
    hideLoader();
});

setTimeout(() => {
    if (!loaderHidden) {
        hideLoader();
    }
}, 3000);

document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('a[href]:not([href^="#"]):not([href^="mailto:"]):not([href^="tel:"]):not([target="_blank"])');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                const loader = document.getElementById('pageLoader');
                if (loader) {
                    loader.classList.remove('loaded');
                }
            }
        });
    });
});

