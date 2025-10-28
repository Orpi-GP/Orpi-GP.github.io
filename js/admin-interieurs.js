let currentImages = [];
let editingInterieurId = null;
let quillEditor = null;
let categories = [];
let editingCategoryId = null;

function showToast(message, type = 'info') {
    if (window.toast) {
        window.toast.show(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

function initQuillEditor() {
    if (typeof Quill !== 'undefined' && !quillEditor) {
        quillEditor = new Quill('#descriptionEditor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['link'],
                    ['clean']
                ]
            },
            placeholder: 'Décrivez l\'intérieur en détail...'
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
});

function checkAdminAccess() {
    const user = JSON.parse(localStorage.getItem('discord_user') || 'null');
    
    console.log('🔍 Vérification accès admin');
    console.log('👤 User:', user);
    console.log('🔑 DISCORD_CONFIG:', typeof DISCORD_CONFIG !== 'undefined' ? DISCORD_CONFIG : 'NON DÉFINI');
    console.log('📋 IDs autorisés:', typeof DISCORD_CONFIG !== 'undefined' ? DISCORD_CONFIG.authorizedIds : 'NON DÉFINI');
    
    if (!user) {
        console.log('❌ Pas d\'utilisateur connecté');
        document.getElementById('adminAccess').style.display = 'none';
        document.getElementById('accessDenied').style.display = 'block';
        return;
    }
    
    if (typeof DISCORD_CONFIG === 'undefined' || !DISCORD_CONFIG.authorizedIds) {
        console.error('❌ DISCORD_CONFIG non disponible');
        document.getElementById('adminAccess').style.display = 'none';
        document.getElementById('accessDenied').style.display = 'block';
        return;
    }
    
    if (!DISCORD_CONFIG.authorizedIds.includes(user.id)) {
        console.log('❌ ID non autorisé:', user.id);
        document.getElementById('adminAccess').style.display = 'none';
        document.getElementById('accessDenied').style.display = 'block';
        return;
    }
    
    console.log('✅ Accès autorisé pour:', user.username);
    document.getElementById('adminAccess').style.display = 'block';
    document.getElementById('accessDenied').style.display = 'none';
    
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    
    if (userProfile && userAvatar && userName) {
        userProfile.style.display = 'flex';
        userAvatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
        userName.textContent = user.username;
    }
    
    loadInterieurs();
    loadCategories();
    setupDragAndDrop();
}

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
        updateCategoriesSelect();
    } catch (error) {
        console.error("Erreur chargement catégories:", error);
    }
}

function updateCategoriesSelect() {
    const select = document.getElementById('categorie');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">Sélectionner une catégorie</option>';
    
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
    });
    
    if (currentValue) {
        select.value = currentValue;
    }
}

function showAddCategoryModal() {
    const manageCategoriesModal = document.getElementById('manageCategoriesModal');
    const fromManageModal = manageCategoriesModal.classList.contains('active');
    
    if (fromManageModal) {
        manageCategoriesModal.classList.remove('active');
    }
    
    editingCategoryId = null;
    document.getElementById('categoryModalTitle').innerHTML = '<i class="fas fa-folder-plus"></i> Nouvelle Catégorie';
    document.getElementById('categorySaveBtn').innerHTML = '<i class="fas fa-save"></i> Créer';
    document.getElementById('categoryModal').classList.add('active');
    document.getElementById('categoryForm').reset();
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
    
    const wasFromManageModal = document.getElementById('manageCategoriesModal').getAttribute('data-was-open') === 'true';
    if (wasFromManageModal) {
        showManageCategoriesModal();
        document.getElementById('manageCategoriesModal').removeAttribute('data-was-open');
    }
    
    editingCategoryId = null;
}

function showManageCategoriesModal() {
    document.getElementById('manageCategoriesModal').classList.add('active');
    displayCategoriesList();
}

function closeManageCategoriesModal() {
    document.getElementById('manageCategoriesModal').classList.remove('active');
}

