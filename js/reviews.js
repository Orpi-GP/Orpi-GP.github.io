let allReviews = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadReviews();
    setupEventListeners();
    loadStatistics();
});

function setupEventListeners() {
    const form = document.getElementById('reviewForm');
    if (form) {
        form.addEventListener('submit', handleReviewSubmit);
    }

    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.rating;
            renderReviews();
        });
    });

    const starInputs = document.querySelectorAll('.star-rating input[type="radio"]');
    starInputs.forEach(input => {
        input.addEventListener('change', updateStarRating);
    });
}

function updateStarRating() {
    const rating = parseInt(this.value);
    const labels = document.querySelectorAll('.star-rating label');
    
    labels.forEach((label, index) => {
        const starValue = 5 - index;
        if (starValue <= rating) {
            label.style.color = '#ffc107';
        } else {
            label.style.color = '#ddd';
        }
    });
}

function loadReviews() {
    ReviewsManager.listenToReviews((reviews) => {
        allReviews = reviews;
        renderReviews();
        loadStatistics();
    });
}

async function loadStatistics() {
    const stats = await ReviewsManager.getStatistics();
    
    document.getElementById('totalReviews').textContent = stats.total;
    document.getElementById('averageRating').textContent = stats.average;
    
    const starsContainer = document.getElementById('averageStars');
    starsContainer.innerHTML = renderStars(parseFloat(stats.average));
}

function renderReviews() {
    const container = document.getElementById('reviewsList');
    
    let filteredReviews = allReviews;
    if (currentFilter !== 'all') {
        filteredReviews = allReviews.filter(r => r.rating === parseInt(currentFilter));
    }
    
    if (filteredReviews.length === 0) {
        container.innerHTML = `
            <div class="no-reviews">
                <i class="fas fa-star"></i>
                <p>Aucun avis pour le moment. Soyez le premier à laisser un avis !</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredReviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div class="review-author">
                    <div class="review-avatar">
                        ${review.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="review-info">
                        <h3>${review.name}</h3>
                        <div class="review-date">${formatDate(review.createdAt)}</div>
                    </div>
                </div>
                <div class="review-stars">
                    ${renderStars(review.rating)}
                </div>
            </div>
            <div class="review-title">${review.title}</div>
            <div class="review-comment">${review.comment}</div>
        </div>
    `).join('');
}

function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i - 0.5 <= rating) {
            stars += '<i class="fas fa-star-half-alt"></i>';
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
    if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
    
    return date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function openReviewModal() {
    document.getElementById('reviewModal').classList.add('active');
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.remove('active');
    document.getElementById('reviewForm').reset();
    
    const labels = document.querySelectorAll('.star-rating label');
    labels.forEach(label => {
        label.style.color = '#ddd';
    });
}

async function handleReviewSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
    
    const formData = new FormData(e.target);
    const reviewData = {
        rating: parseInt(formData.get('rating')),
        name: formData.get('reviewName'),
        title: formData.get('reviewTitle'),
        comment: formData.get('reviewComment')
    };
    
    try {
        const result = await ReviewsManager.createReview(reviewData);
        
        if (result.success) {
            toast.success('Avis publié avec succès !');
            e.target.reset();
            const labels = document.querySelectorAll('.star-rating label');
            labels.forEach(label => {
                label.style.color = '#ddd';
            });
            closeReviewModal();
        } else {
            toast.error('Erreur lors de la publication');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        toast.error('Erreur lors de la publication');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

