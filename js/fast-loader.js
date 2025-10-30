(function() {
    const v = Date.now();
    
    const criticalScripts = [
        'js/config.js',
        'js/theme.js'
    ];
    
    const asyncScripts = [
        'js/cache-buster.js',
        'js/auth.js',
        'js/firebase-config.js',
        'js/firebase-theme.js',
        'js/firebase-properties.js',
        'js/firebase-notifications.js',
        'js/firebase-reviews.js',
        'js/firebase-auctions.js',
        'js/notifications.js',
        'js/page-loader.js',
        'js/auction-banner.js'
    ];
    
    function loadScriptSync(src) {
        document.write('<script src="' + src + '?v=' + v + '"><\/script>');
    }
    
    function loadScriptAsync(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src + '?v=' + v;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    criticalScripts.forEach(src => loadScriptSync(src));
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            asyncScripts.forEach(src => loadScriptAsync(src));
        });
    } else {
        asyncScripts.forEach(src => loadScriptAsync(src));
    }
})();

