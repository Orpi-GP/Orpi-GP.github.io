let bannerUnsubscribe = null;

function initAuctionBanner() {
    checkForActiveBanner();
    
    setInterval(checkForActiveBanner, 60000);
}

async function checkForActiveBanner() {
    const auction = await auctionsDB.getActiveAuction();
    
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
                background: linear-gradient(135deg, #E30613, #ff4444);
                color: white;
                padding: 12px 20px;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                animation: slideDown 0.3s ease-out;
            }
            
            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
            
            .banner-content {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
            }
            
            .banner-text {
                display: flex;
                align-items: center;
                gap: 15px;
                flex: 1;
            }
            
            .banner-icon {
                font-size: 1.5rem;
                animation: bounce 1s infinite;
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }
            
            .banner-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            
            .banner-title {
                font-weight: bold;
                font-size: 1.1rem;
            }
            
            .banner-details {
                font-size: 0.9rem;
                opacity: 0.95;
            }
            
            .banner-action {
                background: white;
                color: #E30613;
                padding: 10px 30px;
                border-radius: 25px;
                text-decoration: none;
                font-weight: bold;
                transition: all 0.3s;
                white-space: nowrap;
            }
            
            .banner-action:hover {
                background: #f0f0f0;
                transform: scale(1.05);
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
    
    const property = auction.propertyData;
    const endTime = new Date(auction.endTime);
    const now = new Date();
    const hoursLeft = Math.floor((endTime - now) / (1000 * 60 * 60));
    
    title.textContent = `🔥 Enchère : ${property.title}`;
    details.textContent = `Prix actuel : ${auction.currentPrice.toLocaleString('fr-FR')} € • Temps restant : ${hoursLeft}h`;
}

function hideBanner() {
    const banner = document.getElementById('auctionBanner');
    const navbar = document.querySelector('.navbar');
    
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

