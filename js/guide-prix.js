document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const utilisateur = discordAuth.getUser();
        const estAutorise = utilisateur && discordAuth.isAuthorized();
        const contenuGuidePrix = document.getElementById('guidePrixContent');
        const messageAccesRefuse = document.getElementById('accessDenied');
        if (estAutorise) {
            contenuGuidePrix.style.display = 'block';
            messageAccesRefuse.style.display = 'none';
        } else {
            contenuGuidePrix.style.display = 'none';
            messageAccesRefuse.style.display = 'block';
        }
    }, 500);
});
