let allReviews = [];
let currentFilter = 'all';

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadReviews();
    setupEventListeners();
    loadStatistics();
});

async function checkAuth() {
    const user = discordAuth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    if (!(await discordAuth.isAuthorized())) {
        window.location.href = 'index.html';
        return;
    }
}

function setupEventListeners() {
    const filterSelect = document.getElementById('filterRating');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            renderReviews();
        });
    }
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
    const tbody = document.getElementById('reviewsTableBody');
    
    let filteredReviews = allReviews;
    if (currentFilter !== 'all') {
        filteredReviews = allReviews.filter(r => r.rating === parseInt(currentFilter));
    }
    
    if (filteredReviews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aucun avis trouvé</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredReviews.map(review => `
        <tr>
            <td>${formatDate(review.createdAt)}</td>
            <td><strong>${escapeHtml(review.name)}</strong></td>
            <td>
                <div class="review-stars">
                    ${renderStars(review.rating)}
                </div>
            </td>
            <td>${escapeHtml(review.title)}</td>
            <td>
                <div class="review-comment-preview">${escapeHtml(review.comment)}</div>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewReview('${escapeHtml(review.id)}')" title="Voir détails">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteReview('${escapeHtml(review.id)}')" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
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
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function viewReview(reviewId) {
    const review = allReviews.find(r => r.id === reviewId);
    if (!review) return;
    
    const content = document.getElementById('reviewDetailsContent');
    
    content.innerHTML = `
        <div class="review-detail-section">
            <h3><i class="fas fa-user"></i> Informations Client</h3>
            <div class="detail-row">
                <span class="detail-label">Nom :</span>
                <span class="detail-value">${escapeHtml(review.name)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Date :</span>
                <span class="detail-value">${formatDate(review.createdAt)}</span>
            </div>
        </div>
        
        <div class="review-detail-section">
            <h3><i class="fas fa-star"></i> Évaluation</h3>
            <div class="detail-row">
                <span class="detail-label">Note :</span>
                <span class="detail-value">
                    <div class="review-stars">${renderStars(review.rating)}</div>
                </span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Titre :</span>
                <span class="detail-value">${escapeHtml(review.title)}</span>
            </div>
        </div>
        
        <div class="review-detail-section">
            <h3><i class="fas fa-comment"></i> Commentaire</h3>
            <div class="comment-box">
                ${escapeHtml(review.comment)}
            </div>
        </div>
    `;
    
    document.getElementById('viewReviewModal').classList.add('active');
}

function closeViewModal() {
    document.getElementById('viewReviewModal').classList.remove('active');
}

async function deleteReview(reviewId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) return;
    
    const result = await ReviewsManager.deleteReview(reviewId);
    
    if (result.success) {
        toast.success('Avis supprimé avec succès');
    } else {
        toast.error('Erreur lors de la suppression');
    }
}

