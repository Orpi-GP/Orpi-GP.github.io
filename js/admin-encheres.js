let currentAuctionId = null;
let auctionUnsubscribe = null;
let bidsUnsubscribe = null;
let countdownInterval = null;
let uploadedImages = [];
let quillEditor = null;

function showToast(message, type = 'info') {
    if (window.toast) {
        window.toast.show(message, type);
    }
}

async function showMediaGalleryModal(maxSelection, onSelect) {
    const WORKER_BASE = 'https://orpi-cloudinary-proxy.orpigp.workers.dev';
    
    let modal = document.getElementById('mediaGalleryModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mediaGalleryModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 90vw; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2><i class="fas fa-images"></i> Sélectionner des images depuis la galerie</h2>
                    <button class="modal-close" onclick="closeMediaGalleryModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="padding: 1rem;">
                    <div id="mediaGalleryLoading" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
                        <p>Chargement des images...</p>
                    </div>
                    <div id="mediaGalleryGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem;"></div>
                    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                        <span id="mediaGallerySelectionCount" style="font-weight: 600; color: var(--primary-color);">0 image(s) sélectionnée(s)</span>
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="closeMediaGalleryModal()" class="btn-cancel">Annuler</button>
                            <button onclick="confirmMediaGallerySelection()" class="btn-submit" id="confirmMediaSelectionBtn" disabled>
                                <i class="fas fa-check"></i> Ajouter (<span id="selectedCount">0</span>)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    let selectedMediaUrls = [];
    let allMedias = [];
    
    window.closeMediaGalleryModal = function() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        selectedMediaUrls = [];
    };
    
    window.confirmMediaGallerySelection = function() {
        if (selectedMediaUrls.length > 0 && onSelect) {
            onSelect(selectedMediaUrls);
        }
        closeMediaGalleryModal();
    };
    
    window.toggleMediaSelection = function(url) {
        const index = selectedMediaUrls.indexOf(url);
        if (index > -1) {
            selectedMediaUrls.splice(index, 1);
        } else {
            if (selectedMediaUrls.length >= maxSelection) {
                showToast(`Vous ne pouvez sélectionner que ${maxSelection} image(s) maximum !`, 'error');
                return;
            }
            selectedMediaUrls.push(url);
        }
        updateMediaGalleryDisplay();
    };
    
    function updateMediaGalleryDisplay() {
        const count = selectedMediaUrls.length;
        document.getElementById('selectedCount').textContent = count;
        document.getElementById('mediaGallerySelectionCount').textContent = `${count} image(s) sélectionnée(s)`;
        document.getElementById('confirmMediaSelectionBtn').disabled = count === 0;
        
        const grid = document.getElementById('mediaGalleryGrid');
        grid.innerHTML = allMedias.map(media => {
            const isSelected = selectedMediaUrls.includes(media.url);
            return `
                <div style="position: relative; cursor: pointer; border: ${isSelected ? '3px solid #4caf50' : '2px solid #e0e0e0'}; border-radius: 8px; overflow: hidden; aspect-ratio: 1;" onclick="toggleMediaSelection('${media.url}')">
                    <img src="${media.url}" alt="${media.filename}" style="width: 100%; height: 100%; object-fit: cover;">
                    ${isSelected ? '<div style="position: absolute; top: 5px; right: 5px; background: #4caf50; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-check" style="font-size: 0.75rem;"></i></div>' : ''}
                </div>
            `;
        }).join('');
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    document.getElementById('mediaGalleryLoading').style.display = 'block';
    document.getElementById('mediaGalleryGrid').style.display = 'none';
    
    try {
        const response = await fetch(`${WORKER_BASE}/list`);
        if (!response.ok) throw new Error('Erreur API proxy');
        const data = await response.json();
        allMedias = data.resources.map(resource => ({
            url: resource.secure_url,
            filename: resource.public_id.split('/').pop()
        }));
        
        document.getElementById('mediaGalleryLoading').style.display = 'none';
        document.getElementById('mediaGalleryGrid').style.display = 'grid';
        updateMediaGalleryDisplay();
    } catch (error) {
        console.error('Erreur chargement galerie:', error);
        document.getElementById('mediaGalleryLoading').innerHTML = `
            <p style="color: #f44336;">Erreur lors du chargement des images</p>
            <button onclick="location.reload()" class="btn-submit" style="margin-top: 1rem;">
                Réessayer
            </button>
        `;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAccess();
    initImageUpload();
    initQuillEditor();
});

function initQuillEditor() {
    quillEditor = new Quill('#editorContainer', {
        theme: 'snow',
        placeholder: 'Décrivez le bien en détail...',
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
        }
    });
}

