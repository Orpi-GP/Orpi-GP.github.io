let quillAdd = null;
let quillEdit = null;

document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    
    if (discordAuth.isLoggedIn() && discordAuth.isAuthorized()) {
        document.getElementById('adminAccess').style.display = 'block';
        document.getElementById('accessDenied').style.display = 'none';
        updatePropertyCount();
        updateConversationsCount();
        updateContractCount();
        setupRealtimeListener();
        setupConversationsListener();
        setupContractsListener();
        
        setTimeout(() => {
            showAppointmentsCard();
            loadReviewsCount();
        }, 500);
        
        if (window.location.hash === '#conversations') {
            setTimeout(() => {
                showConversationsModal();
            }, 500);
        }
    } else {
        document.getElementById('adminAccess').style.display = 'none';
        document.getElementById('accessDenied').style.display = 'block';
    }
    
    setupDragAndDrop();
    initializeQuillEditors();
});

function initializeQuillEditors() {
    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        [{ 'header': [1, 2, 3, false] }],
        ['link'],
        ['clean']
    ];
    
    if (document.getElementById('propertyDescriptionEditor')) {
        quillAdd = new Quill('#propertyDescriptionEditor', {
            theme: 'snow',
            modules: {
                toolbar: toolbarOptions
            },
            placeholder: 'Décrivez le bien en détail...'
        });
        
        quillAdd.on('text-change', () => {
            const html = quillAdd.root.innerHTML;
            document.getElementById('propertyDescription').value = html;
        });
    }
    
    if (document.getElementById('editPropertyDescriptionEditor')) {
        quillEdit = new Quill('#editPropertyDescriptionEditor', {
            theme: 'snow',
            modules: {
                toolbar: toolbarOptions
            },
            placeholder: 'Décrivez le bien en détail...'
        });
        
        quillEdit.on('text-change', () => {
            const html = quillEdit.root.innerHTML;
            document.getElementById('editPropertyDescription').value = html;
        });
    }
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('propertyImages');
    
    if (!dropZone || !fileInput) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        });
    });
    
    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', (e) => previewImages(e));
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 5) {
            toast.warning('Vous ne pouvez déposer que 5 images maximum !');
            return;
        }
        
        const imageFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/')
        );
        
        if (imageFiles.length === 0) {
            toast.warning('Veuillez déposer uniquement des fichiers images !');
            return;
        }
        
        if (imageFiles.length !== files.length) {
            toast.warning('Certains fichiers ont été ignorés car ce ne sont pas des images.');
        }
        
        const dataTransfer = new DataTransfer();
        imageFiles.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
        
        previewImages({ target: fileInput });
    }
}

async function updatePropertyCount() {
    const count = await propertyManager.count();
    const countElement = document.querySelector('#propertyCount span');
    if (countElement) {
        countElement.textContent = count;
    }
}

function setupRealtimeListener() {
    propertyManager.onSnapshot(properties => {
        const countElement = document.querySelector('#propertyCount span');
        if (countElement) {
            countElement.textContent = properties.length;
        }
    });
}

