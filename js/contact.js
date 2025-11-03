document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    const formMessage = document.getElementById('formMessage');
    const loginRequired = document.getElementById('loginRequired');
    
    if (!discordAuth.isLoggedIn()) {
        loginRequired.style.display = 'block';
        contactForm.style.display = 'none';
    } else {
        loginRequired.style.display = 'none';
        contactForm.style.display = 'block';
        
        const user = discordAuth.getUser();
        document.getElementById('connectedUser').textContent = discordAuth.getUsername(user);
    }
    
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');
            if (!discordAuth.isLoggedIn()) {
                showMessage('Vous devez être connecté pour envoyer une demande.', 'error');
                return;
            }
            
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            
            const user = discordAuth.getUser();
            const formData = {
                discordId: user.id,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                message: document.getElementById('message').value || 'Aucun message'
            };
            try {
                await ConversationsManager.add({
                    type: 'contact',
                    data: formData
                });
                
                try {
                    await sendDiscordNotification('contact', formData);
                } catch (webhookError) {
                    console.warn('Notification Discord non envoyée (non critique):', webhookError);
                }
                
                showMessage('Votre message a été envoyé avec succès ! Vous pouvez suivre la conversation sur la page "Mes Conversations".', 'success');
                contactForm.reset();
            } catch (error) {
                console.error('Erreur lors de l\'envoi du message:', error);
                showMessage('Une erreur est survenue lors de l\'envoi de votre message. Veuillez réessayer.', 'error');
            } finally {
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        });
    }
    function showMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = `form-message ${type}`;
        formMessage.style.display = 'block';
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 5000);
    }
});
