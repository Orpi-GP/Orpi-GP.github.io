(function() {
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    stylesheets.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes('css/styles.css')) {
            const separator = href.includes('?') ? '&' : '?';
            link.setAttribute('href', href.split('?')[0] + '?v=' + new Date().getTime());
        }
    });
})();

