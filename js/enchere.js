let currentAuction = null;
let auctionUnsubscribe = null;
let bidsUnsubscribe = null;
let countdownInterval = null;
let currentImageIndex = 0;
let propertyImages = [];

function showToast(message, type = 'info') {
    if (window.toast) {
        window.toast.show(message, type);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuction();
});

async function checkAuction() {
    let auction = await auctionsDB.getActiveAuction();
    
    // Si pas d'enchère active, vérifier s'il y a une enchère clôturée récemment (pour afficher les résultats)
    if (!auction) {
        try {
            const allAuctions = await auctionsDB.getAllAuctions();
            // Récupérer la dernière enchère clôturée (si elle a été clôturée il y a moins de 24h)
            const closedAuctions = allAuctions.filter(a => a.status === 'closed');
            if (closedAuctions.length > 0) {
                const lastClosed = closedAuctions[0];
                const closedAt = lastClosed.closedAt ? new Date(lastClosed.closedAt).getTime() : 0;
                const now = Date.now();
                // Afficher les résultats si l'enchère a été clôturée il y a moins de 24h
                if (now - closedAt < 24 * 60 * 60 * 1000) {
                    auction = lastClosed;
                }
            }
        } catch (error) {
            console.error('Erreur récupération enchères clôturées:', error);
        }
    }
    
    if (!auction) {
        document.getElementById('noAuction').style.display = 'block';
        document.getElementById('auctionContent').style.display = 'none';
        return;
    }
    
    currentAuction = auction;
    document.getElementById('noAuction').style.display = 'none';
    document.getElementById('auctionContent').style.display = 'block';
    
    displayAuction(auction);
    
    // Si l'enchère est clôturée, afficher "Enchère terminée" et désactiver le bouton
    if (auction.status === 'closed') {
        document.getElementById('countdown').textContent = 'Enchère terminée !';
        const bidButton = document.querySelector('.btn-bid');
        if (bidButton) bidButton.disabled = true;
    } else {
        startCountdown(auction.endTime);
    }
    
    auctionUnsubscribe = auctionsDB.listenToAuction(auction.id, updatedAuction => {
        currentAuction = updatedAuction;
        updateAuctionInfo(updatedAuction);
        // Si l'enchère vient d'être clôturée, mettre à jour l'affichage
        if (updatedAuction.status === 'closed') {
            document.getElementById('countdown').textContent = 'Enchère terminée !';
            const bidButton = document.querySelector('.btn-bid');
            if (bidButton) bidButton.disabled = true;
            if (countdownInterval) clearInterval(countdownInterval);
        }
    });
    
    bidsUnsubscribe = auctionsDB.listenToBids(auction.id, bids => {
        displayBids(bids);
    });
}

function displayAuction(auction) {
    const property = auction.propertyData;
    
    propertyImages = property.images && property.images.length > 0 ? property.images : ['images/placeholder.jpg'];
    currentImageIndex = 0;
    updateImageDisplay();
    
    document.getElementById('propertyTitle').textContent = property.title;
    
    const descriptionContainer = document.getElementById('propertyDescription');
    if (property.description && property.description.includes('<')) {
        descriptionContainer.innerHTML = property.description;
    } else {
        descriptionContainer.textContent = property.description || 'Aucune description disponible';
    }
    
    const detailsContainer = document.getElementById('propertyDetails');
    detailsContainer.innerHTML = `
        <div class="detail-item">
            <i class="fas fa-map-marker-alt"></i>
            <div>${property.location || 'Non spécifié'}</div>
        </div>
        <div class="detail-item">
            <i class="fas fa-home"></i>
            <div>${property.type || 'Non spécifié'}</div>
        </div>
        <div class="detail-item">
            <i class="fas fa-tag"></i>
            <div>${property.price ? property.price.toLocaleString('fr-FR') + ' €' : '-'}</div>
        </div>
    `;
    
    updateAuctionInfo(auction);
}

