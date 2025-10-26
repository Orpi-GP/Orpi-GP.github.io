class ToastNotification {
    constructor() {
        this.container = null;
        this.init();
    }
    init() {
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }
    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
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
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        this.container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-show');
        }, 10);
        setTimeout(() => {
            toast.classList.remove('toast-show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
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
const toast = new ToastNotification();
