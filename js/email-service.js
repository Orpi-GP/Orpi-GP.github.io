const EmailService = {
    config: {
        serviceId: 'service_orpigp_2025',
        templateId: 'template_ctp75hr',
        publicKey: 'hzrjxyIxBzbbVE_f5',
        useSendGrid: false,
        productionUrl: 'https://orpi-gp.github.io'
    },

    getSiteUrl() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost')) {
            return this.config.productionUrl;
        }
        return window.location.origin;
    },

    init() {
        if (typeof emailjs === 'undefined') {
            console.warn('EmailJS non chargé. Veuillez ajouter le script EmailJS dans votre HTML.');
            return false;
        }
        
        try {
            if (!this.config.publicKey || this.config.publicKey === 'YOUR_PUBLIC_KEY') {
                console.error('Public Key non configurée ou invalide');
                return false;
            }
            emailjs.init(this.config.publicKey);
            console.log('EmailJS initialisé avec Public Key:', this.config.publicKey.substring(0, 5) + '...');
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'initialisation d\'EmailJS:', error);
            return false;
        }
    },

    async sendReplyNotification(clientEmail, messageContent, conversationType = 'contact') {
        if (!clientEmail || !messageContent) {
            console.error('Email ou message manquant');
            return false;
        }

        if (typeof emailjs === 'undefined') {
            console.warn('EmailJS non disponible. Email non envoyé.');
            return false;
        }

        if (!this.init()) {
            return false;
        }

        try {
            const plainTextMessage = messageContent
                .replace(/<[^>]*>/g, '')
                .replace(/\[([^\]]+)\]/g, '$1')
                .trim();

            const replyDate = new Date().toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const siteUrl = this.getSiteUrl();
            const templateParams = {
                to_email: clientEmail,
                message: plainTextMessage,
                conversation_type: conversationType === 'contact' ? 'demande de contact' : 'demande d\'estimation',
                reply_date: replyDate,
                site_url: siteUrl,
                unsubscribe_url: `${siteUrl}/contact.html`,
                client_name: 'Client ORPI'
            };

            const response = await emailjs.send(
                this.config.serviceId,
                this.config.templateId,
                templateParams
            );

            console.log('Email envoyé avec succès:', response);
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email via EmailJS:', error);
            console.error('Détails de l\'erreur:', error);
            return false;
        }
    },

    async sendViaFirebaseFunction(clientEmail, messageContent, conversationType) {
        try {
            if (typeof firebase === 'undefined' || !firebase.app) {
                return false;
            }
            const app = firebase.app();
            if (!app || typeof app.functions !== 'function') {
                return false;
            }
            const functions = app.functions();
            const sendEmailFunction = functions.httpsCallable('sendReplyEmail');
            
            const result = await sendEmailFunction({
                to: clientEmail,
                message: messageContent,
                type: conversationType
            });
            
            return result.data.success === true;
        } catch (error) {
            return false;
        }
    },

    async sendEmail(to, subject, htmlContent, textContent) {
        if (!this.init()) {
            return false;
        }

        try {
            const templateParams = {
                to_email: to,
                subject: subject,
                message: textContent || htmlContent.replace(/<[^>]*>/g, ''),
                html_content: htmlContent
            };

            const response = await emailjs.send(
                this.config.serviceId,
                this.config.templateId,
                templateParams
            );

            return response.status === 200;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
            return false;
        }
    }
};

if (typeof emailjs !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        EmailService.init();
    });
}