function updateImageDisplay() {
    const imgElement = document.getElementById('propertyImage');
    imgElement.src = propertyImages[currentImageIndex];
    
    document.getElementById('imageCounter').textContent = `${currentImageIndex + 1} / ${propertyImages.length}`;
    
    const prevBtn = document.getElementById('prevImage');
    const nextBtn = document.getElementById('nextImage');
    
    prevBtn.disabled = currentImageIndex === 0;
    nextBtn.disabled = currentImageIndex === propertyImages.length - 1;
    
    if (propertyImages.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
    }
}

function changeImage(direction) {
    const newIndex = currentImageIndex + direction;
    
    if (newIndex >= 0 && newIndex < propertyImages.length) {
        currentImageIndex = newIndex;
        updateImageDisplay();
    }
}

function updateAuctionInfo(auction) {
    document.getElementById('currentPrice').textContent = auction.currentPrice.toLocaleString('fr-FR') + ' €';
    document.getElementById('startingPrice').textContent = auction.startingPrice.toLocaleString('fr-FR') + ' €';
    document.getElementById('bidsCount').textContent = auction.bidsCount || 0;
    
    const bidAmountInput = document.getElementById('bidAmount');
    bidAmountInput.min = auction.currentPrice + 1000;
    bidAmountInput.placeholder = `Minimum : ${(auction.currentPrice + 1000).toLocaleString('fr-FR')} €`;
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
            const bidButton = document.querySelector('.btn-bid');
            if (bidButton) bidButton.disabled = true;
            showToast('L\'enchère est terminée', 'info');
            
            // Fermer automatiquement l'enchère dans Firestore
            if (currentAuction && currentAuction.status !== 'closed') {
                try {
                    await auctionsDB.closeAuction(currentAuction.id);
                    console.log('Enchère clôturée automatiquement');
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
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function displayBids(bids) {
    const container = document.getElementById('bidsList');
    
    if (bids.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">Aucune enchère pour le moment. Soyez le premier à enchérir !</p>';
        return;
    }
    
    container.innerHTML = bids.map((bid, index) => `
        <div class="bid-item ${index === 0 ? 'highest' : ''}">
            <div class="bid-info">
                <strong>${bid.bidderName}</strong>
                ${index === 0 ? ' <span style="color: #4caf50;"><i class="fas fa-trophy"></i> Meilleure enchère</span>' : ''}
                <div class="bid-time">${new Date(bid.timestamp).toLocaleString('fr-FR')}</div>
            </div>
            <div class="bid-amount">
                ${bid.bidAmount.toLocaleString('fr-FR')} €
            </div>
        </div>
    `).join('');
}

async function placeBid() {
    if (!currentAuction) return;
    
    const bidderName = document.getElementById('bidderName').value.trim();
    const bidAmount = parseFloat(document.getElementById('bidAmount').value);
    
    if (!bidderName) {
        showToast('Veuillez entrer votre nom', 'error');
        return;
    }
    
    if (!bidAmount || bidAmount <= currentAuction.currentPrice) {
        showToast(`Votre enchère doit être supérieure à ${currentAuction.currentPrice.toLocaleString('fr-FR')} €`, 'error');
        return;
    }
    
    const now = new Date().getTime();
    const end = new Date(currentAuction.endTime).getTime();
    if (now >= end) {
        showToast('Cette enchère est terminée', 'error');
        return;
    }
    
    const discordUser = JSON.parse(localStorage.getItem('discord_user') || 'null');
    
    const result = await auctionsDB.placeBid(
        currentAuction.id,
        bidderName,
        bidAmount,
        discordUser
    );
    
    if (result.success) {
        showToast('Enchère placée avec succès !', 'success');
        document.getElementById('bidAmount').value = '';
    } else {
        showToast('Erreur lors du placement de l\'enchère', 'error');
    }
}

function addQuickBid(amount) {
    const currentBid = currentAuction ? currentAuction.currentPrice : 0;
    const newBid = currentBid + amount;
    document.getElementById('bidAmount').value = newBid;
}

window.addEventListener('beforeunload', () => {
    if (auctionUnsubscribe) auctionUnsubscribe();
    if (bidsUnsubscribe) bidsUnsubscribe();
    if (countdownInterval) clearInterval(countdownInterval);
});

