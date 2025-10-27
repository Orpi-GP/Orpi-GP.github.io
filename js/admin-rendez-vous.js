let allAppointments = [];
let filteredAppointments = [];

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    loadAppointments();
    setupEventListeners();
});

function checkAdminAuth() {
    const user = discordAuth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    if (!DISCORD_CONFIG.authorizedIds.includes(user.id)) {
        window.location.href = 'index.html';
        return;
    }
}

function setupEventListeners() {
    document.getElementById('filterStatus').addEventListener('change', (e) => {
        filterAppointments(e.target.value);
    });
}

async function loadAppointments() {
    try {
        AppointmentsManager.listenToAppointments((appointments) => {
            allAppointments = appointments;
            filteredAppointments = appointments;
            renderAppointments();
            updateStatistics();
        });
    } catch (error) {
        console.error('Error loading appointments:', error);
        toast.error('Erreur lors du chargement des rendez-vous');
    }
}

function filterAppointments(status) {
    if (status === 'all') {
        filteredAppointments = allAppointments;
    } else {
        filteredAppointments = allAppointments.filter(apt => apt.status === status);
    }
    renderAppointments();
}

function renderAppointments() {
    const tbody = document.getElementById('appointmentsTableBody');
    
    if (filteredAppointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Aucun rendez-vous trouvé</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredAppointments.map(appointment => `
        <tr>
            <td>${formatDate(appointment.date)}</td>
            <td><strong>${escapeHtml(appointment.time)}</strong></td>
            <td>${escapeHtml(appointment.clientName)}</td>
            <td>${escapeHtml(appointment.clientPhone)}</td>
            <td>${getTypeLabel(appointment.type)}</td>
            <td>${escapeHtml(appointment.employeeId)}</td>
            <td>
                <span class="status-badge status-${appointment.status}">
                    ${getStatusLabel(appointment.status)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewAppointmentDetails('${escapeHtml(appointment.id)}')" title="Voir détails">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${appointment.status === 'pending' ? `
                        <button class="action-btn confirm" onclick="confirmAppointment('${escapeHtml(appointment.id)}')" title="Confirmer">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    ${appointment.status !== 'cancelled' ? `
                        <button class="action-btn cancel" onclick="cancelAppointment('${escapeHtml(appointment.id)}')" title="Annuler">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function updateStatistics() {
    const today = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekStr = weekFromNow.toISOString().split('T')[0];
    
    const pending = allAppointments.filter(apt => apt.status === 'pending').length;
    const todayApts = allAppointments.filter(apt => apt.date === today).length;
    const weekApts = allAppointments.filter(apt => apt.date >= today && apt.date <= weekStr).length;
    
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('todayCount').textContent = todayApts;
    document.getElementById('weekCount').textContent = weekApts;
    document.getElementById('totalCount').textContent = allAppointments.length;
}

async function confirmAppointment(appointmentId) {
    if (!confirm('Confirmer ce rendez-vous ?')) return;
    
    const result = await AppointmentsManager.updateAppointmentStatus(appointmentId, 'confirmed');
    
    if (result.success) {
        toast.success('Rendez-vous confirmé');
    } else {
        toast.error('Erreur lors de la confirmation');
    }
}

async function cancelAppointment(appointmentId) {
    if (!confirm('Annuler ce rendez-vous ?')) return;
    
    const result = await AppointmentsManager.updateAppointmentStatus(appointmentId, 'cancelled');
    
    if (result.success) {
        toast.success('Rendez-vous annulé');
    } else {
        toast.error('Erreur lors de l\'annulation');
    }
}

function viewAppointmentDetails(appointmentId) {
    const appointment = allAppointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;
    
    const modal = document.getElementById('appointmentDetailsModal');
    const content = document.getElementById('appointmentDetailsContent');
    
    content.innerHTML = `
        <div class="appointment-detail-section">
            <h3><i class="fas fa-user"></i> Informations Client</h3>
            <div class="detail-row">
                <span class="detail-label">Nom :</span>
                <span class="detail-value">${escapeHtml(appointment.clientName)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Téléphone :</span>
                <span class="detail-value">${escapeHtml(appointment.clientPhone)}</span>
            </div>
        </div>
        
        <div class="appointment-detail-section">
            <h3><i class="fas fa-calendar"></i> Détails du Rendez-vous</h3>
            <div class="detail-row">
                <span class="detail-label">Date :</span>
                <span class="detail-value">${formatDate(appointment.date)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Heure :</span>
                <span class="detail-value">${escapeHtml(appointment.time)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Type :</span>
                <span class="detail-value">${getTypeLabel(appointment.type)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Employé :</span>
                <span class="detail-value">${escapeHtml(appointment.employeeId)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Statut :</span>
                <span class="detail-value">
                    <span class="status-badge status-${appointment.status}">
                        ${getStatusLabel(appointment.status)}
                    </span>
                </span>
            </div>
        </div>
        
        ${appointment.message ? `
            <div class="appointment-detail-section">
                <h3><i class="fas fa-comment"></i> Message</h3>
                <p>${escapeHtml(appointment.message)}</p>
            </div>
        ` : ''}
        
        <div class="form-actions">
            ${appointment.status === 'pending' ? `
                <button class="admin-btn" onclick="confirmAppointment('${escapeHtml(appointment.id)}'); closeAppointmentDetails();">
                    <i class="fas fa-check"></i> Confirmer
                </button>
            ` : ''}
            ${appointment.status !== 'cancelled' ? `
                <button class="admin-btn-secondary admin-btn" onclick="cancelAppointment('${escapeHtml(appointment.id)}'); closeAppointmentDetails();">
                    <i class="fas fa-times"></i> Annuler
                </button>
            ` : ''}
            <button class="admin-btn admin-btn-secondary" onclick="closeAppointmentDetails()">
                Fermer
            </button>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeAppointmentDetails() {
    document.getElementById('appointmentDetailsModal').classList.remove('active');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'En attente',
        'confirmed': 'Confirmé',
        'completed': 'Terminé',
        'cancelled': 'Annulé'
    };
    return labels[status] || status;
}

function getTypeLabel(type) {
    const labels = {
        'achat': 'Projet d\'achat',
        'vente': 'Projet de vente',
        'location': 'Location',
        'estimation': 'Estimation',
        'visite': 'Visite de bien',
        'autre': 'Autre'
    };
    return labels[type] || type;
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('appointmentDetailsModal');
    if (e.target === modal) {
        closeAppointmentDetails();
    }
});