async function checkAdminAccess() {
    const user = JSON.parse(localStorage.getItem('discord_user') || 'null');
    
    if (!user || !(await discordAuth.isAuthorized())) {
        document.getElementById('adminAccess').style.display = 'none';
        document.getElementById('accessDenied').style.display = 'block';
        return;
    }
    
    document.getElementById('accessDenied').style.display = 'none';
    document.getElementById('adminAccess').style.display = 'block';
    
    checkActiveAuction();
}

function initImageUpload() {
    const uploadZone = document.getElementById('imageUploadZone');
    const imageInput = document.getElementById('imageInput');
    
    uploadZone.addEventListener('click', () => imageInput.click());
    
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    imageInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
}

async function handleFiles(files) {
    const filesArray = Array.from(files);
    
    if (uploadedImages.length + filesArray.length > 10) {
        showToast('Maximum 10 images autorisées', 'error');
        return;
    }
    
    const imageFiles = filesArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showToast('Veuillez sélectionner des images valides', 'error');
        return;
    }
    
    showToast(`Upload de ${imageFiles.length} image(s) vers Cloudinary...`, 'info');
    
    try {
        const imageUrls = await cloudinaryUpload.uploadMultipleImages(
            imageFiles,
            (progress, current, total) => {
                showToast(`Upload ${current}/${total} (${Math.round(progress)}%)`, 'info');
            }
        );
        
        const newImages = imageUrls.map(url => ({ url, featured: false }));
        uploadedImages.push(...newImages);
        displayImages();
        showToast('Images ajoutées avec succès', 'success');
    } catch (error) {
        console.error('Erreur upload images:', error);
        showToast('Erreur lors de l\'upload des images', 'error');
    }
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                const maxSize = 1200;
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = (height / width) * maxSize;
                        width = maxSize;
                    } else {
                        width = (width / height) * maxSize;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    const reader2 = new FileReader();
                    reader2.onloadend = () => resolve(reader2.result);
                    reader2.readAsDataURL(blob);
                }, 'image/jpeg', 0.7);
            };
            
            img.onerror = reject;
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function displayImages() {
    const container = document.getElementById('imagesPreview');
    
    if (uploadedImages.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = uploadedImages.map((imgObj, index) => {
        const imgUrl = typeof imgObj === 'string' ? imgObj : imgObj.url;
        const isFeatured = typeof imgObj === 'object' ? imgObj.featured : false;
        return `
        <div class="image-preview-item" style="position: relative; ${isFeatured ? 'border: 3px solid #4caf50;' : ''}">
            <img src="${imgUrl}" alt="Image ${index + 1}">
            <button class="remove-image" onclick="removeImage(${index})">
                <i class="fas fa-times"></i>
            </button>
            <label class="featured-checkbox" style="position: absolute; top: 5px; left: 5px; background: rgba(255,255,255,0.9); padding: 5px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <input type="checkbox" ${isFeatured ? 'checked' : ''} onchange="setFeaturedImage(${index})" style="cursor: pointer;">
                <span style="font-size: 0.85rem; font-weight: bold; color: #4caf50;">En avant</span>
            </label>
        </div>
    `;
    }).join('');
}

window.removeImage = function(index) {
    uploadedImages.splice(index, 1);
    displayImages();
}

window.setFeaturedImage = function(index) {
    uploadedImages = uploadedImages.map((img, i) => {
        if (typeof img === 'string') {
            return { url: img, featured: false };
        }
        return img;
    });
    
    uploadedImages.forEach((img, i) => {
        img.featured = (i === index);
    });
    
    displayImages();
}

window.addImagesFromGallery = async function() {
    const remainingSlots = 10 - uploadedImages.length;
    if (remainingSlots <= 0) {
        showToast('Vous avez déjà atteint la limite de 10 images !', 'error');
        return;
    }
    
    await showMediaGalleryModal(remainingSlots, (selectedUrls) => {
        const newImages = selectedUrls.map(url => ({ url, featured: false }));
        uploadedImages.push(...newImages);
        displayImages();
        showToast(`${selectedUrls.length} image(s) ajoutée(s) depuis la galerie`, 'success');
    });
}


async function checkActiveAuction() {
    let auction = await auctionsDB.getActiveAuction();
    
    if (!auction) {
        try {
            const allAuctions = await auctionsDB.getAllAuctions();
            const closedAuctions = allAuctions.filter(a => a.status === 'closed');
            if (closedAuctions.length > 0) {
                const lastClosed = closedAuctions[0];
                const closedAt = lastClosed.closedAt ? new Date(lastClosed.closedAt).getTime() : 0;
                const now = Date.now();
                if (now - closedAt < 24 * 60 * 60 * 1000) {
                    auction = lastClosed;
                }
            }
        } catch (error) {
            console.error('Erreur récupération enchères clôturées:', error);
        }
    }
    
    if (auction) {
        currentAuctionId = auction.id;
        showCurrentAuction(auction);
    } else {
        showCreateForm();
    }
}

function showCreateForm() {
    document.getElementById('createAuctionSection').style.display = 'block';
    document.getElementById('currentAuctionSection').style.display = 'none';
}

function showCurrentAuction(auction) {
    document.getElementById('createAuctionSection').style.display = 'none';
    document.getElementById('currentAuctionSection').style.display = 'block';
    
    displayAuctionProperty(auction.propertyData);
    updateAuctionInfo(auction);
    
    const isClosed = auction.status === 'closed';
    const stopBtn = document.querySelector('.btn-stop');
    const deleteBtn = document.getElementById('deleteAuctionBtn');
    
    if (isClosed) {
        if (countdownInterval) clearInterval(countdownInterval);
        document.getElementById('countdown').textContent = 'Enchère terminée !';
        if (stopBtn) stopBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'block';
    } else {
        if (stopBtn) stopBtn.style.display = 'block';
        if (deleteBtn) deleteBtn.style.display = 'none';
        startCountdown(auction.endTime);
    }
    
    if (auctionUnsubscribe) auctionUnsubscribe();
    if (bidsUnsubscribe) bidsUnsubscribe();
    
    auctionUnsubscribe = auctionsDB.listenToAuction(auction.id, updatedAuction => {
        updateAuctionInfo(updatedAuction);
        if (updatedAuction.status === 'closed' && !isClosed) {
            showCurrentAuction(updatedAuction);
        }
    });
    
    bidsUnsubscribe = auctionsDB.listenToBids(auction.id, bids => {
        displayBids(bids);
    });
}

function displayAuctionProperty(property) {
    const container = document.getElementById('auctionProperty');
    const imageUrl = property.images && property.images.length > 0 ? property.images[0] : 'images/placeholder.jpg';
    
    const descriptionHtml = property.description && property.description.includes('<') 
        ? property.description 
        : `<p>${property.description || ''}</p>`;
    
    container.innerHTML = `
        <img src="${imageUrl}" alt="${property.title}">
        <div>
            <h3>${property.title}</h3>
            <div>${descriptionHtml}</div>
            <p><strong>Localisation :</strong> ${property.location || 'Non spécifié'}</p>
            <p><strong>Type :</strong> ${property.type || 'Non spécifié'}</p>
        </div>
    `;
}

function updateAuctionInfo(auction) {
    document.getElementById('startPrice').textContent = auction.startingPrice.toLocaleString('fr-FR') + ' €';
    document.getElementById('currentPrice').textContent = auction.currentPrice.toLocaleString('fr-FR') + ' €';
    document.getElementById('bidsCount').textContent = auction.bidsCount || 0;
    document.getElementById('highestBidder').textContent = auction.highestBidder || 'Aucune enchère';
}

function startCountdown(endTime) {
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(async () => {
        const now = new Date().getTime();
        const end = new Date(endTime).getTime();
        const distance = end - now;
        
        if (distance < 0) {
            clearInterval(countdownInterval);
            document.getElementById('countdown').textContent = 'Enchère terminée !';
            showToast('L\'enchère est terminée', 'info');
            
            if (currentAuctionId) {
                try {
                    const auction = await auctionsDB.getAuction(currentAuctionId);
                    if (auction && auction.status !== 'closed') {
                        await auctionsDB.closeAuction(currentAuctionId);
                        console.log('Enchère clôturée automatiquement');
                        const updatedAuction = await auctionsDB.getAuction(currentAuctionId);
                        if (updatedAuction) {
                            updateAuctionInfo(updatedAuction);
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la fermeture automatique:', error);
                }
            }
            return;
        }
        
        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        document.getElementById('countdown').textContent = 
            `${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

function displayBids(bids) {
    const container = document.getElementById('bidsList');
    
    if (!bids || bids.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">Aucune enchère pour le moment</p>';
        return;
    }
    
    bids.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    container.innerHTML = bids.map((bid, index) => {
        const timestamp = bid.timestamp ? new Date(bid.timestamp).toLocaleString('fr-FR') : 'Date inconnue';
        const bidderName = bid.bidderName || 'Anonyme';
        const bidAmount = bid.bidAmount ? parseFloat(bid.bidAmount).toLocaleString('fr-FR') : '0';
        
        return `
            <div class="bid-item ${index === 0 ? 'highest' : ''}">
                <div>
                    <strong>${bidderName}</strong>
                    <br>
                    <small>${timestamp}</small>
                </div>
                <div style="font-size: 1.2rem; font-weight: bold; color: #E30613;">
                    ${bidAmount} €
                </div>
            </div>
        `;
    }).join('');
}

window.startAuction = async function() {
    const title = document.getElementById('propertyTitle').value.trim();
    const description = quillEditor.root.innerHTML.trim();
    const descriptionText = quillEditor.getText().trim();
    const location = document.getElementById('propertyLocation').value.trim();
    const type = document.getElementById('propertyType').value;
    const startingPrice = document.getElementById('startingPrice').value;
    const durationValue = parseFloat(document.getElementById('duration').value);
    const durationUnit = document.getElementById('durationUnit').value;
    
    if (!title) {
        showToast('Veuillez entrer un titre', 'error');
        return;
    }
    
    if (!descriptionText) {
        showToast('Veuillez entrer une description', 'error');
        return;
    }
    
    if (!location) {
        showToast('Veuillez entrer une localisation', 'error');
        return;
    }
    
    if (!type) {
        showToast('Veuillez sélectionner un type de bien', 'error');
        return;
    }
    
    if (uploadedImages.length === 0) {
        showToast('Veuillez ajouter au moins une image', 'error');
        return;
    }
    
    if (!startingPrice || startingPrice <= 0) {
        showToast('Veuillez entrer un prix de départ valide', 'error');
        return;
    }
    
    if (!durationValue || durationValue <= 0) {
        showToast('Veuillez entrer une durée valide', 'error');
        return;
    }
    
    let durationInHours = durationUnit === 'minutes' ? durationValue / 60 : durationValue;
    
    let imagesArray = uploadedImages.map(img => typeof img === 'string' ? img : img.url);
    const featuredIndex = uploadedImages.findIndex(img => 
        typeof img === 'object' && img.featured === true
    );
    
    if (featuredIndex !== -1) {
        const featuredImage = imagesArray[featuredIndex];
        imagesArray.splice(featuredIndex, 1);
        imagesArray.unshift(featuredImage);
    }
    
    const propertyData = {
        title,
        description,
        location,
        type,
        images: imagesArray,
        price: parseFloat(startingPrice)
    };
    
    const result = await auctionsDB.createAuction(
        'auction-' + Date.now(),
        propertyData,
        startingPrice,
        durationInHours
    );
    
    if (result.success) {
        showToast('Enchère lancée avec succès !', 'success');
        currentAuctionId = result.id;
        
        document.getElementById('propertyTitle').value = '';
        quillEditor.setContents([]);
        document.getElementById('propertyLocation').value = '';
        document.getElementById('propertyType').value = '';
        document.getElementById('startingPrice').value = '';
        document.getElementById('duration').value = '30';
        document.getElementById('durationUnit').value = 'minutes';
        uploadedImages = [];
        displayImages();
        
        checkActiveAuction();
    } else {
        showToast('Erreur lors du lancement de l\'enchère', 'error');
    }
}

window.stopAuction = async function() {
    if (!currentAuctionId) return;
    
    if (!confirm('Êtes-vous sûr de vouloir arrêter cette enchère ?')) {
        return;
    }
    
    try {
        const auction = await auctionsDB.getAuction(currentAuctionId);
        
        if (auction && auction.propertyData && auction.propertyData.images && Array.isArray(auction.propertyData.images)) {
            for (const imageUrl of auction.propertyData.images) {
                if (imageUrl.includes('cloudinary.com')) {
                    await cloudinaryUpload.deleteImage(imageUrl);
                }
            }
        }
    } catch (error) {
        console.error('Erreur suppression images:', error);
    }
    
    const result = await auctionsDB.closeAuction(currentAuctionId);
    
    if (result.success) {
        showToast('Enchère arrêtée avec succès', 'success');
        
        if (auctionUnsubscribe) auctionUnsubscribe();
        if (bidsUnsubscribe) bidsUnsubscribe();
        if (countdownInterval) clearInterval(countdownInterval);
        
        currentAuctionId = null;
        checkActiveAuction();
    } else {
        showToast('Erreur lors de l\'arrêt de l\'enchère', 'error');
    }
}

window.deleteAuction = async function() {
    if (!currentAuctionId) return;
    
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer définitivement cette enchère ?\n\nCette action est irréversible et supprimera également toutes les enchères associées.')) {
        return;
    }
    
    if (!auctionsDB || typeof auctionsDB.deleteAuction !== 'function') {
        console.error('deleteAuction n\'est pas disponible. Vérifiez que firebase-auctions.js est chargé.');
        showToast('Erreur : fonction de suppression non disponible. Veuillez recharger la page.', 'error');
        return;
    }
    
    try {
        const auction = await auctionsDB.getAuction(currentAuctionId);
        
        if (auction && auction.propertyData && auction.propertyData.images && Array.isArray(auction.propertyData.images)) {
            for (const imageUrl of auction.propertyData.images) {
                if (imageUrl.includes('cloudinary.com')) {
                    try {
                        await cloudinaryUpload.deleteImage(imageUrl);
                    } catch (error) {
                        console.error('Erreur suppression image Cloudinary:', error);
                    }
                }
            }
        }
        
        const result = await auctionsDB.deleteAuction(currentAuctionId);
        
        if (result && result.success) {
            showToast('Enchère supprimée avec succès', 'success');
            
            if (auctionUnsubscribe) auctionUnsubscribe();
            if (bidsUnsubscribe) bidsUnsubscribe();
            if (countdownInterval) clearInterval(countdownInterval);
            
            currentAuctionId = null;
            checkActiveAuction();
        } else {
            showToast('Erreur lors de la suppression de l\'enchère', 'error');
        }
    } catch (error) {
        console.error('Erreur suppression enchère:', error);
        showToast('Erreur lors de la suppression de l\'enchère: ' + error.message, 'error');
    }
}

