(function() {
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    stylesheets.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes('css/styles.css')) {
            const newHref = href.split('?')[0] + '?v=' + new Date().getTime();
            
            const preloadLink = document.createElement('link');
            preloadLink.rel = 'preload';
            preloadLink.as = 'style';
            preloadLink.href = newHref;
            
            preloadLink.onload = function() {
                link.href = newHref;
                setTimeout(() => preloadLink.remove(), 100);
            };
            
            document.head.appendChild(preloadLink);
        }
    });
})();