async function displayCategoriesList() {
    const container = document.getElementById('categoriesListContainer');
    container.innerHTML = '<p style="text-align: center; color: #666;"><i class="fas fa-spinner fa-spin"></i> Chargement...</p>';
    
    await loadCategories();
    
    if (categories.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;"><i class="fas fa-info-circle"></i> Aucune catégorie créée</p>';
        return;
    }
    
    container.innerHTML = '';
    
    for (const category of categories) {
        const result = await db.collection('interieurs').where('categorieId', '==', category.id).get();
        const count = result.docs.length;
        
        const card = document.createElement('div');
        card.style.cssText = 'background: white; border: 2px solid #e0e0e0; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;';
        
        card.innerHTML = `
            <div style="flex: 1;">
                <h3 style="color: var(--secondary-color); font-size: 1.2rem; margin-bottom: 0.5rem;">
                    <i class="fas fa-folder"></i> ${category.name}
                </h3>
                <p style="color: #666; font-size: 0.9rem;">
                    <i class="fas fa-image"></i> ${count} intérieur(s)
                </p>
            </div>
            <div style="display: flex; gap: 0.75rem;">
                <button onclick="editCategory('${category.id}', '${category.name.replace(/'/g, "\\'")}')" 
                        class="btn-edit" style="padding: 0.75rem 1.25rem; white-space: nowrap;">
                    <i class="fas fa-edit"></i> Modifier
                </button>
                <button onclick="confirmDeleteCategory('${category.id}', '${category.name.replace(/'/g, "\\'")}', ${count})" 
                        class="btn-delete" style="padding: 0.75rem 1.25rem; white-space: nowrap;">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </div>
        `;
        
        container.appendChild(card);
    }
}

function editCategory(id, name) {
    const manageCategoriesModal = document.getElementById('manageCategoriesModal');
    manageCategoriesModal.classList.remove('active');
    manageCategoriesModal.setAttribute('data-was-open', 'true');
    
    editingCategoryId = id;
    document.getElementById('categoryModalTitle').innerHTML = '<i class="fas fa-edit"></i> Modifier la Catégorie';
    document.getElementById('categorySaveBtn').innerHTML = '<i class="fas fa-save"></i> Modifier';
    document.getElementById('categoryName').value = name;
    document.getElementById('categoryModal').classList.add('active');
}

async function confirmDeleteCategory(id, name, count) {
    let message = `Voulez-vous vraiment supprimer la catégorie "${name}" ?`;
    if (count > 0) {
        message += `\n\nAttention : ${count} intérieur(s) sont associés à cette catégorie. Ils seront déplacés dans "Sans catégorie".`;
    }
    
    if (confirm(message)) {
        await deleteCategory(id);
    }
}

