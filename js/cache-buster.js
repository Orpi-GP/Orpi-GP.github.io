(function() {
    const CACHE_KEY = 'css_version';
    const CHECK_INTERVAL = 300000;
    
    function getCurrentVersion() {
        return localStorage.getItem(CACHE_KEY);
    }
    
    function setCurrentVersion(version) {
        localStorage.setItem(CACHE_KEY, version);
    }
    
    function updateCache() {
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"][href*="styles.css"]');
        const currentVersion = getCurrentVersion();
        const timestamp = new Date().getTime();
        
        if (!currentVersion || (timestamp - parseInt(currentVersion)) > CHECK_INTERVAL) {
            stylesheets.forEach(link => {
                const href = link.getAttribute('href');
                if (href) {
                    const baseHref = href.split('?')[0];
                    const newHref = `${baseHref}?v=${timestamp}`;
                    
                    const preloadLink = document.createElement('link');
                    preloadLink.rel = 'preload';
                    preloadLink.as = 'style';
                    preloadLink.href = newHref;
                    
                    preloadLink.onload = function() {
                        link.href = newHref;
                        setCurrentVersion(timestamp.toString());
                        setTimeout(() => preloadLink.remove(), 100);
                    };
                    
                    preloadLink.onerror = function() {
                        preloadLink.remove();
                    };
                    
                    document.head.appendChild(preloadLink);
                }
            });
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateCache);
    } else {
        updateCache();
    }
})();

