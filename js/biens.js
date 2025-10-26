let tousLesBiens = [];
let biensFiltres = [];

async function chargerBiens() {
    tousLesBiens = await propertyManager.getAll();
    biensFiltres = tousLesBiens;
    afficherBiens(biensFiltres);
    mettreAJourCompteurBiens();
}

function configurerEcouteTempsReel() {
    propertyManager.onSnapshot(biens => {
        tousLesBiens = biens;
        filtrerBiens();
    });
}

function afficherBiens(biens) {
    const grille = document.getElementById('propertiesGrid');
    const aucunBien = document.getElementById('noProperties');

    if (biens.length === 0) {
        grille.style.display = 'none';
        aucunBien.style.display = 'block';
        return;
    }

    grille.style.display = 'grid';
    aucunBien.style.display = 'none';
    grille.innerHTML = '';

    biens.forEach(bien => {
        const carte = creerCarteBien(bien);
        grille.appendChild(carte);
    });
}

function creerCarteBien(bien) {
    const carte = document.createElement('div');
    carte.className = 'property-card';
    carte.onclick = () => voirBien(bien.id);

    const detailsHTML = [];
    if (bien.rooms) {
        detailsHTML.push(`
            <div class="property-detail">
                <i class="fas fa-bed"></i>
                <span>${bien.rooms} pièces</span>
            </div>
        `);
    }
    if (bien.area) {
        detailsHTML.push(`
            <div class="property-detail">
                <i class="fas fa-ruler-combined"></i>
                <span>${bien.area} m²</span>
            </div>
        `);
    }

    const premiereImage = bien.images ? bien.images[0] : bien.image;
    const nombreImages = bien.images ? bien.images.length : 1;
    const statut = bien.status || 'Disponible';
    
    let couleurBadge = '#28a745';
    if (statut === 'Réservé') couleurBadge = '#ffc107';
    else if (statut === 'Vendu') couleurBadge = '#dc3545';
    else if (statut === 'En négociation') couleurBadge = '#17a2b8';

    carte.innerHTML = `
        <div style="position: relative;">
            <img src="${premiereImage}" alt="${bien.title}" class="property-image">
            <div class="property-badge">${bien.type}</div>
            <div style="position: absolute; top: 10px; left: 10px; background: ${couleurBadge}; color: white; padding: 0.5rem 1rem; border-radius: 5px; font-weight: 600; font-size: 0.9rem;">
                ${statut}
            </div>
            ${nombreImages > 1 ? `<div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 0.5rem; border-radius: 5px; font-size: 0.9rem;">
                <i class="fas fa-images"></i> ${nombreImages}
            </div>` : ''}
        </div>
        <div class="property-content">
            <div class="property-type">${bien.type}</div>
            <h3 class="property-title">${bien.title}</h3>
            <div class="property-location">
                <i class="fas fa-map-marker-alt"></i>
                <span>${bien.location}</span>
            </div>
            ${detailsHTML.length > 0 ? `<div class="property-details">${detailsHTML.join('')}</div>` : ''}
            <div class="property-price">${formatPrice(bien.price)}</div>
            <div class="property-footer">
                <button class="property-btn btn-view" onclick="event.stopPropagation(); voirBien('${bien.id}')">
                    <i class="fas fa-eye"></i> Voir
                </button>
                <button class="property-btn btn-contact" onclick="event.stopPropagation(); contacterAgence()">
                    <i class="fas fa-envelope"></i> Contact
                </button>
            </div>
        </div>
    `;

    return carte;
}

let slideActuel = 0;
let bienActuel = null;

