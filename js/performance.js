window.ORPI_CACHE = {
    get(k) {
        const d = localStorage.getItem(`orpi_${k}`);
        const t = localStorage.getItem(`orpi_${k}_time`);
        if (!d || !t) return null;
        if (Date.now() - parseInt(t) > 300000) return null;
        try {
            return JSON.parse(d);
        } catch (e) {
            return null;
        }
    },
    set(k, v) {
        try {
            localStorage.setItem(`orpi_${k}`, JSON.stringify(v));
            localStorage.setItem(`orpi_${k}_time`, Date.now().toString());
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                this.clearOld();
                try {
                    localStorage.setItem(`orpi_${k}`, JSON.stringify(v));
                    localStorage.setItem(`orpi_${k}_time`, Date.now().toString());
                } catch (e2) {
                }
            }
        }
    },
    clear(k) {
        localStorage.removeItem(`orpi_${k}`);
        localStorage.removeItem(`orpi_${k}_time`);
    },
    clearOld() {
        const now = Date.now();
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('orpi_') && key.endsWith('_time')) {
                const time = parseInt(localStorage.getItem(key));
                if (time && now - time > 3600000) {
                    const baseKey = key.replace('_time', '');
                    localStorage.removeItem(baseKey);
                    localStorage.removeItem(key);
                }
            }
        });
    }
};

if ('serviceWorker' in navigator && location.protocol === 'https:') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        });
    } else {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
}

const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        }
    });
}, { rootMargin: '100px' });

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
    
    document.querySelectorAll('img:not([loading])').forEach(img => {
        if (!img.src.includes('data:') && !img.closest('.hero')) {
            img.loading = 'lazy';
        }
    });
});

const preloadLink = document.createElement('link');
preloadLink.rel = 'preload';
preloadLink.as = 'image';
preloadLink.href = 'images/logo-orpi-mandelieu.png';
document.head.appendChild(preloadLink);