function showAddPropertyModal() {
    document.getElementById('addPropertyModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAddPropertyModal() {
    document.getElementById('addPropertyModal').classList.remove('active');
    document.getElementById('addPropertyForm').reset();
    document.getElementById('imagesPreviewContainer').innerHTML = '';
    selectedImages = [];
    if (quillAdd) {
        quillAdd.setText('');
    }
    document.body.style.overflow = '';
}

let selectedImages = [];

window.previewImages = function(event) {
    const files = Array.from(event.target.files);
    
    if (files.length > 5) {
        toast.warning('Vous ne pouvez sélectionner que 5 images maximum !');
        event.target.value = '';
        return;
    }
    
    selectedImages = files;
    const container = document.getElementById('imagesPreviewContainer');
    container.innerHTML = '';
    
    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Aperçu ${index + 1}">
                <button type="button" class="remove-image" onclick="removeImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

window.removeImage = function(index) {
    selectedImages.splice(index, 1);
    const input = document.getElementById('propertyImages');
    const dt = new DataTransfer();
    selectedImages.forEach(file => dt.items.add(file));
    input.files = dt.files;
    
    const container = document.getElementById('imagesPreviewContainer');
    container.innerHTML = '';
    selectedImages.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Aperçu ${idx + 1}">
                <button type="button" class="remove-image" onclick="removeImage(${idx})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

async function handleAddProperty(event) {
    event.preventDefault();

    const submitBtn = event.target.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';

    try {
        const imageFiles = document.getElementById('propertyImages').files;
        
        if (imageFiles.length === 0) {
            toast.warning('Veuillez sélectionner au moins une image');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
            return;
        }
        
        if (imageFiles.length > 5) {
            toast.warning('Maximum 5 images autorisées');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
            return;
        }

        const imagesBase64 = [];
        for (let i = 0; i < imageFiles.length; i++) {
            const base64 = await convertImageToBase64(imageFiles[i]);
            imagesBase64.push(base64);
        }

        const property = {
            title: document.getElementById('propertyTitle').value,
            type: document.getElementById('propertyType').value,
            status: document.getElementById('propertyStatus').value,
            price: parseInt(document.getElementById('propertyPrice').value),
            rooms: document.getElementById('propertyRooms').value || null,
            area: document.getElementById('propertyArea').value || null,
            location: document.getElementById('propertyLocation').value,
            description: document.getElementById('propertyDescription').value,
            images: imagesBase64,
            featured: document.getElementById('propertyFeatured').checked
        };

        await propertyManager.add(property);
        closeAddPropertyModal();
        selectedImages = [];
        
        toast.success(`Bien ajouté avec succès avec ${imagesBase64.length} image(s) !`);
        
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de l\'ajout du bien. Veuillez réessayer.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
    }
}

function showAuthorizedIdsModal() {
    const modal = document.getElementById('authorizedIdsModal');
    const idsList = document.getElementById('idsList');
    
    idsList.innerHTML = '';
    
    DISCORD_CONFIG.authorizedIds.forEach((id, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <i class="fas fa-user-shield"></i>
            <div>
                <strong>Administrateur ${index + 1}</strong><br>
                <code>${id}</code>
            </div>
        `;
        idsList.appendChild(li);
    });
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAuthorizedIdsModal() {
    document.getElementById('authorizedIdsModal').classList.remove('active');
    document.body.style.overflow = '';
}

async function showManagePropertiesModal() {
    const modal = document.getElementById('managePropertiesModal');
    const list = document.getElementById('propertiesList');
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    list.innerHTML = '<p style="text-align: center; color: var(--text-color);">Chargement...</p>';
    
    const properties = await propertyManager.getAll();
    
    if (properties.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-color);">Aucun bien à gérer.</p>';
        return;
    }
    
    list.innerHTML = '';
    properties.forEach(property => {
        const firstImage = property.images ? property.images[0] : property.image;
        const statusClass = `status-${property.status ? property.status.toLowerCase().replace(/é/g, 'e').replace(/ /g, '-') : 'disponible'}`;
        
        const div = document.createElement('div');
        div.className = 'property-item';
        div.innerHTML = `
            <img src="${firstImage}" alt="${property.title}" class="property-item-image">
            <div class="property-item-info">
                <div class="property-item-title">${property.title}</div>
                <div class="property-item-details">${property.type} • ${property.location}</div>
                <span class="property-status-badge ${statusClass}">${property.status || 'Disponible'}</span>
            </div>
            <div class="property-item-price">${formatPrice(property.price)}</div>
            <div class="property-item-actions">
                <button class="property-item-btn btn-edit" onclick="editProperty('${property.id}')">
                    <i class="fas fa-edit"></i> Modifier
                </button>
                <button class="property-item-btn btn-delete" onclick="deleteProperty('${property.id}', '${property.title}')">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

function closeManagePropertiesModal() {
    document.getElementById('managePropertiesModal').classList.remove('active');
    document.body.style.overflow = '';
}

async function editProperty(id) {
    const property = await propertyManager.getById(id);
    if (!property) return;
    
    document.getElementById('editPropertyId').value = property.id;
    document.getElementById('editPropertyTitle').value = property.title;
    document.getElementById('editPropertyType').value = property.type;
    document.getElementById('editPropertyStatus').value = property.status || 'Disponible';
    document.getElementById('editPropertyPrice').value = property.price;
    document.getElementById('editPropertyRooms').value = property.rooms || '';
    document.getElementById('editPropertyArea').value = property.area || '';
    document.getElementById('editPropertyLocation').value = property.location;
    document.getElementById('editPropertyDescription').value = property.description;
    document.getElementById('editPropertyFeatured').checked = property.featured || false;
    
    if (quillEdit && property.description) {
        quillEdit.root.innerHTML = property.description;
    }
    
    closeManagePropertiesModal();
    document.getElementById('editPropertyModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeEditPropertyModal() {
    document.getElementById('editPropertyModal').classList.remove('active');
    document.getElementById('editPropertyForm').reset();
    if (quillEdit) {
        quillEdit.setText('');
    }
    document.body.style.overflow = '';
}

async function handleEditProperty(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
    
    try {
        const id = document.getElementById('editPropertyId').value;
        const updatedData = {
            title: document.getElementById('editPropertyTitle').value,
            type: document.getElementById('editPropertyType').value,
            status: document.getElementById('editPropertyStatus').value,
            price: parseInt(document.getElementById('editPropertyPrice').value),
            rooms: document.getElementById('editPropertyRooms').value || null,
            area: document.getElementById('editPropertyArea').value || null,
            location: document.getElementById('editPropertyLocation').value,
            description: document.getElementById('editPropertyDescription').value,
            featured: document.getElementById('editPropertyFeatured').checked
        };
        
        await propertyManager.update(id, updatedData);
        closeEditPropertyModal();
        toast.success('Bien modifié avec succès !');
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la modification du bien.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
    }
}

async function deleteProperty(id, title) {
    if (!confirm(`⚠️ Voulez-vous vraiment supprimer le bien "${title}" ?\n\nCette action est irréversible !`)) {
        return;
    }
    
    try {
        await propertyManager.delete(id);
        toast.success('Bien supprimé avec succès !');
        closeManagePropertiesModal();
        setTimeout(() => showManagePropertiesModal(), 500);
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la suppression du bien.');
    }
}

let currentNotificationFilter = 'all';
let currentConversationFilter = 'all';
let currentConversationId = null;

async function updateConversationsCount() {
    try {
        const conversations = await ConversationsManager.getAll();
        const activeCount = conversations.filter(c => c.status === 'open').length;
        const countElement = document.querySelector('#conversationsCount span');
        if (countElement) {
            countElement.textContent = activeCount;
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du compteur:', error);
    }
}

function setupConversationsListener() {
    ConversationsManager.onSnapshot(conversations => {
        const activeCount = conversations.filter(c => c.status === 'open').length;
        const countElement = document.querySelector('#conversationsCount span');
        if (countElement) {
            countElement.textContent = activeCount;
        }
    });
}

async function showConversationsModal() {
    const modal = document.getElementById('conversationsAdminModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    await loadConversationsAdmin('all');
}

function closeConversationsAdminModal() {
    document.getElementById('conversationsAdminModal').classList.remove('active');
    document.body.style.overflow = '';
}

async function filterConversations(type) {
    currentConversationFilter = type;
    await loadConversationsAdmin(type);
}

async function loadConversationsAdmin(filter = 'all') {
    const list = document.getElementById('conversationsAdminList');
    list.innerHTML = '<p style="text-align: center; color: var(--text-color);">Chargement...</p>';

    try {
        let conversations = await ConversationsManager.getAll();
        
        if (filter !== 'all') {
            conversations = conversations.filter(c => c.type === filter);
        }

        if (conversations.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: var(--text-color);">Aucune conversation.</p>';
            return;
        }

        list.innerHTML = '';
        conversations.forEach(conv => {
            const div = document.createElement('div');
            div.className = `property-item ${conv.read ? '' : 'unread'}`;
            div.style.cursor = 'pointer';
            div.style.borderLeft = conv.read ? '' : '4px solid var(--primary-color)';
            div.style.background = conv.read ? '' : '#fff5f5';
            
            const typeIcon = conv.type === 'contact' ? 
                '<i class="fas fa-envelope" style="color: #17a2b8;"></i>' : 
                '<i class="fas fa-calculator" style="color: #28a745;"></i>';
            
            const date = conv.lastUpdated ? 
                new Date(conv.lastUpdated.toDate()).toLocaleDateString('fr-FR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 
                'Date inconnue';
            
            const statusBadge = conv.status === 'open' ? 
                '<span class="property-status-badge status-disponible"><i class="fas fa-comment-dots"></i> Active</span>' : 
                '<span class="property-status-badge" style="background: #6c757d; color: white;"><i class="fas fa-check"></i> Clôturée</span>';
            
            const messagesCount = conv.messages ? conv.messages.length : 0;
            
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem; font-size: 1.5rem;">
                    ${typeIcon}
                </div>
                <div class="property-item-info">
                    <div class="property-item-title">ID: ${conv.data?.discordId || 'Non renseigné'}</div>
                    <div class="property-item-details">
                        ${conv.type === 'contact' ? 'Demande de contact' : 'Demande d\'estimation'}
                        <br>
                        <small>${messagesCount} message(s) • ${conv.data?.phone || 'Téléphone non renseigné'}</small>
                    </div>
                </div>
                <div style="text-align: right; min-width: 200px;">
                    <div style="font-size: 0.9rem; color: var(--text-color); margin-bottom: 0.5rem;">${date}</div>
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        ${!conv.read ? '<span class="property-status-badge" style="background: #ff9800; color: white;">Non lu</span>' : ''}
                        ${statusBadge}
                    </div>
                </div>
            `;
            
            div.onclick = () => showConversationDetails(conv.id);
            list.appendChild(div);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des conversations:', error);
        list.innerHTML = '<p style="text-align: center; color: var(--primary-color);">Erreur lors du chargement.</p>';
    }
}

async function loadNotificationsAdmin(filter = 'all') {
    const list = document.getElementById('notificationsAdminList');
    list.innerHTML = '<p style="text-align: center; color: var(--text-color);">Chargement...</p>';

    try {
        let notifications = await NotificationsManager.getAll();
        
        if (filter !== 'all') {
            notifications = notifications.filter(n => n.type === filter);
        }

        if (notifications.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: var(--text-color);">Aucune notification.</p>';
            return;
        }

        list.innerHTML = '';
        notifications.forEach(notif => {
            const div = document.createElement('div');
            div.className = `property-item ${notif.read ? '' : 'unread'}`;
            div.style.cursor = 'pointer';
            div.style.borderLeft = notif.read ? '' : '4px solid var(--primary-color)';
            div.style.background = notif.read ? '' : '#fff5f5';
            
            const typeIcon = notif.type === 'contact' ? 
                '<i class="fas fa-envelope" style="color: #17a2b8;"></i>' : 
                '<i class="fas fa-calculator" style="color: #28a745;"></i>';
            
            const date = notif.createdAt ? 
                new Date(notif.createdAt.toDate()).toLocaleDateString('fr-FR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 
                'Date inconnue';
            
            const responseStatus = notif.response ? 
                '<span class="property-status-badge" style="background: #4caf50; color: white;"><i class="fas fa-check-circle"></i> Répondu</span>' : 
                (notif.data?.email ? '<span class="property-status-badge" style="background: #ff9800; color: white;"><i class="fas fa-clock"></i> En attente</span>' : '');
            
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem; font-size: 1.5rem;">
                    ${typeIcon}
                </div>
                <div class="property-item-info">
                    <div class="property-item-title">${notif.data?.discordPseudo || 'Anonyme'}</div>
                    <div class="property-item-details">
                        ${notif.type === 'contact' ? 'Demande de contact' : 'Demande d\'estimation'}
                        <br>
                        <small>${notif.data?.email || 'Email non renseigné'} • ${notif.data?.phone || 'Téléphone non renseigné'}</small>
                    </div>
                </div>
                <div style="text-align: right; min-width: 200px;">
                    <div style="font-size: 0.9rem; color: var(--text-color); margin-bottom: 0.5rem;">${date}</div>
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                    ${!notif.read ? '<span class="property-status-badge status-disponible">Non lu</span>' : '<span class="property-status-badge" style="background: #6c757d; color: white;">Lu</span>'}
                        ${responseStatus}
                    </div>
                </div>
            `;
            
            div.onclick = () => showNotificationDetails(notif.id);
            list.appendChild(div);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
        list.innerHTML = '<p style="text-align: center; color: var(--primary-color);">Erreur lors du chargement.</p>';
    }
}

async function showNotificationDetails(id) {
    try {
        const notifications = await NotificationsManager.getAll();
        const notif = notifications.find(n => n.id === id);
        
        if (!notif) return;

        const modal = document.getElementById('notificationDetailsModal');
        const title = document.getElementById('notificationDetailsTitle');
        const content = document.getElementById('notificationDetailsContent');
        const markReadBtn = document.getElementById('markNotificationReadBtn');

        title.innerHTML = `<i class="fas fa-${notif.type === 'contact' ? 'envelope' : 'calculator'}"></i> ${notif.type === 'contact' ? 'Demande de contact' : 'Demande d\'estimation'}`;

        let htmlContent = `
            <div style="background: var(--light-bg); padding: 1.5rem; border-radius: 5px; margin-bottom: 1rem;">
                <h3 style="margin-bottom: 1rem; color: var(--secondary-color);">Informations du contact</h3>
                <p><strong>Pseudo Discord:</strong> ${notif.data?.discordPseudo || 'Non renseigné'}</p>
                <p><strong>Email:</strong> ${notif.data?.email || 'Non renseigné'}</p>
                <p><strong>Téléphone:</strong> ${notif.data?.phone || 'Non renseigné'}</p>
            </div>
        `;

        if (notif.type === 'contact') {
            htmlContent += `
                <div style="background: var(--light-bg); padding: 1.5rem; border-radius: 5px;">
                    <h3 style="margin-bottom: 1rem; color: var(--secondary-color);">Message</h3>
                    <p style="white-space: pre-wrap;">${notif.data?.message || 'Aucun message'}</p>
                </div>
            `;
        } else if (notif.type === 'estimation') {
            htmlContent += `
                <div style="background: var(--light-bg); padding: 1.5rem; border-radius: 5px; margin-bottom: 1rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--secondary-color);">Détails du bien</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <p><strong>Type:</strong> ${notif.data?.propertyType || 'Non renseigné'}</p>
                        <p><strong>Localisation:</strong> ${notif.data?.location || 'Non renseigné'}</p>
                        <p><strong>Pièces:</strong> ${notif.data?.rooms || 'Non renseigné'}</p>
                        <p><strong>Surface:</strong> ${notif.data?.area ? notif.data.area + ' m²' : 'Non renseigné'}</p>
                        <p><strong>Prix d'achat:</strong> ${notif.data?.purchasePrice ? formatPrice(notif.data.purchasePrice) : 'Non renseigné'}</p>
                    </div>
                    ${notif.data?.additionalInfo ? `
                        <div style="margin-top: 1rem;">
                            <strong>Informations complémentaires:</strong>
                            <p style="white-space: pre-wrap; margin-top: 0.5rem;">${notif.data.additionalInfo}</p>
                        </div>
                    ` : ''}
                </div>
            `;

            if (notif.data?.photos && notif.data.photos.length > 0) {
                htmlContent += `
                    <div style="background: var(--light-bg); padding: 1.5rem; border-radius: 5px;">
                        <h3 style="margin-bottom: 1rem; color: var(--secondary-color);">Photos du bien</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                `;
                notif.data.photos.forEach((photo, index) => {
                    htmlContent += `<img src="${photo}" alt="Photo ${index + 1}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 5px;">`;
                });
                htmlContent += `</div></div>`;
            }
        }

        if (notif.response) {
            htmlContent += `
                <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 5px; border-left: 4px solid #4caf50; margin-top: 1rem;">
                    <h3 style="margin-bottom: 1rem; color: #2e7d32;"><i class="fas fa-reply"></i> Réponse envoyée</h3>
                    <p style="white-space: pre-wrap;">${notif.response}</p>
                    ${notif.responseDate ? `<p style="color: #666; font-size: 0.85rem; margin-top: 0.5rem;">Envoyée le ${new Date(notif.responseDate.toDate()).toLocaleString('fr-FR')}</p>` : ''}
                </div>
            `;
        }

        content.innerHTML = htmlContent;

        const respondBtn = document.getElementById('respondNotificationBtn');
        if (notif.data?.email && !notif.response) {
            respondBtn.style.display = 'block';
            respondBtn.onclick = () => showRespondNotificationModal(notif.id);
        } else {
            respondBtn.style.display = 'none';
        }

        if (notif.read) {
            markReadBtn.style.display = 'none';
        } else {
            markReadBtn.style.display = 'block';
            markReadBtn.onclick = async () => {
                await NotificationsManager.markAsRead(id);
                closeNotificationDetailsModal();
                await loadNotificationsAdmin(currentNotificationFilter);
                await updateNotificationCount();
            };
        }

        closeNotificationsAdminModal();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement des détails de la notification.');
    }
}

function closeNotificationDetailsModal() {
    document.getElementById('notificationDetailsModal').classList.remove('active');
    document.body.style.overflow = '';
}

let currentResponseNotificationId = null;

function showRespondNotificationModal(notificationId) {
    currentResponseNotificationId = notificationId;
    const modal = document.getElementById('respondNotificationModal');
    document.getElementById('responseMessage').value = '';
    closeNotificationDetailsModal();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeRespondNotificationModal() {
    const modal = document.getElementById('respondNotificationModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentResponseNotificationId = null;
}

async function handleRespondNotification(event) {
    event.preventDefault();
    
    if (!currentResponseNotificationId) {
        toast.error('Erreur: ID de notification manquant');
        return;
    }
    
    const responseMessage = document.getElementById('responseMessage').value.trim();
    
    if (!responseMessage) {
        toast.error('Veuillez entrer une réponse');
        return;
    }
    
    try {
        const notifications = await NotificationsManager.getAll();
        const notification = notifications.find(n => n.id === currentResponseNotificationId);
        
        if (!notification || !notification.data?.email) {
            toast.error('Email du client introuvable');
            return;
        }
        
        await firebase.firestore().collection('notifications').doc(currentResponseNotificationId).update({
            response: responseMessage,
            responseDate: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        toast.success('Réponse envoyée avec succès ! Le client peut la consulter sur la page de notifications.');
        closeRespondNotificationModal();
        await loadNotificationsAdmin(currentNotificationFilter);
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la réponse:', error);
        toast.error('Erreur lors de l\'envoi de la réponse');
    }
}

async function showConversationDetails(conversationId) {
    try {
        const conversations = await ConversationsManager.getAll();
        const conversation = conversations.find(c => c.id === conversationId);
        
        if (!conversation) return;

        currentConversationId = conversationId;
        const modal = document.getElementById('conversationDetailsModal');
        const title = document.getElementById('conversationDetailsTitle');
        const content = document.getElementById('conversationDetailsContent');
        
        title.innerHTML = `<i class="fas fa-${conversation.type === 'contact' ? 'envelope' : 'calculator'}"></i> ${conversation.type === 'contact' ? 'Demande de contact' : 'Demande d\'estimation'}`;

        let htmlContent = `
            <div style="background: var(--light-bg); padding: 1.5rem; border-radius: 5px; margin-bottom: 1rem;">
                <h3 style="margin-bottom: 1rem; color: var(--secondary-color);">Informations du contact</h3>
                <p><strong>ID Discord:</strong> ${conversation.data?.discordId || 'Non renseigné'}</p>
                <p><strong>Téléphone:</strong> ${conversation.data?.phone || 'Non renseigné'}</p>
            </div>
        `;

        if (conversation.type === 'estimation') {
            htmlContent += `
                <div style="background: var(--light-bg); padding: 1.5rem; border-radius: 5px; margin-bottom: 1rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--secondary-color);">Détails du bien</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <p><strong>Type:</strong> ${conversation.data?.propertyType || 'Non renseigné'}</p>
                        <p><strong>Localisation:</strong> ${conversation.data?.location || 'Non renseigné'}</p>
                        <p><strong>Pièces:</strong> ${conversation.data?.rooms || 'Non renseigné'}</p>
                        <p><strong>Surface:</strong> ${conversation.data?.area ? conversation.data.area + ' m²' : 'Non renseigné'}</p>
                        <p><strong>Prix d'achat:</strong> ${conversation.data?.purchasePrice ? formatPrice(conversation.data.purchasePrice) : 'Non renseigné'}</p>
                    </div>
                </div>
            `;
        }

        htmlContent += `
            <div style="background: var(--light-bg); padding: 1.5rem; border-radius: 5px; margin-bottom: 1rem; max-height: 400px; overflow-y: auto;">
                <h3 style="margin-bottom: 1rem; color: var(--secondary-color);"><i class="fas fa-comments"></i> Conversation</h3>
                <div id="messagesContainer">
        `;

        if (conversation.messages && conversation.messages.length > 0) {
            conversation.messages.forEach(msg => {
                const isClient = msg.sender === 'client';
                const bgColor = isClient ? '#e3f2fd' : '#e8f5e9';
                const icon = isClient ? 'fa-user' : 'fa-user-shield';
                const senderName = isClient ? 'Client' : 'ORPI Admin';
                
                htmlContent += `
                    <div style="background: ${bgColor}; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; border-left: 4px solid ${isClient ? '#2196f3' : '#4caf50'};">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <i class="fas ${icon}" style="color: ${isClient ? '#2196f3' : '#4caf50'};"></i>
                            <strong>${senderName}</strong>
                            <span style="font-size: 0.85rem; color: #666; margin-left: auto;">${msg.timestamp ? new Date(msg.timestamp).toLocaleString('fr-FR') : ''}</span>
                        </div>
                        <p style="white-space: pre-wrap; margin: 0;">${msg.message}</p>
                    </div>
                `;
            });
        }

        htmlContent += `
                </div>
            </div>
        `;

        if (conversation.status === 'open') {
            htmlContent += `
                <div style="background: #fff3cd; padding: 1rem; border-radius: 5px; border-left: 4px solid #ffc107; margin-top: 1rem;">
                    <i class="fas fa-comment-dots"></i> <strong>Conversation active</strong> - Vous pouvez répondre au client
                </div>
            `;
        } else {
            htmlContent += `
                <div style="background: #d4edda; padding: 1rem; border-radius: 5px; border-left: 4px solid #28a745; margin-top: 1rem;">
                    <i class="fas fa-check-circle"></i> <strong>Conversation clôturée</strong>
                </div>
            `;
        }

        content.innerHTML = htmlContent;

        const replyBtn = document.getElementById('replyConversationBtn');
        const closeConvBtn = document.getElementById('closeConversationBtn');
        const reopenConvBtn = document.getElementById('reopenConversationBtn');

        if (conversation.status === 'open') {
            if (replyBtn) replyBtn.style.display = 'inline-flex';
            if (closeConvBtn) closeConvBtn.style.display = 'inline-flex';
            if (reopenConvBtn) reopenConvBtn.style.display = 'none';
        } else {
            if (replyBtn) replyBtn.style.display = 'none';
            if (closeConvBtn) closeConvBtn.style.display = 'none';
            if (reopenConvBtn) reopenConvBtn.style.display = 'inline-flex';
        }

        await ConversationsManager.markAsRead(conversationId);
        closeConversationsAdminModal();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement de la conversation.');
    }
}

function closeConversationDetailsModal() {
    document.getElementById('conversationDetailsModal').classList.remove('active');
    document.body.style.overflow = '';
    currentConversationId = null;
}

function showReplyModal() {
    if (!currentConversationId) {
        toast.error('Aucune conversation sélectionnée');
        return;
    }
    
    const modal = document.getElementById('replyConversationModal');
    document.getElementById('replyMessage').value = '';
    document.getElementById('conversationDetailsModal').classList.remove('active');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeReplyModal() {
    document.getElementById('replyConversationModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

async function handleReplyConversation(event) {
    event.preventDefault();
    
    if (!currentConversationId) {
        toast.error('Erreur: ID de conversation manquant');
        return;
    }
    
    const replyMessage = document.getElementById('replyMessage').value.trim();
    
    if (!replyMessage) {
        toast.error('Veuillez entrer un message');
        return;
    }
    
    try {
        await ConversationsManager.addMessage(currentConversationId, 'admin', replyMessage);
        
        toast.success('Message envoyé avec succès !');
        closeReplyModal();
        await loadConversationsAdmin(currentConversationFilter);
        await showConversationDetails(currentConversationId);
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        toast.error('Erreur lors de l\'envoi du message');
    }
}

async function closeConversation() {
    if (!currentConversationId) {
        toast.error('Aucune conversation sélectionnée');
        return;
    }
    
    if (!confirm('Voulez-vous vraiment clôturer cette conversation ? Le client ne pourra plus y répondre.')) {
        return;
    }
    
    try {
        await ConversationsManager.closeConversation(currentConversationId);
        toast.success('Conversation clôturée avec succès');
        closeConversationDetailsModal();
        await loadConversationsAdmin(currentConversationFilter);
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la clôture de la conversation');
    }
}

async function reopenConversation() {
    if (!currentConversationId) {
        toast.error('Aucune conversation sélectionnée');
        return;
    }
    
    try {
        await ConversationsManager.reopenConversation(currentConversationId);
        toast.success('Conversation réouverte avec succès');
        await showConversationDetails(currentConversationId);
        await loadConversationsAdmin(currentConversationFilter);
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la réouverture de la conversation');
    }
}

async function markAllNotificationsAsRead() {
    if (!confirm('Voulez-vous vraiment marquer toutes les notifications comme lues ?')) {
        return;
    }

    try {
        await NotificationsManager.markAllAsRead();
        toast.success('Toutes les notifications ont été marquées comme lues.');
        await updateNotificationCount();
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la mise à jour des notifications.');
    }
}

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

let allContracts = [];
let filteredContracts = [];

async function updateContractCount() {
    try {
        const contracts = await ContractsManager.getAllContracts();
        const pendingContracts = contracts.filter(c => c.status === 'pending' || c.status === 'partially_signed');
        const countElement = document.querySelector('#contractCount span');
        const countText = document.querySelector('#contractCount');
        if (countElement && countText) {
            countElement.textContent = contracts.length;
            countText.innerHTML = `<i class="fas fa-file-signature"></i> <span>${contracts.length}</span> contrat${contracts.length > 1 ? 's' : ''} (${pendingContracts.length} en cours)`;
        }
    } catch (error) {
        console.error('Erreur mise à jour compteur contrats:', error);
    }
}

function setupContractsListener() {
    ContractsManager.onContractsSnapshot((contracts) => {
        updateContractCount();
    });
}

function showCreateContractModal() {
    document.getElementById('createContractModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCreateContractModal() {
    document.getElementById('createContractModal').classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('createContractForm').reset();
}

document.getElementById('createContractForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const contractData = {
        type: document.getElementById('contractTypeSelect').value,
        title: document.getElementById('contractTitleInput').value,
        clientName: document.getElementById('contractClientName').value,
        clientEmail: document.getElementById('contractClientEmail').value,
        amount: document.getElementById('contractAmount').value,
        description: document.getElementById('contractDescription').value,
        terms: document.getElementById('contractTerms').value
    };

    try {
        const contractId = await ContractsManager.createContract(contractData);
        const contractUrl = ContractsManager.getContractUrl(contractId);
        
        closeCreateContractModal();
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 2rem;';
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 600px; width: 100%;">
                <h2 style="color: var(--primary-color); margin-bottom: 1rem;">
                    <i class="fas fa-check-circle"></i> Contrat créé avec succès !
                </h2>
                <p style="margin-bottom: 1rem;">ID du contrat : <strong>${contractId}</strong></p>
                <p style="margin-bottom: 1rem;">Partagez ce lien avec le client :</p>
                <div style="background: #f3f4f6; padding: 1rem; border-radius: 5px; margin-bottom: 1rem; word-break: break-all;">
                    <code id="contractUrlText">${contractUrl}</code>
                </div>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button onclick="copyContractUrl('${contractUrl}')" class="btn btn-primary">
                        <i class="fas fa-copy"></i> Copier le lien
                    </button>
                    <button onclick="openContractPage('${contractUrl}')" class="btn btn-secondary">
                        <i class="fas fa-external-link-alt"></i> Ouvrir
                    </button>
                    <button onclick="this.closest('div').parentElement.parentElement.remove()" class="btn btn-secondary">
                        Fermer
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        await updateContractCount();
        toast.success('Contrat créé avec succès !');
    } catch (error) {
        console.error('Erreur création contrat:', error);
        toast.error('Erreur lors de la création du contrat');
    }
});

function copyContractUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        toast.success('Lien copié dans le presse-papiers !');
    }).catch(() => {
        toast.error('Erreur lors de la copie du lien');
    });
}

function openContractPage(url) {
    window.open(url, '_blank');
}

async function showManageContractsModal() {
    document.getElementById('manageContractsModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    await loadAllContracts();
}

function closeManageContractsModal() {
    document.getElementById('manageContractsModal').classList.remove('active');
    document.body.style.overflow = '';
}

async function loadAllContracts() {
    try {
        const contracts = await ContractsManager.getAllContracts();
        allContracts = contracts;
        filteredContracts = contracts;
        displayContracts(contracts);
    } catch (error) {
        console.error('Erreur chargement contrats:', error);
        document.getElementById('contractsList').innerHTML = '<p style="text-align: center; padding: 2rem;">Erreur lors du chargement des contrats.</p>';
    }
}

function filterContracts() {
    const statusFilter = document.getElementById('contractFilterStatus').value;
    const typeFilter = document.getElementById('contractFilterType').value;
    
    filteredContracts = allContracts.filter(contract => {
        const matchStatus = statusFilter === 'all' || contract.status === statusFilter;
        const matchType = typeFilter === 'all' || contract.type === typeFilter;
        return matchStatus && matchType;
    });
    
    displayContracts(filteredContracts);
}

function displayContracts(contracts) {
    const container = document.getElementById('contractsList');
    
    if (contracts.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">Aucun contrat trouvé.</p>';
        return;
    }
    
    const statusIcons = {
        pending: '<i class="fas fa-clock" style="color: #F59E0B;"></i>',
        partially_signed: '<i class="fas fa-pen" style="color: #3B82F6;"></i>',
        completed: '<i class="fas fa-check-circle" style="color: #10B981;"></i>'
    };
    
    const statusTexts = {
        pending: 'En attente',
        partially_signed: 'Partiellement signé',
        completed: 'Complété'
    };
    
    container.innerHTML = contracts.map(contract => {
        const date = contract.createdAt ? contract.createdAt.toDate().toLocaleDateString('fr-FR') : 'N/A';
        return `
            <div class="property-item" style="cursor: pointer;" onclick="showContractDetails('${contract.id}')">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                    <div style="flex: 1;">
                        <h3 style="margin-bottom: 0.5rem; color: var(--primary-color);">
                            <i class="fas fa-file-contract"></i> ${contract.title}
                        </h3>
                        <p style="color: #666; margin-bottom: 0.5rem;">
                            <strong>Type:</strong> ${contract.type} | 
                            <strong>Client:</strong> ${contract.clientName} |
                            <strong>Montant:</strong> ${contract.amount ? contract.amount + ' €' : 'N/A'}
                        </p>
                        <p style="color: #888; font-size: 0.9rem;">
                            <i class="fas fa-calendar"></i> Créé le ${date}
                        </p>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <span style="background: ${contract.status === 'completed' ? '#D1FAE5' : contract.status === 'partially_signed' ? '#DBEAFE' : '#FEF3C7'}; color: ${contract.status === 'completed' ? '#065F46' : contract.status === 'partially_signed' ? '#1E40AF' : '#92400E'}; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.85rem; white-space: nowrap;">
                            ${statusIcons[contract.status]} ${statusTexts[contract.status]}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function showContractDetails(contractId) {
    const modal = document.getElementById('contractDetailsModal');
    const content = document.getElementById('contractDetailsContent');
    
    content.innerHTML = '<div class="loading">Chargement...</div>';
    modal.classList.add('active');
    
    try {
        const contract = await ContractsManager.getContract(contractId);
        if (!contract) {
            content.innerHTML = '<p style="text-align: center; padding: 2rem;">Contrat introuvable.</p>';
            return;
        }
        
        const date = contract.createdAt ? contract.createdAt.toDate().toLocaleString('fr-FR') : 'N/A';
        const contractUrl = ContractsManager.getContractUrl(contractId);
        
        const statusColors = {
            pending: { bg: '#FEF3C7', color: '#92400E' },
            partially_signed: { bg: '#DBEAFE', color: '#1E40AF' },
            completed: { bg: '#D1FAE5', color: '#065F46' }
        };
        
        const statusTexts = {
            pending: 'En attente de signature',
            partially_signed: 'Partiellement signé',
            completed: 'Complété'
        };
        
        const statusStyle = statusColors[contract.status];
        
        content.innerHTML = `
            <div style="padding: 1rem;">
                <div style="background: #F9FAFB; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <div>
                            <p style="color: #666; font-size: 0.85rem; margin-bottom: 0.3rem;">ID</p>
                            <p style="font-weight: 600;">${contract.id}</p>
                        </div>
                        <div>
                            <p style="color: #666; font-size: 0.85rem; margin-bottom: 0.3rem;">Type</p>
                            <p style="font-weight: 600;">${contract.type}</p>
                        </div>
                        <div>
                            <p style="color: #666; font-size: 0.85rem; margin-bottom: 0.3rem;">Client</p>
                            <p style="font-weight: 600;">${contract.clientName}</p>
                        </div>
                        <div>
                            <p style="color: #666; font-size: 0.85rem; margin-bottom: 0.3rem;">Montant</p>
                            <p style="font-weight: 600;">${contract.amount ? contract.amount + ' €' : 'Non spécifié'}</p>
                        </div>
                        <div>
                            <p style="color: #666; font-size: 0.85rem; margin-bottom: 0.3rem;">Créé le</p>
                            <p style="font-weight: 600;">${date}</p>
                        </div>
                        <div>
                            <p style="color: #666; font-size: 0.85rem; margin-bottom: 0.3rem;">Statut</p>
                            <span style="background: ${statusStyle.bg}; color: ${statusStyle.color}; padding: 0.4rem 0.8rem; border-radius: 15px; font-size: 0.85rem; font-weight: 600;">
                                ${statusTexts[contract.status]}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <h3 style="color: var(--primary-color); margin-bottom: 1rem;">Description</h3>
                    <p style="white-space: pre-wrap; line-height: 1.6;">${contract.description}</p>
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <h3 style="color: var(--primary-color); margin-bottom: 1rem;">Termes et conditions</h3>
                    <p style="white-space: pre-wrap; line-height: 1.6;">${contract.terms}</p>
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <h3 style="color: var(--primary-color); margin-bottom: 1rem;">Signatures</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div style="padding: 1rem; border: 2px solid ${contract.signatures.admin ? '#10B981' : '#E5E7EB'}; border-radius: 8px; background: ${contract.signatures.admin ? '#ECFDF5' : 'white'};">
                            <h4 style="margin-bottom: 0.5rem;">Administrateur</h4>
                            ${contract.signatures.admin ? 
                                `<img src="${contract.signatures.admin}" style="max-width: 100%; border-radius: 5px;">
                                <p style="color: #10B981; margin-top: 0.5rem; font-size: 0.85rem;">
                                    <i class="fas fa-check-circle"></i> Signé le ${contract.signedAt.admin ? contract.signedAt.admin.toDate().toLocaleString('fr-FR') : ''}
                                </p>` 
                                : '<p style="color: #666; font-size: 0.9rem;">Non signé</p>'}
                        </div>
                        <div style="padding: 1rem; border: 2px solid ${contract.signatures.client ? '#10B981' : '#E5E7EB'}; border-radius: 8px; background: ${contract.signatures.client ? '#ECFDF5' : 'white'};">
                            <h4 style="margin-bottom: 0.5rem;">Client</h4>
                            ${contract.signatures.client ? 
                                `<img src="${contract.signatures.client}" style="max-width: 100%; border-radius: 5px;">
                                <p style="color: #10B981; margin-top: 0.5rem; font-size: 0.85rem;">
                                    <i class="fas fa-check-circle"></i> Signé le ${contract.signedAt.client ? contract.signedAt.client.toDate().toLocaleString('fr-FR') : ''}
                                </p>` 
                                : '<p style="color: #666; font-size: 0.9rem;">Non signé</p>'}
                        </div>
                    </div>
                </div>
                
                <div style="background: #F3F4F6; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <p style="font-size: 0.9rem; color: #666; margin-bottom: 0.5rem;">Lien de signature :</p>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <code style="flex: 1; background: white; padding: 0.75rem; border-radius: 5px; font-size: 0.85rem; overflow-x: auto;">${contractUrl}</code>
                        <button onclick="copyContractUrl('${contractUrl}')" class="btn btn-primary" style="white-space: nowrap;">
                            <i class="fas fa-copy"></i> Copier
                        </button>
                        <button onclick="openContractPage('${contractUrl}')" class="btn btn-primary" style="white-space: nowrap;">
                            <i class="fas fa-external-link-alt"></i> Ouvrir
                        </button>
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center; padding-top: 1rem;">
                    <button onclick="closeContractDetailsModal()" class="btn btn-secondary">Fermer</button>
                    <button onclick="deleteContract('${contract.id}')" class="btn btn-primary" style="background: #EF4444; border: none;">
                        <i class="fas fa-trash"></i> Supprimer le contrat
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Erreur:', error);
        content.innerHTML = '<p style="text-align: center; padding: 2rem; color: red;">Erreur lors du chargement du contrat.</p>';
    }
}

function closeContractDetailsModal() {
    document.getElementById('contractDetailsModal').classList.remove('active');
    document.body.style.overflow = '';
}

async function deleteContract(contractId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contrat ? Cette action est irréversible.')) {
        return;
    }
    
    try {
        await ContractsManager.deleteContract(contractId);
        toast.success('Contrat supprimé avec succès');
        closeContractDetailsModal();
        await loadAllContracts();
        await updateContractCount();
    } catch (error) {
        console.error('Erreur suppression contrat:', error);
        toast.error('Erreur lors de la suppression du contrat');
    }
}

function showAppointmentsCard() {
    const user = discordAuth.getUser();
    if (user && DISCORD_CONFIG.authorizedIds.includes(user.id)) {
        const card = document.getElementById('appointmentsCard');
        if (card) {
            card.style.display = 'block';
            loadUserDisplayName(user);
        }
    }
}

async function loadReviewsCount() {
    try {
        if (typeof ReviewsManager === 'undefined') {
            const script = document.createElement('script');
            script.src = 'js/firebase-reviews.js';
            script.onload = async () => {
                const stats = await ReviewsManager.getStatistics();
                const countElement = document.getElementById('reviewsCount');
                if (countElement) {
                    countElement.innerHTML = `<i class="fas fa-star"></i> ${stats.total} avis (${stats.average} ⭐)`;
                }
            };
            document.head.appendChild(script);
        } else {
            const stats = await ReviewsManager.getStatistics();
            const countElement = document.getElementById('reviewsCount');
            if (countElement) {
                countElement.innerHTML = `<i class="fas fa-star"></i> ${stats.total} avis (${stats.average} ⭐)`;
            }
        }
    } catch (error) {
        console.error('Error loading reviews count:', error);
    }
}

async function loadUserDisplayName(user) {
    if (!user) return;
    
    try {
        const userDoc = await db.collection('users').doc(user.id).get();
        if (userDoc.exists && userDoc.data().displayName) {
            const displayName = userDoc.data().displayName;
            const countElement = document.getElementById('appointmentsCount');
            if (countElement) {
                countElement.innerHTML = `<i class="fas fa-user-tag"></i> Pseudo: ${displayName}`;
            }
        }
    } catch (error) {
        console.error('Error loading display name:', error);
    }
}

function showDisplayNameModal() {
    const modal = document.getElementById('displayNameModal');
    modal.classList.add('active');
    
    const user = discordAuth.getUser();
    if (user) {
        db.collection('users').doc(user.id).get().then(doc => {
            if (doc.exists && doc.data().displayName) {
                document.getElementById('displayName').value = doc.data().displayName;
            } else {
                document.getElementById('displayName').value = user.username;
            }
        });
    }
}

function closeDisplayNameModal() {
    document.getElementById('displayNameModal').classList.remove('active');
    document.getElementById('displayNameForm').reset();
}

async function handleUpdateDisplayName(e) {
    e.preventDefault();
    
    const displayName = document.getElementById('displayName').value.trim();
    
    if (!displayName) {
        toast.warning('Veuillez entrer un pseudo');
        return;
    }
    
    const user = discordAuth.getUser();
    if (!user) {
        toast.error('Utilisateur non connecté');
        return;
    }
    
    try {
        await db.collection('users').doc(user.id).set({
            discordId: user.id,
            username: user.username,
            displayName: displayName,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        await AvailabilityManager.updateAllEmployeeName(user.id, displayName);
        
        toast.success('Pseudo mis à jour avec succès');
        closeDisplayNameModal();
        loadUserDisplayName(user);
    } catch (error) {
        console.error('Error updating display name:', error);
        toast.error('Erreur lors de la mise à jour');
    }
}