async function deleteCategory(id) {
    try {
        const interieursResult = await db.collection('interieurs').where('categorieId', '==', id).get();
        
        const batch = db.batch();
        
        interieursResult.forEach(doc => {
            batch.update(doc.ref, { categorieId: firebase.firestore.FieldValue.delete() });
        });
        
        const categoryRef = db.collection('interieurs_categories').doc(id);
        batch.delete(categoryRef);
        
        await batch.commit();
        
        showToast('Catégorie supprimée avec succès', 'success');
        await loadCategories();
        await loadInterieurs();
        displayCategoriesList();
    } catch (error) {
        console.error("Erreur suppression catégorie:", error);
        showToast('Erreur lors de la suppression de la catégorie', 'error');
    }
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const categoryName = document.getElementById('categoryName').value.trim();
    
    if (!categoryName) {
        showToast('Veuillez entrer un nom de catégorie', 'warning');
        return;
    }
    
    try {
        if (editingCategoryId) {
            await db.collection('interieurs_categories').doc(editingCategoryId).update({
                name: categoryName,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Catégorie modifiée avec succès', 'success');
        } else {
            await db.collection('interieurs_categories').add({
                name: categoryName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Catégorie créée avec succès', 'success');
        }
        
        closeCategoryModal();
        await loadCategories();
        await loadInterieurs();
        
        const manageCategoriesModal = document.getElementById('manageCategoriesModal');
        if (manageCategoriesModal.classList.contains('active')) {
            displayCategoriesList();
        }
    } catch (error) {
        console.error("Erreur catégorie:", error);
        showToast('Erreur lors de l\'opération', 'error');
    }
}

async function loadInterieurs() {
    const container = document.getElementById('interieursListContainer');
    
    try {
        const result = await getAllInterieurs();
        
        if (result.success && result.data.length > 0) {
            displayInterieurs(result.data);
        } else {
            container.innerHTML = `
                <div class="no-interieurs">
                    <i class="fas fa-couch"></i>
                    <h3>Aucun intérieur</h3>
                    <p>Commencez par ajouter votre premier intérieur</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Erreur lors du chargement:", error);
        showToast('Erreur lors du chargement des intérieurs', 'error');
    }
}

function displayInterieurs(interieurs) {
    const container = document.getElementById('interieursListContainer');
    container.innerHTML = '';
    
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
        section.style.marginBottom = '4rem';
        
        const header = document.createElement('h2');
        header.style.color = 'var(--secondary-color)';
        header.style.marginBottom = '1.5rem';
        header.style.fontSize = '1.8rem';
        header.innerHTML = `<i class="fas fa-folder"></i> ${categoryName} (${categoryInterieurs.length})`;
        section.appendChild(header);
        
        const grid = document.createElement('div');
        grid.className = 'interieurs-list';
        
        categoryInterieurs.forEach(interieur => {
        const card = document.createElement('div');
        card.className = 'interieur-admin-card';
        
        const imageUrl = interieur.images && interieur.images.length > 0 
            ? interieur.images[0] 
            : 'https://via.placeholder.com/400x200?text=Aucune+image';
        
        const date = interieur.createdAt && interieur.createdAt.toDate 
            ? new Date(interieur.createdAt.toDate()).toLocaleDateString('fr-FR')
            : 'Date inconnue';
        
        card.innerHTML = `
            <img src="${imageUrl}" alt="${interieur.titre}" class="interieur-admin-image">
            <div class="interieur-admin-content">
                <h3 class="interieur-admin-title">${interieur.titre}</h3>
                <p class="interieur-admin-description">${interieur.description}</p>
                <div class="interieur-admin-meta">
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                    <span><i class="fas fa-images"></i> ${interieur.images ? interieur.images.length : 0} image(s)</span>
                </div>
                <div class="interieur-admin-actions">
                    <button class="btn-edit" onclick="editInterieur('${interieur.id}')">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    <button class="btn-delete" onclick="confirmDelete('${interieur.id}', '${interieur.titre.replace(/'/g, "\\'")}')">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>
            </div>
        `;
        
            grid.appendChild(card);
        });
        
        section.appendChild(grid);
        container.appendChild(section);
    });
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const imageInput = document.getElementById('imageInput');
    
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
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });
    
    dropZone.addEventListener('drop', handleDrop, false);
    dropZone.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleFileSelect);
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

async function handleFiles(files) {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showToast('Veuillez sélectionner des images valides', 'warning');
        return;
    }
    
    const remainingSlots = 5 - currentImages.length;
    if (imageFiles.length > remainingSlots) {
        showToast(`Vous ne pouvez ajouter que ${remainingSlots} image(s) supplémentaire(s) (maximum 5)`, 'warning');
        return;
    }
    
    showToast(`Conversion de ${imageFiles.length} image(s)...`, 'info');
    
    for (const file of imageFiles) {
        try {
            const compressed = await compressImage(file);
            currentImages.push(compressed);
        } catch (error) {
            console.error("Erreur conversion image:", error);
            showToast('Erreur lors de la conversion d\'une image', 'error');
        }
    }
    
    displayImagesPreviews();
    showToast('Images ajoutées avec succès', 'success');
}

async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                const maxSize = 1200;
                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressed = canvas.toDataURL('image/jpeg', 0.7);
                resolve(compressed);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function displayImagesPreviews() {
    const container = document.getElementById('imagesPreview');
    container.innerHTML = '';
    
    currentImages.forEach((image, index) => {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `
            <img src="${image}" alt="Preview ${index + 1}">
            <button type="button" class="remove-image" onclick="removeImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

function removeImage(index) {
    currentImages.splice(index, 1);
    displayImagesPreviews();
    showToast('Image retirée', 'info');
}

function openAddModal() {
    editingInterieurId = null;
    currentImages = [];
    document.getElementById('interieurForm').reset();
    document.getElementById('imagesPreview').innerHTML = '';
    
    if (!quillEditor) {
        initQuillEditor();
    } else {
        quillEditor.setContents([]);
    }
    
    updateCategoriesSelect();
    
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Ajouter un intérieur';
    document.getElementById('interieurModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

async function editInterieur(id) {
    const result = await getInterieurById(id);
    
    if (!result.success) {
        showToast('Erreur lors du chargement de l\'intérieur', 'error');
        return;
    }
    
    const interieur = result.data;
    editingInterieurId = id;
    currentImages = interieur.images || [];
    
    document.getElementById('titre').value = interieur.titre;
    
    updateCategoriesSelect();
    if (interieur.categorieId) {
        document.getElementById('categorie').value = interieur.categorieId;
    }
    
    if (!quillEditor) {
        initQuillEditor();
    }
    
    if (interieur.description) {
        if (interieur.description.startsWith('<')) {
            quillEditor.root.innerHTML = interieur.description;
        } else {
            quillEditor.setText(interieur.description);
        }
    }
    
    displayImagesPreviews();
    
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Modifier l\'intérieur';
    document.getElementById('interieurModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function confirmDelete(id, titre) {
    if (confirm(`Voulez-vous vraiment supprimer l'intérieur "${titre}" ?`)) {
        deleteInterieurById(id);
    }
}

async function deleteInterieurById(id) {
    const result = await deleteInterieur(id);
    
    if (result.success) {
        showToast('Intérieur supprimé avec succès', 'success');
        loadInterieurs();
    } else {
        showToast('Erreur lors de la suppression', 'error');
    }
}

function closeModal() {
    document.getElementById('interieurModal').classList.remove('active');
    document.body.style.overflow = '';
    editingInterieurId = null;
    currentImages = [];
    document.getElementById('interieurForm').reset();
    document.getElementById('imagesPreview').innerHTML = '';
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const titre = document.getElementById('titre').value.trim();
    const categorieId = document.getElementById('categorie').value;
    const description = quillEditor ? quillEditor.root.innerHTML.trim() : '';
    
    if (!titre || !categorieId || !description || description === '<p><br></p>') {
        showToast('Veuillez remplir tous les champs', 'warning');
        return;
    }
    
    if (currentImages.length === 0) {
        showToast('Veuillez ajouter au moins une image', 'warning');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
    
    const interieurData = {
        titre,
        categorieId,
        description,
        images: currentImages
    };
    
    try {
        let result;
        
        if (editingInterieurId) {
            result = await updateInterieur(editingInterieurId, interieurData);
            if (result.success) {
                showToast('Intérieur modifié avec succès', 'success');
            }
        } else {
            result = await addInterieur(interieurData);
            if (result.success) {
                showToast('Intérieur ajouté avec succès', 'success');
            }
        }
        
        if (result.success) {
            closeModal();
            loadInterieurs();
        } else {
            showToast(result.error || 'Erreur lors de l\'enregistrement', 'error');
        }
    } catch (error) {
        console.error("Erreur:", error);
        showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
    }
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('interieurModal');
    if (e.target === modal) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});
