const TUTORIAL_VERSION = '1.0';
const TUTORIAL_STORAGE_KEY = 'orpi_tutorial_completed';

const tutorialSteps = [
    {
        target: '.hero-content',
        title: 'Bienvenue sur ORPI Paris ! 🏠',
        description: 'Bienvenue dans votre agence immobilière en ligne. Ce tutoriel va vous guider à travers les principales fonctionnalités du site.',
        position: 'bottom',
        highlight: true
    },
    {
        target: '.nav-menu',
        title: 'Navigation principale',
        description: 'Utilisez ce menu pour naviguer entre les différentes sections : Biens, Services (estimation, rendez-vous, avis), et Contact.',
        position: 'bottom',
        highlight: true
    },
    {
        target: '#loginBtn',
        title: 'Connexion Discord',
        description: 'Connectez-vous avec Discord pour accéder à des fonctionnalités exclusives : demander des rendez-vous, consulter vos conversations, et laisser des avis.',
        position: 'left',
        highlight: true
    },
    {
        target: '.nav-dropdown:first-of-type',
        title: 'Menu Biens',
        description: 'Survolez ce menu pour accéder aux biens immobiliers, aux enchères en cours, et aux intérieurs disponibles.',
        position: 'bottom',
        highlight: true
    },
    {
        target: '.nav-dropdown:nth-of-type(2)',
        title: 'Menu Services',
        description: 'Accédez à nos services : estimation gratuite, prise de rendez-vous, avis clients, et vos conversations privées.',
        position: 'bottom',
        highlight: true
    },
    {
        target: '.hero-buttons',
        title: 'Actions rapides',
        description: 'Découvrez rapidement nos biens disponibles ou obtenez une estimation gratuite de votre propriété.',
        position: 'top',
        highlight: true
    },
    {
        target: '.stats',
        title: 'Nos performances',
        description: 'Consultez nos statistiques : nombre de biens disponibles, clients satisfaits, et années d\'expérience.',
        position: 'top',
        highlight: true
    },
    {
        target: 'a[href="contact.html"]',
        title: 'Nous contacter 📧',
        description: 'Besoin d\'aide ou d\'informations ? Contactez-nous directement via notre formulaire de contact.',
        position: 'bottom',
        highlight: true
    },
    {
        target: '.footer',
        title: 'C\'est terminé ! 🎉',
        description: 'Vous connaissez maintenant les principales fonctionnalités du site ORPI Paris. Explorez les menus "Biens" et "Services" pour découvrir toutes nos offres : rendez-vous, avis clients, enchères, et bien plus !',
        position: 'top',
        highlight: false
    }
];

