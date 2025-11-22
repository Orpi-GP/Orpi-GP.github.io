if (!window.themeManager) {
window.themeManager = {
    themes: {
        halloween: {
            primaryColor: '#FF6B35',
            secondaryColor: '#1a1a1a',
            accentColor: '#A855F7',
            lightBg: '#FFF5F0',
            textColor: '#2d2d2d',
            heroOverlay: 'linear-gradient(135deg, rgba(255, 107, 53, 0.75), rgba(168, 85, 247, 0.7))',
        },
        christmas: {
            primaryColor: '#C41E3A',
            secondaryColor: '#1B4332',
            accentColor: '#FFB800',
            lightBg: '#FFFBF0',
            textColor: '#1F2937',
            heroOverlay: 'linear-gradient(135deg, rgba(196, 30, 58, 0.75), rgba(27, 67, 50, 0.7))',
        },
        default: {
            primaryColor: '#E30613',
            secondaryColor: '#1a1a1a',
            accentColor: '#5865F2',
            lightBg: '#f8f9fa',
            textColor: '#333',
            heroOverlay: 'linear-gradient(135deg, rgba(227, 6, 19, 0.9), rgba(26, 26, 26, 0.85))',
        }
    },

    applyTheme(themeName) {
        const theme = this.themes[themeName] || this.themes.default;
        const root = document.documentElement;
        
        root.style.setProperty('--primary-color', theme.primaryColor);
        root.style.setProperty('--secondary-color', theme.secondaryColor);
        root.style.setProperty('--light-bg', theme.lightBg);
        root.style.setProperty('--text-color', theme.textColor);
        
        const heroOverlay = document.querySelector('.hero-overlay');
        if (heroOverlay) {
            heroOverlay.style.background = theme.heroOverlay;
            heroOverlay.style.transition = 'background 0.5s ease';
        }
        
        if (themeName === 'halloween') {
            this.addHalloweenEffects();
        } else if (themeName === 'christmas') {
            this.addChristmasEffects();
        }
    },

    addHalloweenEffects() {
        if (!document.body || document.getElementById('halloween-decorations')) return;
        
        const container = document.createElement('div');
        container.id = 'halloween-decorations';
        container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; overflow: hidden;';
        
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'halloween-particle';
            particle.style.cssText = `
                position: absolute;
                width: ${4 + Math.random() * 8}px;
                height: ${4 + Math.random() * 8}px;
                background: radial-gradient(circle, ${i % 2 === 0 ? '#FF6B35' : '#A855F7'}, transparent);
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: floatParticle ${15 + Math.random() * 20}s ease-in-out infinite;
                animation-delay: ${Math.random() * 5}s;
                opacity: ${0.3 + Math.random() * 0.4};
                filter: blur(2px);
            `;
            container.appendChild(particle);
        }
        
        const pumpkinPositions = [
            { bottom: '20px', left: '5%' },
            { bottom: '30px', right: '8%' },
            { top: '15%', left: '3%' },
            { top: '25%', right: '5%' }
        ];
        
        pumpkinPositions.forEach((pos, i) => {
            const pumpkin = document.createElement('div');
            pumpkin.innerHTML = '🎃';
            pumpkin.style.cssText = `
                position: absolute;
                font-size: ${2.5 + Math.random()}rem;
                opacity: 0.15;
                filter: drop-shadow(0 0 10px rgba(255, 107, 53, 0.5));
                animation: pulse ${3 + i}s ease-in-out infinite;
                ${Object.entries(pos).map(([k, v]) => `${k}: ${v}`).join('; ')};
            `;
            container.appendChild(pumpkin);
        });
        
        document.body.appendChild(container);
        this.addHalloweenAnimations();
    },

    addChristmasEffects() {
        if (!document.body || document.getElementById('christmas-decorations')) return;
        
        const container = document.createElement('div');
        container.id = 'christmas-decorations';
        container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9998; overflow: hidden; contain: layout style paint; will-change: transform; opacity: 0.85;';
        
        for (let i = 0; i < 25; i++) {
            const snowflake = document.createElement('div');
            const size = 0.3 + Math.random() * 0.5;
            snowflake.innerHTML = '❄';
            snowflake.style.cssText = `
                position: absolute;
                font-size: ${size}rem;
                color: rgba(255, 255, 255, 0.9);
                text-shadow: 0 0 ${size * 6}px rgba(255, 255, 255, 0.6);
                opacity: ${0.4 + Math.random() * 0.4};
                left: ${Math.random() * 100}%;
                top: -50px;
                will-change: transform, opacity;
                animation: fallSnowSmooth ${20 + Math.random() * 25}s linear infinite;
                animation-delay: ${Math.random() * 10}s;
            `;
            container.appendChild(snowflake);
        }
        
        const santaPositions = [
            { top: '15%', left: '5%', size: 1.8 },
            { top: '45%', left: '92%', size: 2.2 },
            { top: '75%', left: '3%', size: 1.6 }
        ];
        
        santaPositions.forEach((pos, i) => {
            const santa = document.createElement('div');
            santa.innerHTML = '🎅';
            const endX = parseFloat(pos.left) + (Math.random() * 15 - 7.5);
            santa.style.cssText = `
                position: absolute;
                font-size: ${pos.size}rem;
                left: ${pos.left};
                top: ${pos.top};
                will-change: transform;
                animation: santaFloat ${25 + Math.random() * 10}s ease-in-out infinite;
                animation-delay: ${i * 2}s;
                filter: drop-shadow(0 3px 6px rgba(0,0,0,0.2));
                opacity: 0.75;
            `;
            santa.setAttribute('data-end-x', endX);
            container.appendChild(santa);
        });
        
        const lights = ['🔴', '🟢', '🟡', '🔵'];
        const lightPositions = [
            { top: '12%', left: '12%' },
            { top: '10%', left: '35%' },
            { top: '8%', left: '58%' },
            { top: '11%', left: '78%' },
            { top: '9%', left: '95%' }
        ];
        
        lightPositions.forEach((pos, i) => {
            const light = document.createElement('div');
            light.innerHTML = lights[i % lights.length];
            light.style.cssText = `
                position: absolute;
                font-size: 1.1rem;
                opacity: 0.7;
                filter: drop-shadow(0 0 8px currentColor);
                will-change: transform, opacity;
                animation: twinkle ${1.5 + (i % 3) * 0.3}s ease-in-out infinite;
                animation-delay: ${i * 0.2}s;
                ${Object.entries(pos).map(([k, v]) => `${k}: ${v}`).join('; ')};
            `;
            container.appendChild(light);
        });
        
        document.body.appendChild(container);
        this.addChristmasAnimations();
    },

    addHalloweenAnimations() {
        if (document.getElementById('halloween-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'halloween-animations';
        style.textContent = `
            @keyframes floatParticle {
                0%, 100% { 
                    transform: translate(0, 0) scale(1);
                }
                25% { 
                    transform: translate(20px, -30px) scale(1.2);
                }
                50% { 
                    transform: translate(-15px, -60px) scale(0.8);
                }
                75% { 
                    transform: translate(25px, -40px) scale(1.1);
                }
            }
            @keyframes pulse {
                0%, 100% { 
                    opacity: 0.15;
                    transform: scale(1);
                }
                50% { 
                    opacity: 0.25;
                    transform: scale(1.05);
                }
            }
        `;
        document.head.appendChild(style);
    },

    addChristmasAnimations() {
        if (document.getElementById('christmas-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'christmas-animations';
        style.textContent = `
            @keyframes fallSnowSmooth {
                0% { 
                    transform: translate3d(0, 0, 0) rotate(0deg);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                90% {
                    opacity: 1;
                }
                100% { 
                    transform: translate3d(var(--snow-x, 0), 100vh, 0) rotate(360deg);
                    opacity: 0;
                }
            }
            @keyframes santaFloat {
                0%, 100% { 
                    transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
                }
                25% { 
                    transform: translate3d(var(--santa-x1, 15px), -12px, 0) scale(1.03) rotate(-2deg);
                }
                50% { 
                    transform: translate3d(var(--santa-x2, -8px), -20px, 0) scale(1.06) rotate(2deg);
                }
                75% { 
                    transform: translate3d(var(--santa-x3, 12px), -15px, 0) scale(1.03) rotate(-1deg);
                }
            }
            @keyframes twinkle {
                0%, 100% { 
                    opacity: 0.65;
                    transform: scale3d(1, 1, 1);
                }
                50% { 
                    opacity: 0.95;
                    transform: scale3d(1.1, 1.1, 1);
                }
            }
            #christmas-decorations {
                backface-visibility: hidden;
                perspective: 1000px;
            }
            #christmas-decorations > div {
                backface-visibility: hidden;
                transform: translateZ(0);
            }
        `;
        document.head.appendChild(style);
        
        const santas = document.querySelectorAll('#christmas-decorations > div[data-end-x]');
        santas.forEach((santa) => {
            const endX = parseFloat(santa.getAttribute('data-end-x'));
            const startX = parseFloat(santa.style.left.replace('%', ''));
            const diff = endX - startX;
            const x1 = diff * 0.25;
            const x2 = diff * 0.5;
            const x3 = diff * 0.75;
            santa.style.setProperty('--santa-x1', `${x1}%`);
            santa.style.setProperty('--santa-x2', `${x2}%`);
            santa.style.setProperty('--santa-x3', `${x3}%`);
        });
        
        const snowflakes = document.querySelectorAll('#christmas-decorations > div:not([data-end-x])');
        snowflakes.forEach(snowflake => {
            const x = -50 + Math.random() * 100;
            snowflake.style.setProperty('--snow-x', `${x}px`);
        });
    },

    removeThemeEffects() {
        const halloween = document.getElementById('halloween-decorations');
        const christmas = document.getElementById('christmas-decorations');
        const halloweenAnim = document.getElementById('halloween-animations');
        const christmasAnim = document.getElementById('christmas-animations');
        
        if (halloween) halloween.remove();
        if (christmas) christmas.remove();
        if (halloweenAnim) halloweenAnim.remove();
        if (christmasAnim) christmasAnim.remove();
    },

    async init() {
        this.removeThemeEffects();
        
        const cachedTheme = localStorage.getItem('orpi_theme') || 'default';
        this.applyTheme(cachedTheme);
        THEME_CONFIG.activeTheme = cachedTheme;
        
        try {
            await this.waitForFirebase();
        } catch (error) {
            console.warn('Firebase non disponible, utilisation du thème en cache');
            return;
        }
        
        if (typeof getActiveTheme === 'function') {
            try {
                const activeTheme = await getActiveTheme();
                
                if (activeTheme !== cachedTheme) {
                    localStorage.setItem('orpi_theme', activeTheme);
                    this.removeThemeEffects();
                    THEME_CONFIG.activeTheme = activeTheme;
                    this.applyTheme(activeTheme);
                }
                
                if (typeof listenToThemeChanges === 'function') {
                    try {
                        listenToThemeChanges((newTheme) => {
                            if (newTheme !== THEME_CONFIG.activeTheme) {
                                localStorage.setItem('orpi_theme', newTheme);
                                this.removeThemeEffects();
                                THEME_CONFIG.activeTheme = newTheme;
                                this.applyTheme(newTheme);
                            }
                        });
                    } catch (error) {
                    }
                }
            } catch (error) {
            }
        } else {
            this.applyTheme('default');
        }
    },

    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; 
            
            const checkFirebase = () => {
                attempts++;
                
                if (attempts > maxAttempts) {
                    reject(new Error('Timeout: Firebase n\'a pas pu être initialisé'));
                    return;
                }
                
                try {
                    if (typeof firebase === 'undefined' || !firebase.firestore) {
                        setTimeout(checkFirebase, 100);
                        return;
                    }
                    if (!firebase.apps || firebase.apps.length === 0) {
                        setTimeout(checkFirebase, 100);
                        return;
                    }
                    try {
                        const firestore = firebase.firestore();
                        if (firestore) {
                            resolve();
                        } else {
                            setTimeout(checkFirebase, 100);
                        }
                    } catch (firestoreError) {
                        setTimeout(checkFirebase, 100);
                    }
                } catch (error) {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }
};
}

const themeManager = window.themeManager;

const cachedTheme = localStorage.getItem('orpi_theme') || 'default';
const theme = themeManager.themes[cachedTheme] || themeManager.themes.default;
const root = document.documentElement;
root.style.setProperty('--primary-color', theme.primaryColor);
root.style.setProperty('--secondary-color', theme.secondaryColor);
root.style.setProperty('--light-bg', theme.lightBg);
root.style.setProperty('--text-color', theme.textColor);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => themeManager.init());
} else {
    themeManager.init();
}

