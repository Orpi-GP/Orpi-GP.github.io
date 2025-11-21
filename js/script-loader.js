(function() {
    'use strict';
    
    const BUILD_V = window.BUILD_V || Math.floor(Date.now() / 3600000);
    
    const CRITICAL_SCRIPTS = [
        'js/config.js',
        'js/theme.js'
    ];
    
    const ASYNC_SCRIPTS = [];
    
    const loadedScripts = new Set();
    
    function loadScriptSync(src) {
        if (loadedScripts.has(src)) return;
        loadedScripts.add(src);
        
        const script = document.createElement('script');
        script.src = src + '?v=' + BUILD_V;
        script.async = false;
        script.defer = false;
        document.head.appendChild(script);
    }
    
    function loadScriptAsync(src, defer = false) {
        if (loadedScripts.has(src)) return Promise.resolve();
        loadedScripts.add(src);
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src + '?v=' + BUILD_V;
            script.async = !defer;
            script.defer = defer;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    function loadScriptsParallel(scripts, defer = false) {
        return Promise.all(scripts.map(src => loadScriptAsync(src, defer).catch(err => {
            console.warn('Erreur chargement script:', src, err);
        })));
    }
    
    function loadCriticalScripts() {
        CRITICAL_SCRIPTS.forEach(src => loadScriptSync(src));
    }
    
    function loadAsyncScripts(scripts) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                loadScriptsParallel(scripts, true);
            });
        } else {
            loadScriptsParallel(scripts, true);
        }
    }
    
    window.ScriptLoader = {
        load: function(src, options = {}) {
            const { critical = false, defer = false } = options;
            if (critical) {
                loadScriptSync(src);
            } else {
                return loadScriptAsync(src, defer);
            }
        },
        loadMultiple: function(scripts, options = {}) {
            const { defer = false } = options;
            return loadScriptsParallel(scripts, defer);
        },
        init: function(asyncScripts = []) {
            loadCriticalScripts();
            if (asyncScripts.length > 0) {
                loadAsyncScripts(asyncScripts);
            }
        }
    };
    
    loadCriticalScripts();
})();

