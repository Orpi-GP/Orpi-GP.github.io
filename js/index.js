if (discordAuth.isLoggedIn() && discordAuth.isAuthorized()) {
    const boutonNotifications = document.getElementById('notificationsBtn');
    const badgeNotifications = document.getElementById('notificationsBadge');
    
    if (boutonNotifications && typeof NotificationsManager !== 'undefined') {
        boutonNotifications.style.display = 'flex';
        
        NotificationsManager.onSnapshot(notifications => {
            const nombreNonLues = notifications.filter(n => !n.read).length;
            if (nombreNonLues > 0) {
                badgeNotifications.textContent = nombreNonLues;
                badgeNotifications.style.display = 'flex';
            } else {
                badgeNotifications.style.display = 'none';
            }
        });
    }
}

async function loadFeaturedProperties() {
    try {
        if (typeof propertyManager === 'undefined') {
            return;
        }
        
        const allProperties = await propertyManager.getAll();
        const featuredProperties = allProperties.filter(p => p.featured === true).slice(0, 3);
        
        const grid = document.getElementById('featuredPropertiesGrid');
        const noFeatured = document.getElementById('noFeaturedProperties');
        
        if (!grid || !noFeatured) {
            return;
        }
        
        if (featuredProperties.length === 0) {
            grid.style.display = 'none';
            noFeatured.style.display = 'block';
            return;
        }
        
        grid.style.display = 'grid';
        noFeatured.style.display = 'none';
        grid.innerHTML = '';
        
        featuredProperties.forEach(property => {
            const card = createPropertyCard(property);
            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function createPropertyCard(property) {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.style.cursor = 'pointer';
    card.onclick = () => window.location.href = `biens.html`;
    
    const firstImage = property.images ? property.images[0] : property.image;
    const statusColors = {
        'Disponible': '#28a745',
        'Réservé': '#ffc107',
        'Vendu': '#dc3545',
        'En négociation': '#17a2b8'
    };
    const statusColor = statusColors[property.status] || '#28a745';
    
    card.innerHTML = `
        <div style="position: relative;">
            <img src="${firstImage}" alt="${property.title}" style="width: 100%; height: 250px; object-fit: cover;">
            <div style="position: absolute; top: 10px; right: 10px; background: var(--primary-color); color: white; padding: 0.5rem 1rem; border-radius: 5px; font-weight: 600; font-size: 0.9rem;">
                ${property.type}
            </div>
            <div style="position: absolute; top: 10px; left: 10px; background: ${statusColor}; color: white; padding: 0.5rem 1rem; border-radius: 5px; font-weight: 600; font-size: 0.9rem;">
                ${property.status || 'Disponible'}
            </div>
            <div style="position: absolute; top: 50px; right: 10px; background: #ffd700; color: #333; padding: 0.5rem 1rem; border-radius: 5px; font-weight: 700; font-size: 0.85rem; box-shadow: 0 2px 10px rgba(255,215,0,0.5);">
                <i class="fas fa-star"></i> À la Une
            </div>
        </div>
        <div style="padding: 1.5rem;">
            <h3 style="font-size: 1.3rem; font-weight: 700; color: var(--secondary-color); margin-bottom: 0.5rem;">${property.title}</h3>
            <div style="color: var(--text-color); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-map-marker-alt" style="color: var(--primary-color);"></i>
                <span>${property.location}</span>
            </div>
            ${property.rooms || property.area ? `
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem; padding-top: 1rem; border-top: 1px solid var(--light-bg);">
                ${property.rooms ? `<div style="display: flex; align-items: center; gap: 0.5rem;"><i class="fas fa-bed" style="color: var(--primary-color);"></i><span>${property.rooms} pièces</span></div>` : ''}
                ${property.area ? `<div style="display: flex; align-items: center; gap: 0.5rem;"><i class="fas fa-ruler-combined" style="color: var(--primary-color);"></i><span>${property.area} m²</span></div>` : ''}
            </div>
            ` : ''}
            <div style="font-size: 1.8rem; font-weight: 700; color: var(--primary-color); margin-bottom: 1rem;">
                ${formatPrice(property.price)}
            </div>
            <button class="btn btn-primary" style="width: 100%;">Voir les détails</button>
        </div>
    `;
    
    return card;
}

function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
}

document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProperties();
});