class Tutorial {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.overlay = null;
        this.tooltip = null;
        this.highlightBox = null;
    }

    shouldShow() {
        const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY);
        return completed !== TUTORIAL_VERSION;
    }

    start() {
        if (!this.shouldShow()) {
            return;
        }
        
        this.isActive = true;
        this.currentStep = 0;
        this.createElements();
        this.showStep(0);
    }

    createElements() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        this.overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.7) !important;
            z-index: 999998 !important;
            pointer-events: none !important;
            display: block !important;
        `;

        this.highlightBox = document.createElement('div');
        this.highlightBox.className = 'tutorial-highlight';
        this.highlightBox.style.cssText = `
            position: fixed !important;
            border: 3px solid #E30613 !important;
            border-radius: 8px !important;
            z-index: 999999 !important;
            pointer-events: none !important;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7) !important;
            transition: all 0.3s ease !important;
            display: block !important;
        `;

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tutorial-tooltip';
        this.tooltip.style.cssText = `
            position: fixed !important;
            background: white !important;
            border-radius: 12px !important;
            padding: 1.5rem !important;
            max-width: 400px !important;
            z-index: 1000000 !important;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
            animation: tutorialFadeIn 0.3s ease !important;
            display: block !important;
        `;

        document.body.appendChild(this.overlay);
        document.body.appendChild(this.highlightBox);
        document.body.appendChild(this.tooltip);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes tutorialFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes tutorialPulse {
                0%, 100% {
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 0 0 rgba(227, 6, 19, 0.7);
                }
                50% {
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px 10px rgba(227, 6, 19, 0.4);
                }
            }

            .tutorial-highlight {
                animation: tutorialPulse 2s infinite;
            }

            @media (max-width: 768px) {
                .tutorial-tooltip {
                    max-width: calc(100vw - 2rem) !important;
                    left: 1rem !important;
                    right: 1rem !important;
                    transform: none !important;
                    bottom: 1rem !important;
                    top: auto !important;
                }

                .tutorial-highlight {
                    border-width: 2px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= tutorialSteps.length) {
            this.complete();
            return;
        }

        this.currentStep = stepIndex;
        const step = tutorialSteps[stepIndex];
        const targetElement = document.querySelector(step.target);

        if (!targetElement || (step.optional && getComputedStyle(targetElement).display === 'none')) {
            if (stepIndex < tutorialSteps.length - 1) {
                this.next();
            } else {
                this.complete();
            }
            return;
        }

        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        
        setTimeout(() => {
            const rect = targetElement.getBoundingClientRect();

            if (step.highlight) {
                this.highlightBox.style.top = `${rect.top - 8}px`;
                this.highlightBox.style.left = `${rect.left - 8}px`;
                this.highlightBox.style.width = `${rect.width + 16}px`;
                this.highlightBox.style.height = `${rect.height + 16}px`;
                this.highlightBox.style.display = 'block';
            } else {
                this.highlightBox.style.display = 'none';
            }

            this.positionTooltip(rect, step.position);
            this.updateTooltipContent(step, stepIndex);
        }, 500);
    }

    positionTooltip(rect, position) {
        const padding = 20;
        
        this.tooltip.style.top = '';
        this.tooltip.style.bottom = '';
        this.tooltip.style.left = '';
        this.tooltip.style.right = '';
        this.tooltip.style.transform = '';
        
        const tooltipWidth = 400;
        const tooltipHeight = 300;
        
        let finalPosition = position;
        
        if (position === 'bottom' && rect.bottom + padding + tooltipHeight > window.innerHeight) {
            finalPosition = 'top';
        }
        
        if (position === 'top' && rect.top - padding - tooltipHeight < 0) {
            finalPosition = 'bottom';
        }
        
        if (position === 'left' && rect.left - padding - tooltipWidth < 0) {
            finalPosition = 'bottom';
        }
        
        if (position === 'right' && rect.right + padding + tooltipWidth > window.innerWidth) {
            finalPosition = 'bottom';
        }
        
        switch (finalPosition) {
            case 'bottom':
                let bottomTop = rect.bottom + padding;
                if (bottomTop + tooltipHeight > window.innerHeight) {
                    bottomTop = window.innerHeight - tooltipHeight - padding;
                }
                this.tooltip.style.top = `${bottomTop}px`;
                
                let bottomLeft = rect.left + rect.width / 2;
                if (bottomLeft + tooltipWidth / 2 > window.innerWidth - padding) {
                    this.tooltip.style.right = `${padding}px`;
                    this.tooltip.style.left = 'auto';
                    this.tooltip.style.transform = '';
                } else if (bottomLeft - tooltipWidth / 2 < padding) {
                    this.tooltip.style.left = `${padding}px`;
                    this.tooltip.style.transform = '';
                } else {
                    this.tooltip.style.left = `${bottomLeft}px`;
                    this.tooltip.style.transform = 'translateX(-50%)';
                }
                break;
                
            case 'top':
                this.tooltip.style.bottom = `${window.innerHeight - rect.top + padding}px`;
                let topLeft = rect.left + rect.width / 2;
                if (topLeft + tooltipWidth / 2 > window.innerWidth - padding) {
                    this.tooltip.style.right = `${padding}px`;
                    this.tooltip.style.left = 'auto';
                    this.tooltip.style.transform = '';
                } else if (topLeft - tooltipWidth / 2 < padding) {
                    this.tooltip.style.left = `${padding}px`;
                    this.tooltip.style.transform = '';
                } else {
                    this.tooltip.style.left = `${topLeft}px`;
                    this.tooltip.style.transform = 'translateX(-50%)';
                }
                break;
                
            case 'left':
                this.tooltip.style.top = `${Math.max(padding, rect.top + rect.height / 2 - tooltipHeight / 2)}px`;
                this.tooltip.style.right = `${window.innerWidth - rect.left + padding}px`;
                break;
                
            case 'right':
                this.tooltip.style.top = `${Math.max(padding, rect.top + rect.height / 2 - tooltipHeight / 2)}px`;
                this.tooltip.style.left = `${rect.right + padding}px`;
                break;
        }
    }

    updateTooltipContent(step, stepIndex) {
        const progress = Math.round(((stepIndex + 1) / tutorialSteps.length) * 100);
        
        this.tooltip.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="color: #E30613; font-weight: 700; font-size: 0.9rem;">
                        Étape ${stepIndex + 1}/${tutorialSteps.length}
                    </span>
                    <button onclick="tutorial.skip()" style="background: none; border: none; color: #999; cursor: pointer; font-size: 1.2rem; padding: 0; width: 24px; height: 24px;">
                        ×
                    </button>
                </div>
                <div style="background: #f0f0f0; height: 4px; border-radius: 2px; overflow: hidden;">
                    <div style="background: #E30613; height: 100%; width: ${progress}%; transition: width 0.3s;"></div>
                </div>
            </div>
            
            <h3 style="color: #1a1a1a; font-size: 1.3rem; margin-bottom: 0.75rem; font-weight: 700;">
                ${step.title}
            </h3>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 1.5rem;">
                ${step.description}
            </p>
            
            <div style="display: flex; gap: 0.75rem; justify-content: space-between;">
                ${stepIndex > 0 ? `
                    <button onclick="tutorial.previous()" style="background: #6c757d; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s; flex: 1;">
                        <i class="fas fa-arrow-left"></i> Précédent
                    </button>
                ` : '<div style="flex: 1;"></div>'}
                
                ${stepIndex < tutorialSteps.length - 1 ? `
                    <button onclick="tutorial.next()" style="background: #E30613; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s; flex: 1;">
                        Suivant <i class="fas fa-arrow-right"></i>
                    </button>
                ` : `
                    <button onclick="tutorial.complete()" style="background: #28a745; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s; flex: 1;">
                        <i class="fas fa-check"></i> Terminer
                    </button>
                `}
            </div>
            
            <div style="text-align: center; margin-top: 1rem;">
                <button onclick="tutorial.skip()" style="background: none; border: none; color: #999; cursor: pointer; font-size: 0.9rem; text-decoration: underline;">
                    Passer le tutoriel
                </button>
            </div>
        `;
    }

    next() {
        this.showStep(this.currentStep + 1);
    }

    previous() {
        this.showStep(this.currentStep - 1);
    }

    skip() {
        if (confirm('Voulez-vous vraiment passer le tutoriel ? Vous pourrez toujours le relancer depuis les paramètres.')) {
            this.complete();
        }
    }

    complete() {
        localStorage.setItem(TUTORIAL_STORAGE_KEY, TUTORIAL_VERSION);
        this.cleanup();
    }

    cleanup() {
        this.isActive = false;
        
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this.highlightBox) {
            this.highlightBox.remove();
            this.highlightBox = null;
        }
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
    }

    reset() {
        localStorage.removeItem(TUTORIAL_STORAGE_KEY);
        window.location.reload();
    }
}

const tutorial = new Tutorial();

window.tutorial = tutorial;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        tutorial.start();
    }, 1500);
});

