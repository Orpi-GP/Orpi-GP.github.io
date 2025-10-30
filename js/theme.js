const themeManager = {
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
            primaryColor: '#DC2626',
            secondaryColor: '#166534',
            accentColor: '#F59E0B',
            lightBg: '#FEF3C7',
            textColor: '#1F2937',
            heroOverlay: 'linear-gradient(135deg, rgba(220, 38, 38, 0.75), rgba(22, 101, 52, 0.7))',
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
        container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; overflow: hidden;';
        
        for (let i = 0; i < 60; i++) {
            const snowflake = document.createElement('div');
            const size = 0.3 + Math.random() * 0.8;
            const isEmoji = Math.random() > 0.7;
            
            snowflake.innerHTML = isEmoji ? '❄️' : '•';
            snowflake.style.cssText = `
                position: absolute;
                font-size: ${size}rem;
                color: ${isEmoji ? 'inherit' : 'white'};
                text-shadow: 0 0 ${size * 10}px rgba(255, 255, 255, 0.8);
                opacity: ${0.4 + Math.random() * 0.6};
                left: ${Math.random() * 100}%;
                top: -50px;
                animation: fallSnowSmooth ${15 + Math.random() * 25}s linear infinite;
                animation-delay: ${Math.random() * 10}s;
            `;
            container.appendChild(snowflake);
        }
        
        const lights = ['🔴', '🟢', '🟡', '🔵'];
        const lightPositions = [
            { top: '10%', left: '10%' },
            { top: '8%', left: '30%' },
            { top: '12%', left: '50%' },
            { top: '9%', left: '70%' },
            { top: '11%', left: '90%' }
        ];
        
        lightPositions.forEach((pos, i) => {
            const light = document.createElement('div');
            light.innerHTML = lights[i % lights.length];
            light.style.cssText = `
                position: absolute;
                font-size: 1.2rem;
                opacity: 0.7;
                filter: drop-shadow(0 0 8px currentColor);
                animation: twinkle ${1.5 + (i % 3) * 0.5}s ease-in-out infinite;
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
                    transform: translateY(0) translateX(0) rotate(0deg);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                90% {
                    opacity: 1;
                }
                100% { 
                    transform: translateY(100vh) translateX(${-100 + Math.random() * 200}px) rotate(360deg);
                    opacity: 0;
                }
            }
            @keyframes twinkle {
                0%, 100% { 
                    opacity: 0.7;
                    transform: scale(1);
                }
                50% { 
                    opacity: 1;
                    transform: scale(1.2);
                }
            }
        `;
        document.head.appendChild(style);
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
        
        if (typeof getActiveTheme === 'function') {
            const activeTheme = await getActiveTheme();
            
            if (activeTheme !== cachedTheme) {
                localStorage.setItem('orpi_theme', activeTheme);
                this.removeThemeEffects();
                THEME_CONFIG.activeTheme = activeTheme;
                this.applyTheme(activeTheme);
            }
            
            if (typeof listenToThemeChanges === 'function') {
                listenToThemeChanges((newTheme) => {
                    if (newTheme !== THEME_CONFIG.activeTheme) {
                        localStorage.setItem('orpi_theme', newTheme);
                        this.removeThemeEffects();
                        THEME_CONFIG.activeTheme = newTheme;
                        this.applyTheme(newTheme);
                    }
                });
            }
        } else {
            this.applyTheme('default');
        }
    }
};

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

