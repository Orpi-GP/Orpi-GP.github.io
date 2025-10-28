let currentAuction = null;
let auctionUnsubscribe = null;
let bidsUnsubscribe = null;
let countdownInterval = null;

function showToast(message, type = 'info') {
    if (window.toast) {
        window.toast.show(message, type);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuction();
});

async function checkAuction() {
    const auction = await auctionsDB.getActiveAuction();
    
    if (!auction) {
        document.getElementById('noAuction').style.display = 'block';
        document.getElementById('auctionContent').style.display = 'none';
        return;
    }
    
    currentAuction = auction;
    document.getElementById('noAuction').style.display = 'none';
    document.getElementById('auctionContent').style.display = 'block';
    
    displayAuction(auction);
    startCountdown(auction.endTime);
    
    auctionUnsubscribe = auctionsDB.listenToAuction(auction.id, updatedAuction => {
        currentAuction = updatedAuction;
        updateAuctionInfo(updatedAuction);
    });
    
    bidsUnsubscribe = auctionsDB.listenToBids(auction.id, bids => {
        displayBids(bids);
    });
}

function displayAuction(auction) {
    const property = auction.propertyData;
    
    const imageUrl = property.images && property.images.length > 0 ? property.images[0] : 'images/placeholder.jpg';
    document.getElementById('propertyImage').src = imageUrl;
    document.getElementById('propertyImage').alt = property.title;
    
    document.getElementById('propertyTitle').textContent = property.title;
    document.getElementById('propertyDescription').textContent = property.description || 'Aucune description disponible';
    
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
    
    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const end = new Date(endTime).getTime();
        const distance = end - now;
        
        if (distance < 0) {
            clearInterval(countdownInterval);
            document.getElementById('countdown').textContent = 'Enchère terminée !';
            document.querySelector('.btn-bid').disabled = true;
            showToast('L\'enchère est terminée', 'info');
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
                ${index === 0 ? ' <span style="color: #4caf50;">🏆 Meilleure enchère</span>' : ''}
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

