let tousLesBiens = [];
let biensFiltres = [];

async function chargerBiens() {
    const cached = ORPI_CACHE.get('biens_cache');
    
    if (cached) {
        tousLesBiens = cached;
        biensFiltres = cached;
        afficherBiens(biensFiltres);
        mettreAJourCompteurBiens();
        
        setTimeout(async () => {
            const biens = await propertyManager.getAll();
            if (JSON.stringify(biens) !== JSON.stringify(cached)) {
                tousLesBiens = biens;
                biensFiltres = biens;
                ORPI_CACHE.set('biens_cache', biens);
                afficherBiens(biensFiltres);
                mettreAJourCompteurBiens();
            }
        }, 100);
    } else {
        tousLesBiens = await propertyManager.getAll();
        biensFiltres = tousLesBiens;
        ORPI_CACHE.set('biens_cache', tousLesBiens);
        afficherBiens(biensFiltres);
        mettreAJourCompteurBiens();
    }
}

function configurerEcouteTempsReel() {
    propertyManager.onSnapshot(biens => {
        tousLesBiens = biens;
        ORPI_CACHE.set('biens_cache', biens);
        filtrerBiens();
    });
}

function afficherBiens(biens) {
    const grille = document.getElementById('propertiesGrid');
    const aucunBien = document.getElementById('noProperties');
    const chargement = document.getElementById('propertiesLoading');

    if (chargement) chargement.style.display = 'none';

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

    const premiereImage = bien.images ? bien.images[0] : bien.image;
    const nombreImages = bien.images ? bien.images.length : 1;
    const statut = bien.status || 'VENTE';
    const prixM2 = bien.area ? Math.round(bien.price / bien.area) : 0;
    
    const estExclusif = bien.exclusive || false;
    
    const favoris = JSON.parse(localStorage.getItem('favorites') || '[]');
    const estFavori = favoris.includes(bien.id);
    
    carte.innerHTML = `
        <div class="property-image-container">
            <img src="${premiereImage}" alt="${bien.title}" class="property-image" loading="lazy">
            <div class="property-image-overlay">
                <img src="images/logo-orpi-mandelieu.png" alt="ORPI" loading="lazy">
            </div>
            
            ${estExclusif ? '<div class="property-exclusive-badge">EXCLUSIVITÉ</div>' : ''}
            
            <button class="property-favorite-btn ${estFavori ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${bien.id}', this)">
                <i class="fas fa-heart"></i>
            </button>
            
            <div class="property-view-more">
                <i class="fas fa-eye"></i>
                <span>Voir plus</span>
            </div>
            
            <div class="property-price-container">
                <div>
                    <div class="property-price">${formatPrice(bien.price)}</div>
                    ${prixM2 > 0 ? `<div class="property-price-detail">Soit ${formatPrice(prixM2)}/m²</div>` : ''}
                </div>
                <div class="property-status-badge">${statut}</div>
            </div>
        </div>
        
        <div class="property-content">
            <div class="property-info">
                <div class="property-type-text">
                    Achat ${bien.type} 
                    ${bien.rooms ? `<strong>${bien.rooms} pièces</strong>` : ''} 
                    ${bien.area ? `<strong>${bien.area} m²</strong>` : ''}
                </div>
                <div class="property-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${bien.location}</span>
                </div>
            </div>
            
            <button class="property-contact-btn" onclick="event.stopPropagation(); contacterAgence()">
                <i class="fas fa-envelope"></i>
            </button>
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

function toggleFavorite(bienId, bouton) {
    let favoris = JSON.parse(localStorage.getItem('favorites') || '[]');
    const index = favoris.indexOf(bienId);
    
    if (index === -1) {
        favoris.push(bienId);
        bouton.classList.add('active');
    } else {
        favoris.splice(index, 1);
        bouton.classList.remove('active');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favoris));
}

window.contacterAgence = contacterAgence;
window.toggleFavorite = toggleFavorite;

document.addEventListener('DOMContentLoaded', () => {
    const initBiens = () => {
        if (typeof propertyManager === 'undefined' || typeof ORPI_CACHE === 'undefined') {
            setTimeout(initBiens, 100);
            return;
        }
        updateUI();
        chargerBiens();
        configurerEcouteTempsReel();
    };
    initBiens();
});