async function voirBien(id) {
    const bien = await propertyManager.getById(id);
    if (!bien) return;

    bienActuel = bien;
    slideActuel = 0;

    const statut = bien.status || 'Disponible';
    let couleurBadgeStatut = '#28a745';
    if (statut === 'Réservé') couleurBadgeStatut = '#ffc107';
    else if (statut === 'Vendu') couleurBadgeStatut = '#dc3545';
    else if (statut === 'En négociation') couleurBadgeStatut = '#17a2b8';
    
    document.getElementById('modalType').innerHTML = `
        ${bien.type}
        ${statut !== 'Disponible' ? `<span style="display: inline-block; margin-left: 1rem; padding: 0.25rem 0.75rem; background: ${couleurBadgeStatut}; color: white; border-radius: 15px; font-size: 0.8rem; font-weight: 600;">${statut}</span>` : ''}
    `;
    document.getElementById('modalTitle').textContent = bien.title;
    document.getElementById('modalLocation').textContent = bien.location;
    document.getElementById('modalPrice').textContent = formatPrice(bien.price);
    document.getElementById('modalDescription').innerHTML = bien.description;

    const conteneurDetails = document.getElementById('modalDetails');
    conteneurDetails.innerHTML = '';
    
    if (bien.rooms) {
        conteneurDetails.innerHTML += `
            <div class="property-modal-detail">
                <i class="fas fa-bed"></i>
                <strong>${bien.rooms} pièces</strong>
            </div>
        `;
    }
    if (bien.area) {
        conteneurDetails.innerHTML += `
            <div class="property-modal-detail">
                <i class="fas fa-ruler-combined"></i>
                <strong>${bien.area} m²</strong>
            </div>
        `;
    }
    conteneurDetails.innerHTML += `
        <div class="property-modal-detail">
            <i class="fas fa-map-marker-alt"></i>
            <strong>${bien.location}</strong>
        </div>
    `;

    chargerCarrousel(bien.images || [bien.image]);

    document.getElementById('propertyModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function chargerCarrousel(images) {
    const conteneurImages = document.getElementById('carouselImages');
    const conteneurIndicateurs = document.getElementById('carouselIndicators');
    
    conteneurImages.innerHTML = '';
    conteneurIndicateurs.innerHTML = '';

    images.forEach((image, index) => {
        const img = document.createElement('img');
        img.src = image;
        img.alt = `Image ${index + 1}`;
        conteneurImages.appendChild(img);

        const indicateur = document.createElement('button');
        indicateur.className = `carousel-indicator ${index === 0 ? 'active' : ''}`;
        indicateur.onclick = () => allerAuSlide(index);
        conteneurIndicateurs.appendChild(indicateur);
    });

    const btnPrecedent = document.querySelector('.carousel-btn-prev');
    const btnSuivant = document.querySelector('.carousel-btn-next');
    if (images.length <= 1) {
        btnPrecedent.style.display = 'none';
        btnSuivant.style.display = 'none';
    } else {
        btnPrecedent.style.display = 'flex';
        btnSuivant.style.display = 'flex';
    }
}

function changeSlide(direction) {
    if (!bienActuel) return;
    const images = bienActuel.images || [bienActuel.image];
    slideActuel += direction;

    if (slideActuel < 0) slideActuel = images.length - 1;
    if (slideActuel >= images.length) slideActuel = 0;

    mettreAJourCarrousel();
}

function allerAuSlide(index) {
    slideActuel = index;
    mettreAJourCarrousel();
}

function mettreAJourCarrousel() {
    const conteneurImages = document.getElementById('carouselImages');
    const indicateurs = document.querySelectorAll('.carousel-indicator');

    conteneurImages.style.transform = `translateX(-${slideActuel * 100}%)`;

    indicateurs.forEach((indicateur, index) => {
        indicateur.classList.toggle('active', index === slideActuel);
    });
}

function closePropertyModal() {
    document.getElementById('propertyModal').classList.remove('active');
    document.body.style.overflow = '';
    bienActuel = null;
    slideActuel = 0;
}

document.getElementById('propertyModal').addEventListener('click', (e) => {
    if (e.target.id === 'propertyModal') {
        closePropertyModal();
    }
});

function filtrerBiens() {
    const filtreType = document.getElementById('filterType').value;
    const filtrePrixMax = document.getElementById('filterPriceMax').value;
    const filtreRecherche = document.getElementById('filterSearch').value.toLowerCase();

    biensFiltres = tousLesBiens.filter(bien => {
        if (filtreType && bien.type !== filtreType) return false;

        if (filtrePrixMax && bien.price > parseInt(filtrePrixMax)) return false;

        if (filtreRecherche) {
            const rechercherDans = `${bien.title} ${bien.type} ${bien.location} ${bien.description}`.toLowerCase();
            if (!rechercherDans.includes(filtreRecherche)) return false;
        }

        return true;
    });

    afficherBiens(biensFiltres);
    mettreAJourCompteurBiens();
}

function mettreAJourCompteurBiens() {
    document.getElementById('propertiesCount').textContent = biensFiltres.length;
}

function contacterAgence() {
    window.location.href = 'contact.html';
}

window.contacterAgence = contacterAgence;

document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    chargerBiens();
    configurerEcouteTempsReel();
});

