let quillAdd = null;
let quillEdit = null;

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


document.addEventListener('DOMContentLoaded', async () => {
    updateUI();
    
    if (discordAuth.isLoggedIn() && await discordAuth.isAuthorized()) {
        document.getElementById('adminAccess').style.display = 'block';
        document.getElementById('accessDenied').style.display = 'none';
        updatePropertyCount();
        updateConversationsCount();
        updateContractCount();
        setupRealtimeListener();
        setupConversationsListener();
        setupContractsListener();
        
        const currentUser = discordAuth.getUser();
        const addAdminIdBtn = document.getElementById('addAdminIdBtn');
        if (addAdminIdBtn && currentUser && DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
            addAdminIdBtn.style.display = 'block';
        }
        
        setTimeout(() => {
            showAppointmentsCard();
            loadReviewsCount();
            updateUserNamesFromConfig();
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

        toast.info(`Upload de ${imageFiles.length} image(s) vers Cloudinary...`);
        
        const imageUrls = await cloudinaryUpload.uploadMultipleImages(
            imageFiles,
            (progress, current, total) => {
                submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Upload ${current}/${total} (${Math.round(progress)}%)`;
            }
        );

        const property = {
            title: document.getElementById('propertyTitle').value,
            type: document.getElementById('propertyType').value,
            status: document.getElementById('propertyStatus').value,
            price: parseInt(document.getElementById('propertyPrice').value),
            rooms: document.getElementById('propertyRooms').value || null,
            area: document.getElementById('propertyArea').value || null,
            location: document.getElementById('propertyLocation').value,
            description: document.getElementById('propertyDescription').value,
            images: imageUrls,
            featured: document.getElementById('propertyFeatured').checked
        };

        await propertyManager.add(property);
        closeAddPropertyModal();
        selectedImages = [];
        
        toast.success(`Bien ajouté avec succès avec ${imageUrls.length} image(s) !`);
        
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de l\'ajout du bien. Veuillez réessayer.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
    }
}

async function showAuthorizedIdsModal() {
    const modal = document.getElementById('authorizedIdsModal');
    const idsList = document.getElementById('idsList');
    
    idsList.innerHTML = '<p style="text-align: center; color: var(--text-color);">Chargement...</p>';
    
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('admin_authorized_ids').where('authorized', '==', true).get();
        
        const allIds = [...DISCORD_CONFIG.authorizedIds];
        const firestoreIds = [];
        
        snapshot.forEach(doc => {
            const id = doc.id;
            if (!allIds.includes(id)) {
                allIds.push(id);
                firestoreIds.push(id);
            }
        });
        
        idsList.innerHTML = '';
        
        const currentUser = discordAuth.getUser();
        const canManageAdmins = currentUser && DISCORD_CONFIG.adminManagerIds.includes(currentUser.id);
        
        const addAdminIdBtnModal = document.getElementById('addAdminIdBtnModal');
        if (addAdminIdBtnModal) {
            addAdminIdBtnModal.style.display = canManageAdmins ? 'block' : 'none';
        }
        
        if (allIds.length === 0) {
            idsList.innerHTML = '<p style="text-align: center; color: var(--text-color);">Aucun ID autorisé.</p>';
        } else {
            allIds.forEach((id, index) => {
                const isFromFirestore = firestoreIds.includes(id);
                const li = document.createElement('li');
                li.style.position = 'relative';
                li.innerHTML = `
                    <i class="fas fa-user-shield"></i>
                    <div style="flex: 1;">
                        <strong>Administrateur ${index + 1}</strong>
                        ${isFromFirestore ? '<span style="background: #28a745; color: white; padding: 0.2rem 0.5rem; border-radius: 3px; font-size: 0.75rem; margin-left: 0.5rem;">Ajouté via site</span>' : '<span style="background: #6c757d; color: white; padding: 0.2rem 0.5rem; border-radius: 3px; font-size: 0.75rem; margin-left: 0.5rem;">Config.js</span>'}
                        <br>
                        <code>${id}</code>
                    </div>
                    ${isFromFirestore && canManageAdmins ? `<button onclick="removeAuthorizedId('${id}')" class="btn-delete" style="padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem;">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>` : ''}
                `;
                idsList.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des IDs:', error);
        idsList.innerHTML = '<p style="text-align: center; color: var(--primary-color);">Erreur lors du chargement.</p>';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAuthorizedIdsModal() {
    document.getElementById('authorizedIdsModal').classList.remove('active');
    document.body.style.overflow = '';
}

async function addAuthorizedId() {
    const currentUser = discordAuth.getUser();
    
    if (!currentUser || !DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
        toast.error('Vous n\'êtes pas autorisé à ajouter des administrateurs. Seuls Emily, Lucas, Tom et Guivarsh peuvent effectuer cette action.');
        return;
    }
    
    const idInput = document.getElementById('newDiscordId');
    const discordId = idInput.value.trim();
    
    if (!discordId) {
        toast.error('Veuillez entrer un ID Discord');
        return;
    }
    
    if (DISCORD_CONFIG.authorizedIds.includes(discordId)) {
        toast.warning('Cet ID est déjà autorisé dans config.js');
        return;
    }
    
    try {
        const db = firebase.firestore();
        await db.collection('admin_authorized_ids').doc(discordId).set({
            authorized: true,
            addedAt: firebase.firestore.FieldValue.serverTimestamp(),
            addedBy: currentUser.id
        });
        
        toast.success('ID Discord ajouté avec succès !');
        idInput.value = '';
        await showAuthorizedIdsModal();
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'ID:', error);
        toast.error('Erreur lors de l\'ajout de l\'ID');
    }
}

async function removeAuthorizedId(discordId) {
    const currentUser = discordAuth.getUser();
    
    if (!currentUser || !DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
        toast.error('Vous n\'êtes pas autorisé à supprimer des administrateurs. Seuls Emily, Lucas, Tom et Guivarsh peuvent effectuer cette action.');
        return;
    }
    
    if (!confirm(`Voulez-vous vraiment supprimer l'accès admin pour l'ID ${discordId} ?`)) {
        return;
    }
    
    try {
        const db = firebase.firestore();
        await db.collection('admin_authorized_ids').doc(discordId).delete();
        
        toast.success('ID Discord supprimé avec succès !');
        await showAuthorizedIdsModal();
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'ID:', error);
        toast.error('Erreur lors de la suppression de l\'ID');
    }
}

function showAddAdminIdModal() {
    const modal = document.getElementById('addAdminIdModal');
    document.getElementById('newDiscordId').value = '';
    closeAuthorizedIdsModal();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAddAdminIdModal() {
    document.getElementById('addAdminIdModal').classList.remove('active');
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
            <img src="${escapeHtml(firstImage)}" alt="${escapeHtml(property.title)}" class="property-item-image">
            <div class="property-item-info">
                <div class="property-item-title">${escapeHtml(property.title)}</div>
                <div class="property-item-details">${escapeHtml(property.type)} • ${escapeHtml(property.location)}</div>
                <span class="property-status-badge ${statusClass}">${escapeHtml(property.status || 'Disponible')}</span>
            </div>
            <div class="property-item-price">${formatPrice(property.price)}</div>
            <div class="property-item-actions">
                <button class="property-item-btn btn-edit" onclick="editProperty('${escapeHtml(property.id)}')">
                    <i class="fas fa-edit"></i> Modifier
                </button>
                <button class="property-item-btn btn-delete" onclick="deleteProperty('${escapeHtml(property.id)}', '${escapeHtml(property.title)}')">
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
        const doc = await db.collection('properties').doc(id).get();
        const property = doc.data();
        
        if (property && property.images && Array.isArray(property.images)) {
            for (const imageUrl of property.images) {
                if (imageUrl.includes('cloudinary.com')) {
                    await cloudinaryUpload.deleteImage(imageUrl);
                }
            }
        }
        
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

        conversations.sort((a, b) => {
            if (a.archived && !b.archived) return 1;
            if (!a.archived && b.archived) return -1;
            const dateA = a.lastUpdated ? a.lastUpdated.toDate() : new Date(0);
            const dateB = b.lastUpdated ? b.lastUpdated.toDate() : new Date(0);
            return dateB - dateA;
        });

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
            
            const archivedBadge = conv.archived ?
                '<span class="property-status-badge" style="background: #9ca3af; color: white;"><i class="fas fa-archive"></i> Archivée</span>' :
                '';
            
            const messagesCount = conv.messages ? conv.messages.length : 0;
            
            if (conv.archived) {
                div.style.opacity = '0.6';
                div.style.background = '#f5f5f5';
            }
            
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem; font-size: 1.5rem;">
                    ${typeIcon}
                </div>
                <div class="property-item-info">
                    <div class="property-item-title">ID: ${escapeHtml(conv.data?.discordId || 'Non renseigné')}</div>
                    <div class="property-item-details">
                        ${conv.type === 'contact' ? 'Demande de contact' : 'Demande d\'estimation'}
                        <br>
                        <small>${messagesCount} message(s) • ${escapeHtml(conv.data?.phone || 'Téléphone non renseigné')}</small>
                    </div>
                </div>
                <div style="text-align: right; min-width: 200px;">
                    <div style="font-size: 0.9rem; color: var(--text-color); margin-bottom: 0.5rem;">${date}</div>
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        ${!conv.read ? '<span class="property-status-badge" style="background: #ff9800; color: white;">Non lu</span>' : ''}
                        ${statusBadge}
                        ${archivedBadge}
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
                    <div class="property-item-title">${escapeHtml(notif.data?.discordPseudo || 'Anonyme')}</div>
                    <div class="property-item-details">
                        ${notif.type === 'contact' ? 'Demande de contact' : 'Demande d\'estimation'}
                        <br>
                        <small>${escapeHtml(notif.data?.email || 'Email non renseigné')} • ${escapeHtml(notif.data?.phone || 'Téléphone non renseigné')}</small>
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
                <p><strong>Pseudo Discord:</strong> ${escapeHtml(notif.data?.discordPseudo || 'Non renseigné')}</p>
                <p><strong>Email:</strong> ${escapeHtml(notif.data?.email || 'Non renseigné')}</p>
                <p><strong>Téléphone:</strong> ${escapeHtml(notif.data?.phone || 'Non renseigné')}</p>
            </div>
        `;

        if (notif.type === 'contact') {
            htmlContent += `
                <div style="background: var(--light-bg); padding: 1.5rem; border-radius: 5px;">
                    <h3 style="margin-bottom: 1rem; color: var(--secondary-color);">Message</h3>
                    <p style="white-space: pre-wrap;">${escapeHtml(notif.data?.message || 'Aucun message')}</p>
                </div>
            `;
        } else if (notif.type === 'estimation') {
            htmlContent += `
                <div style="background: var(--light-bg); padding: 1.5rem; border-radius: 5px; margin-bottom: 1rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--secondary-color);">Détails du bien</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <p><strong>Type:</strong> ${escapeHtml(notif.data?.propertyType || 'Non renseigné')}</p>
                        <p><strong>Localisation:</strong> ${escapeHtml(notif.data?.location || 'Non renseigné')}</p>
                        <p><strong>Pièces:</strong> ${escapeHtml(notif.data?.rooms || 'Non renseigné')}</p>
                        <p><strong>Surface:</strong> ${notif.data?.area ? escapeHtml(notif.data.area) + ' m²' : 'Non renseigné'}</p>
                        <p><strong>Prix d'achat:</strong> ${notif.data?.purchasePrice ? formatPrice(notif.data.purchasePrice) : 'Non renseigné'}</p>
                    </div>
                    ${notif.data?.additionalInfo ? `
                        <div style="margin-top: 1rem;">
                            <strong>Informations complémentaires:</strong>
                            <p style="white-space: pre-wrap; margin-top: 0.5rem;">${escapeHtml(notif.data.additionalInfo)}</p>
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
                    htmlContent += `<img src="${escapeHtml(photo)}" alt="Photo ${index + 1}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 5px;">`;
                });
                htmlContent += `</div></div>`;
            }
        }

        if (notif.response) {
            htmlContent += `
                <div style="background: #e8f5e9; padding: 1.5rem; border-radius: 5px; border-left: 4px solid #4caf50; margin-top: 1rem;">
                    <h3 style="margin-bottom: 1rem; color: #2e7d32;"><i class="fas fa-reply"></i> Réponse envoyée</h3>
                    <p style="white-space: pre-wrap;">${escapeHtml(notif.response)}</p>
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
            <div style="background: var(--light-bg); padding: 1rem; border-radius: 5px; margin: 1rem 1.5rem;">
                <h3 style="margin-bottom: 0.75rem; color: var(--secondary-color); font-size: 1rem;">Informations du contact</h3>
                <p style="margin: 0.25rem 0;"><strong>ID Discord:</strong> ${escapeHtml(conversation.data?.discordId || 'Non renseigné')}</p>
                <p style="margin: 0.25rem 0;"><strong>Email:</strong> ${escapeHtml(conversation.data?.email || 'Non renseigné')}</p>
                <p style="margin: 0.25rem 0;"><strong>Téléphone:</strong> ${escapeHtml(conversation.data?.phone || 'Non renseigné')}</p>
            </div>
        `;

        if (conversation.type === 'estimation') {
            htmlContent += `
                <div style="background: var(--light-bg); padding: 1rem; border-radius: 5px; margin: 0 1.5rem 1rem 1.5rem;">
                    <h3 style="margin-bottom: 0.75rem; color: var(--secondary-color); font-size: 1rem;">Détails du bien</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                        <p style="margin: 0.25rem 0;"><strong>Type:</strong> ${escapeHtml(conversation.data?.propertyType || 'Non renseigné')}</p>
                        <p style="margin: 0.25rem 0;"><strong>Localisation:</strong> ${escapeHtml(conversation.data?.location || 'Non renseigné')}</p>
                        <p style="margin: 0.25rem 0;"><strong>Pièces:</strong> ${escapeHtml(conversation.data?.rooms || 'Non renseigné')}</p>
                        <p style="margin: 0.25rem 0;"><strong>Surface:</strong> ${conversation.data?.area ? escapeHtml(conversation.data.area) + ' m²' : 'Non renseigné'}</p>
                        <p style="margin: 0.25rem 0;"><strong>Prix d'achat:</strong> ${conversation.data?.purchasePrice ? formatPrice(conversation.data.purchasePrice) : 'Non renseigné'}</p>
                    </div>
                </div>
            `;
        }

        htmlContent += `
            <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; margin: 0 1.5rem 1rem 1.5rem; display: flex; flex-direction: column; height: 450px;">
                <div style="background: linear-gradient(135deg, #E30613 0%, #c20510 100%); padding: 0.75rem 1rem; border-radius: 10px 10px 0 0; color: white; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 2px 8px rgba(227, 6, 19, 0.2);">
                    <i class="fas fa-comments" style="font-size: 1rem;"></i>
                    <h3 style="margin: 0; font-size: 1rem; font-weight: 600;">Conversation</h3>
                    <div style="margin-left: auto; display: flex; gap: 0.5rem; align-items: center;">
                        <span style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.6rem; border-radius: 12px; font-size: 0.8rem;">
                            ${conversation.messages ? conversation.messages.length : 0} msg
                        </span>
                    </div>
                </div>
                <div id="messagesContainer" style="flex: 1; padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; background: white;">
        `;

        if (conversation.messages && conversation.messages.length > 0) {
            conversation.messages.forEach((msg, index) => {
                const isClient = msg.sender === 'client';
                const bgColor = isClient ? '#eff6ff' : '#f0fdf4';
                const borderColor = isClient ? '#3b82f6' : '#22c55e';
                const icon = isClient ? 'fa-user-circle' : 'fa-user-shield';
                const senderName = isClient ? 'Client' : 'ORPI';
                const alignment = isClient ? 'flex-start' : 'flex-end';
                const messageAlign = isClient ? 'left' : 'right';
                
                let msgTime = '';
                if (msg.timestamp) {
                    try {
                        const msgDate = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
                        msgTime = msgDate.toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    } catch (e) {
                        msgTime = '';
                    }
                }
                
                let messageDisplay = msg.message || '';
                if (messageDisplay.includes('<a href=')) {
                    messageDisplay = messageDisplay.replace(/\n/g, '<br>');
                } else {
                    messageDisplay = escapeHtml(messageDisplay).replace(/\n/g, '<br>');
                }
                
                htmlContent += `
                    <div style="display: flex; justify-content: ${alignment}; animation: slideIn 0.3s ease-out;">
                        <div style="max-width: 75%; min-width: 200px;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; ${isClient ? '' : 'flex-direction: row-reverse;'}">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: ${borderColor}; display: flex; align-items: center; justify-content: center; color: white;">
                                    <i class="fas ${icon}" style="font-size: 0.9rem;"></i>
                                </div>
                                <strong style="color: ${borderColor}; font-size: 0.9rem;">${senderName}</strong>
                                <span style="font-size: 0.75rem; color: #94a3b8;">${msgTime}</span>
                            </div>
                            <div style="background: ${bgColor}; padding: 1rem 1.25rem; border-radius: ${isClient ? '4px 16px 16px 16px' : '16px 4px 16px 16px'}; border-left: 3px solid ${borderColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.08); position: relative;">
                                <div style="color: #1e293b; line-height: 1.6; word-wrap: break-word;">${messageDisplay}</div>
                `;
                
                if (msg.attachments && msg.attachments.length > 0) {
                    htmlContent += '<div style="margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid rgba(0,0,0,0.1);">';
                    msg.attachments.forEach(att => {
                        const isImage = att.type && att.type.startsWith('image/');
                        if (isImage) {
                            htmlContent += `
                                <a href="${att.url}" target="_blank" style="display: block; border-radius: 8px; overflow: hidden; max-width: 250px; border: 2px solid ${borderColor}; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                                    <img src="${att.url}" alt="${escapeHtml(att.name)}" style="width: 100%; height: auto; display: block;" />
                                </a>
                            `;
                        } else {
                            htmlContent += `
                                <a href="${att.url}" target="_blank" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; background: white; border: 2px solid ${borderColor}; border-radius: 8px; text-decoration: none; color: ${borderColor}; transition: all 0.2s; font-size: 0.85rem;" onmouseover="this.style.background='${borderColor}'; this.style.color='white';" onmouseout="this.style.background='white'; this.style.color='${borderColor}';">
                                    <i class="fas fa-file-download"></i> ${escapeHtml(att.name)}
                                </a>
                            `;
                        }
                    });
                    htmlContent += '</div>';
                }
                
                htmlContent += `
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            htmlContent += `
                <div style="text-align: center; padding: 3rem; color: #94a3b8;">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                    <p>Aucun message dans cette conversation</p>
                </div>
            `;
        }

        htmlContent += `
                </div>
            </div>
        `;

        if (conversation.status === 'open') {
            htmlContent += `
                <div style="background: #fff3cd; padding: 0.75rem 1rem; border-radius: 5px; border-left: 4px solid #ffc107; margin: 0 1.5rem 1rem 1.5rem; font-size: 0.9rem;">
                    <i class="fas fa-comment-dots"></i> <strong>Conversation active</strong> - Vous pouvez répondre au client
                </div>
            `;
        } else {
            htmlContent += `
                <div style="background: #d4edda; padding: 0.75rem 1rem; border-radius: 5px; border-left: 4px solid #28a745; margin: 0 1.5rem 1rem 1.5rem; font-size: 0.9rem;">
                    <i class="fas fa-check-circle"></i> <strong>Conversation clôturée</strong>
                </div>
            `;
        }

        content.innerHTML = htmlContent;

        const replyBtn = document.getElementById('replyConversationBtn');
        const closeConvBtn = document.getElementById('closeConversationBtn');
        const reopenConvBtn = document.getElementById('reopenConversationBtn');
        const archiveConvBtn = document.getElementById('archiveConversationBtn');
        const unarchiveConvBtn = document.getElementById('unarchiveConversationBtn');

        if (conversation.status === 'open') {
            if (replyBtn) replyBtn.style.display = 'inline-flex';
            if (closeConvBtn) closeConvBtn.style.display = 'inline-flex';
            if (reopenConvBtn) reopenConvBtn.style.display = 'none';
        } else {
            if (replyBtn) replyBtn.style.display = 'none';
            if (closeConvBtn) closeConvBtn.style.display = 'none';
            if (reopenConvBtn) reopenConvBtn.style.display = 'inline-flex';
        }

        if (conversation.archived) {
            if (archiveConvBtn) archiveConvBtn.style.display = 'none';
            if (unarchiveConvBtn) unarchiveConvBtn.style.display = 'inline-flex';
        } else {
            if (archiveConvBtn) archiveConvBtn.style.display = 'inline-flex';
            if (unarchiveConvBtn) unarchiveConvBtn.style.display = 'none';
        }

        await ConversationsManager.markAsRead(conversationId);
        closeConversationsAdminModal();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Activer le scroll automatique et faire défiler vers le bas
        setTimeout(() => {
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            // Activer le ConversationUI si disponible
            if (typeof ConversationUI !== 'undefined') {
                ConversationUI.enableAutoScroll(conversationId);
            }
        }, 100);
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
    document.getElementById('replyAttachments').value = '';
    document.getElementById('replyAttachmentsPreview').innerHTML = '';
    document.getElementById('conversationDetailsModal').classList.remove('active');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Initialiser l'interface améliorée si disponible
    setTimeout(() => {
        if (typeof ConversationUI !== 'undefined') {
            if (!document.getElementById('keywordHelper')) {
                ConversationUI.initEnhancedInterface();
            }
            ConversationUI.updatePreview();
        }
    }, 100);
}

function closeReplyModal() {
    document.getElementById('replyConversationModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function previewReplyAttachments() {
    const fileInput = document.getElementById('replyAttachments');
    const preview = document.getElementById('replyAttachmentsPreview');
    const files = Array.from(fileInput.files);
    
    if (files.length === 0) {
        preview.innerHTML = '';
        return;
    }
    
    let html = '';
    files.forEach((file, index) => {
        const isImage = file.type.startsWith('image/');
        html += `
            <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: #f8f9fa; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem;">
                ${isImage ? '<i class="fas fa-image" style="color: var(--primary-color);"></i>' : '<i class="fas fa-file" style="color: var(--primary-color);"></i>'}
                <span>${escapeHtml(file.name)}</span>
            </div>
        `;
    });
    
    preview.innerHTML = html;
}

async function uploadFileToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', window.CLOUDINARY_CONFIG.uploadPreset);
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CONFIG.cloudName}/auto/upload`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error('Erreur lors de l\'upload du fichier');
    }
    
    const data = await response.json();
    return {
        url: data.secure_url,
        name: file.name,
        type: file.type,
        size: file.size
    };
}

async function handleReplyConversation(event) {
    event.preventDefault();
    
    if (!currentConversationId) {
        toast.error('Erreur: ID de conversation manquant');
        return;
    }
    
    const replyMessage = document.getElementById('replyMessage').value.trim();
    const fileInput = document.getElementById('replyAttachments');
    const files = Array.from(fileInput.files);
    
    if (!replyMessage && files.length === 0) {
        toast.error('Veuillez entrer un message ou joindre un fichier');
        return;
    }
    
    try {
        const sendBtn = document.getElementById('sendReplyBtn');
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
        
        let attachments = [];
        
        if (files.length > 0) {
            toast.info('Upload des fichiers en cours...');
            for (const file of files) {
                const uploadedFile = await uploadFileToCloudinary(file);
                attachments.push(uploadedFile);
            }
        }
        
        let processedMessage = replyMessage || '';
        if (typeof ConversationEnhancer !== 'undefined') {
            processedMessage = ConversationEnhancer.processKeywords(replyMessage || '');
        }
        
        const conversations = await ConversationsManager.getAll();
        const conversation = conversations.find(c => c.id === currentConversationId);
        const clientEmail = conversation?.data?.email;
        
        await ConversationsManager.addMessage(currentConversationId, 'admin', processedMessage, attachments);
        
        if (clientEmail && typeof EmailService !== 'undefined') {
            try {
                await EmailService.sendReplyNotification(clientEmail, processedMessage, conversation?.type || 'contact');
            } catch (emailError) {
                console.warn('Email non envoyé (non critique):', emailError);
            }
        }
        
        toast.success('Message envoyé avec succès !');
        closeReplyModal();
        await loadConversationsAdmin(currentConversationFilter);
        await showConversationDetails(currentConversationId);
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        toast.error('Erreur lors de l\'envoi du message');
    } finally {
        const sendBtn = document.getElementById('sendReplyBtn');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Envoyer le message';
        }
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

async function archiveConversation() {
    if (!currentConversationId) {
        toast.error('Aucune conversation sélectionnée');
        return;
    }
    
    try {
        await ConversationsManager.archiveConversation(currentConversationId);
        toast.success('Conversation archivée avec succès');
        await showConversationDetails(currentConversationId);
        await loadConversationsAdmin(currentConversationFilter);
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de l\'archivage de la conversation');
    }
}

async function unarchiveConversation() {
    if (!currentConversationId) {
        toast.error('Aucune conversation sélectionnée');
        return;
    }
    
    try {
        await ConversationsManager.unarchiveConversation(currentConversationId);
        toast.success('Conversation désarchivée avec succès');
        await showConversationDetails(currentConversationId);
        await loadConversationsAdmin(currentConversationFilter);
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du désarchivage de la conversation');
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
    const defaultTerms = `1.1. Le présent bail est consenti aux conditions qui y sont énoncées. Le Bailleur se réserve le droit de mettre en vente le bien loué pendant la durée du bail.
1.2. Si, à la suite d'une vente du bien, l'Acquéreur souhaite occuper personnellement le logement ou le faire occuper par un parent proche, le Locataire s'engage à libérer les lieux à la date indiquée dans le congé régulier délivré par le nouveau propriétaire, sous réserve du respect par le nouveau propriétaire de toutes les formalités et délais légaux applicables.
1.3. Le Locataire reconnaît être informé que la vente n'annule pas automatiquement le bail en cours et que l'exercice par l'Acquéreur de son droit de reprise ou de vente libératoire s'effectuera conformément aux règles de droit applicables.
1.4. Le Bailleur s'engage, en cas de mise en vente, à notifier par écrit le Locataire de toute promesse de vente signée et à transmettre au Locataire l'offre d'achat formelle reçue, dans les conditions et délais prévus par la loi applicable.
1.5. En l'absence d'un congé formel du nouveau propriétaire respectant les dispositions légales, le Locataire reste en place et conserve tous ses droits issus du bail en cours.
1.6. Toute clause contraire au droit impératif applicable locale sera réputée non écrite et n'affectera pas la validité du reste du contrat.`;
    
    document.getElementById('contractTerms').value = defaultTerms;
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
                countElement.innerHTML = `<i class="fas fa-user-tag"></i> Pseudo: ${escapeHtml(displayName)}`;
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

async function initThemeSelector() {
    const selector = document.getElementById('themeSelector');
    const currentThemeName = document.getElementById('currentThemeName');
    
    if (selector && currentThemeName) {
        try {
            const currentTheme = await getActiveTheme();
            THEME_CONFIG.activeTheme = currentTheme;
            selector.value = currentTheme;
            updateThemeName(currentTheme);
            
            listenToThemeChanges((newTheme) => {
                selector.value = newTheme;
                updateThemeName(newTheme);
            });
        } catch (error) {
            console.error('Erreur init theme selector:', error);
        }
    }
}

function updateThemeName(theme) {
    const currentThemeName = document.getElementById('currentThemeName');
    if (!currentThemeName) return;
    
    const themeNames = {
        'default': '🏠 Par défaut (ORPI)',
        'halloween': '🎃 Halloween',
        'christmas': '🎄 Noël'
    };
    
    currentThemeName.textContent = themeNames[theme] || themeNames['default'];
}

window.changeTheme = async function(themeName) {
    try {
        const selector = document.getElementById('themeSelector');
        if (selector) {
            selector.disabled = true;
        }
        
        if (window.toast) {
            toast.info('Changement de thème en cours...');
        }
        
        const result = await setActiveTheme(themeName);
        
        if (result.success) {
            if (window.themeManager) {
                themeManager.removeThemeEffects();
                THEME_CONFIG.activeTheme = themeName;
                themeManager.applyTheme(themeName);
                updateThemeName(themeName);
            }
            
            if (window.toast) {
                const themeNames = {
                    'default': 'Thème par défaut',
                    'halloween': 'Thème Halloween',
                    'christmas': 'Thème Noël'
                };
                toast.success(`${themeNames[themeName]} activé pour tous les visiteurs !`);
            }
        } else {
            if (window.toast) {
                toast.error('Erreur lors du changement de thème');
            }
        }
        
        if (selector) {
            selector.disabled = false;
        }
    } catch (error) {
        console.error('Erreur changement thème:', error);
        if (window.toast) {
            toast.error('Erreur lors du changement de thème');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initThemeSelector();
    }, 100);
});


