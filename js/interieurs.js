let interieurs = [];
let currentInterieurImageIndices = {};
let categories = [];

async function loadCategories() {
    try {
        const result = await db.collection('interieurs_categories').orderBy('name', 'asc').get();
        categories = [];
        result.forEach(doc => {
            categories.push({
                id: doc.id,
                ...doc.data()
            });
        });
    } catch (error) {
        console.error("Erreur chargement catégories:", error);
    }
}

async function loadInterieurs() {
    const container = document.getElementById('interieursContainer');
    
    try {
        await loadCategories();
        const result = await getAllInterieurs();
        
        if (result.success && result.data.length > 0) {
            // Filtrer les intérieurs cachés (hidden: true)
            interieurs = result.data.filter(interieur => !interieur.hidden);
            displayInterieurs(interieurs);
        } else {
            container.innerHTML = `
                <div class="no-interieurs">
                    <i class="fas fa-couch"></i>
                    <h3>Aucun intérieur disponible</h3>
                    <p>Nous n'avons pas encore d'intérieurs à vous présenter. Revenez bientôt !</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Erreur lors du chargement des intérieurs:", error);
        container.innerHTML = `
            <div class="no-interieurs">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erreur de chargement</h3>
                <p>Impossible de charger les intérieurs. Veuillez réessayer plus tard.</p>
            </div>
        `;
    }
}

function displayInterieurs(interieurs) {
    const container = document.getElementById('interieursContainer');
    container.innerHTML = '';
    
    if (interieurs.length === 0) {
        container.innerHTML = `
            <div class="no-interieurs">
                <i class="fas fa-couch"></i>
                <h3>Aucun intérieur disponible</h3>
                <p>Nous n'avons pas encore d'intérieurs à vous présenter. Revenez bientôt !</p>
            </div>
        `;
        return;
    }

    const groupedByCategory = {};
    interieurs.forEach(interieur => {
        const catId = interieur.categorieId || 'sans-categorie';
        if (!groupedByCategory[catId]) {
            groupedByCategory[catId] = [];
        }
        groupedByCategory[catId].push(interieur);
    });
    
    Object.keys(groupedByCategory).forEach(catId => {
        const categoryInterieurs = groupedByCategory[catId];
        const category = categories.find(c => c.id === catId);
        const categoryName = category ? category.name : 'Sans catégorie';
        
        const section = document.createElement('div');
        section.className = 'category-section';
        
        const title = document.createElement('h2');
        title.className = 'category-title';
        title.innerHTML = `<i class="fas fa-folder-open"></i> ${categoryName}`;
        section.appendChild(title);
        
        const grid = document.createElement('div');
        grid.className = 'interieurs-grid';

        categoryInterieurs.forEach(interieur => {
        currentInterieurImageIndices[interieur.id] = 0;
        
        const card = document.createElement('div');
        card.className = 'interieur-card';
        card.onclick = () => openInterieurModal(interieur);

        const imagesHTML = interieur.images && interieur.images.length > 0 
            ? `
                <div class="interieur-images">
                    <img src="${interieur.images[0]}" alt="${interieur.titre}" class="interieur-image" id="img-${interieur.id}" loading="lazy">
                    ${interieur.images.length > 1 ? `
                        <button class="image-nav prev" onclick="event.stopPropagation(); changeImage('${interieur.id}', -1)">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="image-nav next" onclick="event.stopPropagation(); changeImage('${interieur.id}', 1)">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <div class="image-indicator">
                            ${interieur.images.map((_, index) => `
                                <span class="indicator-dot ${index === 0 ? 'active' : ''}" 
                                      onclick="event.stopPropagation(); setImage('${interieur.id}', ${index})"
                                      id="dot-${interieur.id}-${index}"></span>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `
            : `
                <div class="interieur-images">
                    <img src="https://via.placeholder.com/400x280?text=Aucune+image" alt="${interieur.titre}" class="interieur-image" loading="lazy">
                </div>
            `;

        const date = interieur.createdAt && interieur.createdAt.toDate 
            ? new Date(interieur.createdAt.toDate()).toLocaleDateString('fr-FR')
            : 'Date non disponible';

        card.innerHTML = `
            ${imagesHTML}
            <div class="interieur-content">
                <h3 class="interieur-title">${interieur.titre}</h3>
                <p class="interieur-description">${interieur.description}</p>
                <div class="interieur-footer">
                    <span class="interieur-date">
                        <i class="fas fa-calendar-alt"></i>
                        ${date}
                    </span>
                    <span class="btn-voir-plus">
                        Voir plus
                        <i class="fas fa-arrow-right"></i>
                    </span>
                </div>
            </div>
        `;

            grid.appendChild(card);
        });
        
        section.appendChild(grid);
        container.appendChild(section);
    });
}

function changeImage(interieurId, direction) {
    const interieur = interieurs.find(i => i.id === interieurId);
    if (!interieur || !interieur.images || interieur.images.length <= 1) return;

    const currentIndex = currentInterieurImageIndices[interieurId];
    let newIndex = currentIndex + direction;

    if (newIndex < 0) newIndex = interieur.images.length - 1;
    if (newIndex >= interieur.images.length) newIndex = 0;

    setImage(interieurId, newIndex);
}

function setImage(interieurId, index) {
    const interieur = interieurs.find(i => i.id === interieurId);
    if (!interieur || !interieur.images) return;

    const img = document.getElementById(`img-${interieurId}`);
    if (img) {
        img.src = interieur.images[index];
    }

    interieur.images.forEach((_, i) => {
        const dot = document.getElementById(`dot-${interieurId}-${i}`);
        if (dot) {
            dot.classList.toggle('active', i === index);
        }
    });

    currentInterieurImageIndices[interieurId] = index;
}

function openInterieurModal(interieur) {
    const modal = document.getElementById('interieurModal');
    const modalContent = document.getElementById('modalContent');
    
    currentInterieurImageIndices[interieur.id] = currentInterieurImageIndices[interieur.id] || 0;
    const currentIndex = currentInterieurImageIndices[interieur.id];
    
    const imagesHTML = interieur.images && interieur.images.length > 0 
        ? `
            <div class="modal-image-container" style="position: relative;">
                <img src="${interieur.images[currentIndex]}" alt="${interieur.titre}" class="modal-image" id="modal-img-${interieur.id}" loading="lazy">
                ${interieur.images.length > 1 ? `
                    <button class="image-nav prev" onclick="event.stopPropagation(); changeModalImage('${interieur.id}', -1)" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); z-index: 100;">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="image-nav next" onclick="event.stopPropagation(); changeModalImage('${interieur.id}', 1)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); z-index: 100;">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    <div class="image-indicator" style="position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 10;">
                        ${interieur.images.map((_, index) => `
                            <span class="indicator-dot ${index === currentIndex ? 'active' : ''}" 
                                  onclick="event.stopPropagation(); setModalImage('${interieur.id}', ${index})"
                                  id="modal-dot-${interieur.id}-${index}"
                                  style="width: 10px; height: 10px; border-radius: 50%; background: ${index === currentIndex ? 'white' : 'rgba(255, 255, 255, 0.5)'}; cursor: pointer; transition: all 0.3s; ${index === currentIndex ? 'width: 25px; border-radius: 5px;' : ''}"></span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `
        : '';

    modalContent.innerHTML = `
        ${imagesHTML}
        <div class="modal-body">
            <h2 class="modal-title">${interieur.titre}</h2>
            <div class="modal-description">${interieur.description}</div>
        </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    window.currentModalInterieur = interieur;
}

function closeInterieurModal() {
    const modal = document.getElementById('interieurModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function changeModalImage(interieurId, direction) {
    const interieur = window.currentModalInterieur || interieurs.find(i => i.id === interieurId);
    if (!interieur || !interieur.images || interieur.images.length <= 1) return;

    const currentIndex = currentInterieurImageIndices[interieurId] || 0;
    let newIndex = currentIndex + direction;

    if (newIndex < 0) newIndex = interieur.images.length - 1;
    if (newIndex >= interieur.images.length) newIndex = 0;

    setModalImage(interieurId, newIndex);
}

function setModalImage(interieurId, index) {
    const interieur = window.currentModalInterieur || interieurs.find(i => i.id === interieurId);
    if (!interieur || !interieur.images) return;

    const img = document.getElementById(`modal-img-${interieurId}`);
    if (img) {
        img.src = interieur.images[index];
        img.style.opacity = '0';
        setTimeout(() => {
            img.style.opacity = '1';
        }, 50);
    }

    interieur.images.forEach((_, i) => {
        const dot = document.getElementById(`modal-dot-${interieurId}-${i}`);
        if (dot) {
            if (i === index) {
                dot.style.background = 'white';
                dot.style.width = '25px';
                dot.style.borderRadius = '5px';
            } else {
                dot.style.background = 'rgba(255, 255, 255, 0.5)';
                dot.style.width = '10px';
                dot.style.borderRadius = '50%';
            }
        }
    });

    currentInterieurImageIndices[interieurId] = index;
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('interieurModal');
    if (e.target === modal) {
        closeInterieurModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeInterieurModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadInterieurs();
});
