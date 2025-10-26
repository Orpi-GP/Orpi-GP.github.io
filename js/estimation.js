let selectedPhotos = [];
document.addEventListener('DOMContentLoaded', () => {
    const estimationForm = document.getElementById('estimationForm');
    const formMessage = document.getElementById('formMessage');
    const photosInput = document.getElementById('photos');
    const photosPreview = document.getElementById('photosPreview');
    const loginRequired = document.getElementById('loginRequired');
    
    if (!discordAuth.isLoggedIn()) {
        loginRequired.style.display = 'block';
        estimationForm.style.display = 'none';
    } else {
        loginRequired.style.display = 'none';
        estimationForm.style.display = 'block';
        
        const user = discordAuth.getUser();
        document.getElementById('connectedUser').textContent = discordAuth.getUsername(user);
    }
    
    setupDragAndDropEstimation();
    
    if (photosInput) {
        photosInput.addEventListener('change', (e) => {
            handlePhotosUpload(e.target.files);
        });
    }
    if (estimationForm) {
        estimationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = estimationForm.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');
            if (!discordAuth.isLoggedIn()) {
                showMessage('Vous devez être connecté pour envoyer une demande.', 'error');
                return;
            }
            
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            
            const user = discordAuth.getUser();
            const formData = {
                discordId: user.id,
                phone: document.getElementById('phone').value,
                propertyType: document.getElementById('propertyType').value,
                location: document.getElementById('location').value,
                rooms: document.getElementById('rooms').value,
                area: document.getElementById('area').value,
                purchasePrice: document.getElementById('purchasePrice').value,
                additionalInfo: document.getElementById('additionalInfo').value,
                photos: selectedPhotos
            };
            try {
                await ConversationsManager.add({
                    type: 'estimation',
                    data: formData
                });
                
                try {
                    await sendDiscordNotification('estimation', formData);
                } catch (webhookError) {
                    console.warn('Notification Discord non envoyée (non critique):', webhookError);
                }
                
                showMessage('Votre demande d\'estimation a été envoyée avec succès ! Vous pouvez suivre la conversation sur la page "Mes Conversations".', 'success');
                estimationForm.reset();
                selectedPhotos = [];
                photosPreview.innerHTML = '';
            } catch (error) {
                console.error('Erreur lors de l\'envoi de la demande:', error);
                showMessage('Une erreur est survenue lors de l\'envoi de votre demande. Veuillez réessayer.', 'error');
            } finally {
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        });
    }
    function handlePhotosUpload(files) {
        const maxPhotos = 2;
        const filesArray = Array.from(files);
        if (selectedPhotos.length + filesArray.length > maxPhotos) {
            toast.warning(`Vous ne pouvez ajouter que ${maxPhotos} photos maximum.`);
            return;
        }
        filesArray.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    selectedPhotos.push(e.target.result);
                    displayPhotos();
                };
                reader.readAsDataURL(file);
            }
        });
        photosInput.value = '';
    }
    function displayPhotos() {
        photosPreview.innerHTML = '';
        selectedPhotos.forEach((photo, index) => {
            const photoContainer = document.createElement('div');
            photoContainer.className = 'image-preview-item';
            photoContainer.innerHTML = `
                <img src="${photo}" alt="Photo ${index + 1}">
                <button type="button" class="remove-image" onclick="removePhoto(${index})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
            photosPreview.appendChild(photoContainer);
        });
    }
    window.removePhoto = function(index) {
        selectedPhotos.splice(index, 1);
        displayPhotos();
    };
    function showMessage(message, type) {
        formMessage.textContent = message;
        formMessage.className = `form-message ${type}`;
        formMessage.style.display = 'block';
        formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 5000);
    }
});

function setupDragAndDropEstimation() {
    const dropZone = document.getElementById('dropZoneEstimation');
    const fileInput = document.getElementById('photos');
    
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
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        const maxPhotos = 2;
        if (files.length > maxPhotos) {
            if (typeof toast !== 'undefined') {
                toast.warning(`Vous ne pouvez déposer que ${maxPhotos} images maximum !`);
            } else {
                alert(`Vous ne pouvez déposer que ${maxPhotos} images maximum !`);
            }
            return;
        }
        
        const imageFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/')
        );
        
        if (imageFiles.length === 0) {
            if (typeof toast !== 'undefined') {
                toast.warning('Veuillez déposer uniquement des fichiers images !');
            } else {
                alert('Veuillez déposer uniquement des fichiers images !');
            }
            return;
        }
        
        if (imageFiles.length !== files.length) {
            if (typeof toast !== 'undefined') {
                toast.warning('Certains fichiers ont été ignorés car ce ne sont pas des images.');
            }
        }
        
        const dataTransfer = new DataTransfer();
        imageFiles.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
        
        handlePhotosUpload(fileInput.files);
    }
}
