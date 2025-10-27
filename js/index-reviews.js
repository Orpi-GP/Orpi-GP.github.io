let allReviews = [];
let currentReviewIndex = 0;
let carouselInterval;

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    loadCarouselReviews();
    startCarouselAutoplay();
});

async function loadCarouselReviews() {
    try {
        const reviews = await ReviewsManager.getAllReviews();
        allReviews = reviews.slice(0, 10);
        
        if (allReviews.length === 0) {
            document.getElementById('reviewsCarousel').innerHTML = `
                <div class="no-reviews-carousel">
                    <i class="fas fa-star"></i>
                    <p>Aucun avis pour le moment</p>
                    <a href="avis.html" class="btn btn-secondary">Soyez le premier à donner votre avis</a>
                </div>
            `;
            return;
        }
        
        renderCarousel();
        renderDots();
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

function renderCarousel() {
    const container = document.getElementById('reviewsCarousel');
    
    container.innerHTML = allReviews.map((review, index) => `
        <div class="carousel-slide ${index === currentReviewIndex ? 'active' : ''}">
            <div class="review-carousel-card">
                <div class="review-stars">
                    ${renderStars(review.rating)}
                </div>
                <h3 class="review-title">${escapeHtml(review.title)}</h3>
                <p class="review-text">${escapeHtml(review.comment)}</p>
                <div class="review-author">
                    <div class="author-avatar">
                        ${escapeHtml(review.name.charAt(0).toUpperCase())}
                    </div>
                    <div class="author-info">
                        <div class="author-name">${escapeHtml(review.name)}</div>
                        <div class="author-date">${formatDate(review.createdAt)}</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderDots() {
    const dotsContainer = document.getElementById('carouselDots');
    dotsContainer.innerHTML = allReviews.map((_, index) => `
        <span class="dot ${index === currentReviewIndex ? 'active' : ''}" onclick="goToReview(${index})"></span>
    `).join('');
}

function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

function formatDate(timestamp) {
    if (!timestamp) return 'Récemment';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = now - date;
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return "À l'instant";
    if (diffMinutes < 60) return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long'
    });
}

function nextReview() {
    if (allReviews.length === 0) return;
    
    currentReviewIndex = (currentReviewIndex + 1) % allReviews.length;
    updateCarousel();
    resetAutoplay();
}

function prevReview() {
    if (allReviews.length === 0) return;
    
    currentReviewIndex = (currentReviewIndex - 1 + allReviews.length) % allReviews.length;
    updateCarousel();
    resetAutoplay();
}

function goToReview(index) {
    currentReviewIndex = index;
    updateCarousel();
    resetAutoplay();
}

function updateCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    
    slides.forEach((slide, index) => {
        if (index === currentReviewIndex) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });
    
    dots.forEach((dot, index) => {
        if (index === currentReviewIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function startCarouselAutoplay() {
    carouselInterval = setInterval(() => {
        if (allReviews.length > 0) {
            nextReview();
        }
    }, 5000);
}

function resetAutoplay() {
    clearInterval(carouselInterval);
    startCarouselAutoplay();
}

