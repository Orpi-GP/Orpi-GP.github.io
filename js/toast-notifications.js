class ToastNotification {
    constructor() {
        this.container = null;
        this.queue = [];
        this.initPromise = this.init();
    }
    
    async init() {
        return new Promise((resolve) => {
            const tryInit = () => {
                if (document.body) {
                    if (!document.getElementById('toast-container')) {
                        this.container = document.createElement('div');
                        this.container.id = 'toast-container';
                        this.container.className = 'toast-container';
                        document.body.appendChild(this.container);
                    } else {
                        this.container = document.getElementById('toast-container');
                    }
                    this.processQueue();
                    resolve();
                } else {
                    setTimeout(tryInit, 50);
                }
            };
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', tryInit);
            } else {
                tryInit();
            }
        });
    }
    
    processQueue() {
        while (this.queue.length > 0) {
            const item = this.queue.shift();
            this.showNow(item.message, item.type, item.duration);
        }
    }
    
    show(message, type = 'info', duration = 3000) {
        if (!this.container) {
            this.queue.push({ message, type, duration });
            return;
        }
        this.showNow(message, type, duration);
    }
    
    showNow(message, type = 'info', duration = 3000) {
        if (!this.container) return;
        
        const toastElement = document.createElement('div');
        toastElement.className = `toast toast-${type}`;
        let icon = '';
        switch(type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-times-circle"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            case 'info':
                icon = '<i class="fas fa-info-circle"></i>';
                break;
        }
        toastElement.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        this.container.appendChild(toastElement);
        setTimeout(() => {
            toastElement.classList.add('toast-show');
        }, 10);
        setTimeout(() => {
            toastElement.classList.remove('toast-show');
            setTimeout(() => {
                if (toastElement.parentElement) {
                    toastElement.remove();
                }
            }, 300);
        }, duration);
    }
    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }
    error(message, duration = 4000) {
        this.show(message, 'error', duration);
    }
    warning(message, duration = 3500) {
        this.show(message, 'warning', duration);
    }
    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }
}

window.toast = new ToastNotification();
