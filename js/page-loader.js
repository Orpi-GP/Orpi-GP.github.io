let loaderHidden = false;

function hideLoader() {
    if (loaderHidden) return;
    loaderHidden = true;
    const loader = document.getElementById('pageLoader');
    if (loader) {
        loader.classList.add('loaded');
        console.log('✅ Loader caché');
    }
}

window.addEventListener('load', () => {
    setTimeout(hideLoader, 300);
});

setTimeout(() => {
    if (!loaderHidden) {
        console.warn('⚠️ Timeout: forçage de la disparition du loader');
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

