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

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
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

function checkAdminAccess() {
    const user = JSON.parse(localStorage.getItem('discord_user') || 'null');
    
    if (!user || !DISCORD_CONFIG.authorizedIds.includes(user.id)) {
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
    
    if (uploadedImages.length + filesArray.length > 5) {
        showToast('Maximum 5 images autorisées', 'error');
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
        
        uploadedImages.push(...imageUrls);
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
    
    container.innerHTML = uploadedImages.map((img, index) => `
        <div class="image-preview-item">
            <img src="${img}" alt="Image ${index + 1}">
            <button class="remove-image" onclick="removeImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

window.removeImage = function(index) {
    uploadedImages.splice(index, 1);
    displayImages();
}


async function checkActiveAuction() {
    const auction = await auctionsDB.getActiveAuction();
    
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
    startCountdown(auction.endTime);
    
    if (auctionUnsubscribe) auctionUnsubscribe();
    if (bidsUnsubscribe) bidsUnsubscribe();
    
    auctionUnsubscribe = auctionsDB.listenToAuction(auction.id, updatedAuction => {
        updateAuctionInfo(updatedAuction);
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
    
    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const end = new Date(endTime).getTime();
        const distance = end - now;
        
        if (distance < 0) {
            clearInterval(countdownInterval);
            document.getElementById('countdown').textContent = 'Enchère terminée !';
            showToast('L\'enchère est terminée', 'info');
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
    const duration = document.getElementById('duration').value;
    
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
    
    if (!duration || duration <= 0) {
        showToast('Veuillez entrer une durée valide', 'error');
        return;
    }
    
    const propertyData = {
        title,
        description,
        location,
        type,
        images: [...uploadedImages],
        price: parseFloat(startingPrice)
    };
    
    const result = await auctionsDB.createAuction(
        'auction-' + Date.now(),
        propertyData,
        startingPrice,
        duration
    );
    
    if (result.success) {
        showToast('Enchère lancée avec succès !', 'success');
        currentAuctionId = result.id;
        
        document.getElementById('propertyTitle').value = '';
        quillEditor.setContents([]);
        document.getElementById('propertyLocation').value = '';
        document.getElementById('propertyType').value = '';
        document.getElementById('startingPrice').value = '';
        document.getElementById('duration').value = '24';
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

