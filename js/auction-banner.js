let bannerUnsubscribe = null;
let bannerCountdownInterval = null;

function initAuctionBanner() {
    checkForActiveBanner();
    
    setInterval(checkForActiveBanner, 60000);
}

async function checkForActiveBanner() {
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
        showBanner(auction);
    } else {
        hideBanner();
    }
}

function showBanner(auction) {
    let banner = document.getElementById('auctionBanner');
    
    if (!banner) {
        banner = createBanner();
        document.body.insertBefore(banner, document.body.firstChild);
    }
    
    updateBannerContent(banner, auction);
    banner.style.display = 'block';
    
    const bannerHeight = banner.offsetHeight || 60;
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.style.top = bannerHeight + 'px';
    }
    
    document.body.style.paddingTop = (bannerHeight + 70) + 'px';
}

function createBanner() {
    const banner = document.createElement('div');
    banner.id = 'auctionBanner';
    banner.innerHTML = `
        <style>
            #auctionBanner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                background-size: 200% 200%;
                color: white;
                padding: 16px 24px;
                z-index: 9999;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
                border-bottom: 3px solid #E30613;
                animation: slideDown 0.4s ease-out, gradientShift 4s ease infinite;
            }
            
            #auctionBanner.closed {
                background: linear-gradient(135deg, #2d5016 0%, #1e3a0f 50%, #0f2810 100%);
                background-size: 200% 200%;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                border-bottom: 3px solid #4caf50;
            }
            
            @keyframes slideDown {
                from { transform: translateY(-100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes gradientShift {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
            }
            
            .banner-content {
                max-width: 1400px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 24px;
            }
            
            .banner-text {
                display: flex;
                align-items: center;
                gap: 18px;
                flex: 1;
            }
            
            .banner-icon {
                font-size: 2rem;
                animation: bounce 1.5s infinite;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
            }
            
            #auctionBanner.closed .banner-icon {
                animation: none;
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                25% { transform: translateY(-8px) rotate(-5deg); }
                75% { transform: translateY(-8px) rotate(5deg); }
            }
            
            .banner-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .banner-title {
                font-weight: 700;
                font-size: 1.2rem;
                text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                letter-spacing: 0.3px;
            }
            
            .banner-details {
                font-size: 0.95rem;
                opacity: 0.98;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .banner-price {
                font-weight: 700;
                color: #ffd700;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }
            
            .banner-time {
                font-weight: 600;
                background: rgba(227, 6, 19, 0.3);
                padding: 4px 12px;
                border-radius: 12px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(227, 6, 19, 0.5);
            }
            
            #auctionBanner.closed .banner-time {
                background: rgba(76, 175, 80, 0.3);
                border: 1px solid rgba(76, 175, 80, 0.5);
            }
            
            .banner-action {
                background: #E30613;
                color: white;
                padding: 12px 32px;
                border-radius: 30px;
                text-decoration: none;
                font-weight: 700;
                transition: all 0.3s ease;
                white-space: nowrap;
                box-shadow: 0 4px 12px rgba(227, 6, 19, 0.4);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .banner-action:hover {
                background: #c20510;
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(227, 6, 19, 0.5);
            }
            
            #auctionBanner.closed .banner-action {
                background: #4caf50;
                box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
            }
            
            #auctionBanner.closed .banner-action:hover {
                background: #45a049;
                box-shadow: 0 6px 16px rgba(76, 175, 80, 0.5);
            }
            
            @media (max-width: 768px) {
                .banner-content {
                    flex-direction: column;
                    gap: 10px;
                }
                
                .banner-text {
                    flex-direction: column;
                    text-align: center;
                }
                
                .banner-action {
                    width: 100%;
                    text-align: center;
                }
            }
        </style>
        <div class="banner-content">
            <div class="banner-text">
                <div class="banner-icon">
                    <i class="fas fa-gavel"></i>
                </div>
                <div class="banner-info">
                    <div class="banner-title" id="bannerTitle">Enchère en cours !</div>
                    <div class="banner-details" id="bannerDetails">Cliquez pour participer</div>
                </div>
            </div>
            <a href="enchere.html" class="banner-action">
                <i class="fas fa-arrow-right"></i> Voir l'Enchère
            </a>
        </div>
    `;
    
    return banner;
}

function updateBannerContent(banner, auction) {
    const title = banner.querySelector('#bannerTitle');
    const details = banner.querySelector('#bannerDetails');
    const actionBtn = banner.querySelector('.banner-action');
    
    const property = auction.propertyData;
    const isClosed = auction.status === 'closed';
    
    if (isClosed) {
        banner.classList.add('closed');
        title.innerHTML = `<i class="fas fa-check-circle"></i> Enchère terminée : ${property.title}`;
        actionBtn.innerHTML = '<i class="fas fa-eye"></i> Voir les résultats';
    } else {
        banner.classList.remove('closed');
        title.innerHTML = `<i class="fas fa-fire"></i> Enchère en cours : ${property.title}`;
        actionBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Voir l\'Enchère';
    }
    
    if (bannerCountdownInterval) {
        clearInterval(bannerCountdownInterval);
    }
    
    function updateCountdown() {
        const endTime = new Date(auction.endTime);
        const now = new Date();
        const distance = endTime - now;
        
        if (distance < 0 || isClosed) {
            const priceHtml = `<span class="banner-price">${auction.currentPrice.toLocaleString('fr-FR')} €</span>`;
            const winnerHtml = auction.highestBidder ? ` • Gagnant : <strong>${auction.highestBidder}</strong>` : '';
            details.innerHTML = `Prix final : ${priceHtml}${winnerHtml}`;
            if (bannerCountdownInterval) {
                clearInterval(bannerCountdownInterval);
            }
            return;
        }
        
        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        let timeString = '';
        if (hours > 0) {
            timeString = `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
        } else {
            timeString = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
        }
        
        const priceHtml = `<span class="banner-price">${auction.currentPrice.toLocaleString('fr-FR')} €</span>`;
        const timeHtml = `<span class="banner-time">${timeString}</span>`;
        details.innerHTML = `Prix actuel : ${priceHtml} • Temps restant : ${timeHtml}`;
    }
    
    updateCountdown();
    if (!isClosed) {
        bannerCountdownInterval = setInterval(updateCountdown, 1000);
    }
}

function hideBanner() {
    const banner = document.getElementById('auctionBanner');
    const navbar = document.querySelector('.navbar');
    
    if (bannerCountdownInterval) {
        clearInterval(bannerCountdownInterval);
        bannerCountdownInterval = null;
    }
    
    if (banner) {
        banner.style.display = 'none';
    }
    
    if (navbar) {
        navbar.style.top = '0';
    }
    
    document.body.style.paddingTop = '0';
}

if (typeof auctionsDB !== 'undefined') {
    initAuctionBanner();
}

