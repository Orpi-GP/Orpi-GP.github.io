let currentEmployeeId = null;
let availabilities = [];
let currentMonthFilter = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadAvailabilities();
    setupEventListeners();
    setupDateFilter();
});

function checkAuth() {
    const user = discordAuth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    if (!DISCORD_CONFIG.authorizedIds.includes(user.id)) {
        window.location.href = 'index.html';
        return;
    }
    
    currentEmployeeId = user.id;
    console.log('ID employé actuel (Discord ID):', currentEmployeeId);
}

function setupEventListeners() {
    const form = document.getElementById('availabilityForm');
    if (form) {
        form.addEventListener('submit', handleAddAvailability);
    }
    
    const dateInput = document.getElementById('availabilityDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
        dateInput.value = today;
    }
    
    const repeatCheckbox = document.getElementById('repeatWeekly');
    const repeatUntilInput = document.getElementById('repeatUntil');
    if (repeatCheckbox && repeatUntilInput) {
        repeatCheckbox.addEventListener('change', (e) => {
            repeatUntilInput.disabled = !e.target.checked;
            if (e.target.checked && dateInput) {
                const startDate = new Date(dateInput.value);
                startDate.setDate(startDate.getDate() + 7);
                repeatUntilInput.setAttribute('min', startDate.toISOString().split('T')[0]);
                repeatUntilInput.value = '';
            }
        });
    }
}

function setupDateFilter() {
    const monthFilter = document.getElementById('availabilityMonthFilter');
    if (monthFilter) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        monthFilter.value = currentMonth;
        currentMonthFilter = currentMonth;
        
        monthFilter.addEventListener('change', (e) => {
            currentMonthFilter = e.target.value;
            renderAvailabilities();
        });
    }
}

function loadAvailabilities() {
    if (!currentEmployeeId) {
        console.warn('Aucun ID employé défini');
        return;
    }
    
    console.log('Chargement des disponibilités pour l\'employé ID:', currentEmployeeId);
    
    AvailabilityManager.listenToAvailabilities(currentEmployeeId, (avails) => {
        console.log('Disponibilités reçues:', avails.length, 'créneaux');
        console.log('Premiers créneaux:', avails.slice(0, 3).map(a => ({
            id: a.id,
            employeeId: a.employeeId,
            date: a.date,
            startTime: a.startTime
        })));
        availabilities = avails;
        renderAvailabilities();
    });
}

function renderAvailabilities() {
    const container = document.getElementById('availabilitiesList');
    if (!container) return;
    
    if (!currentEmployeeId) {
        container.innerHTML = '<div class="no-slots"><i class="fas fa-exclamation-triangle"></i><br>Erreur: ID employé non défini</div>';
        return;
    }
    
    let filtered = availabilities.filter(a => {
        const isActive = a.active !== false;
        const matchesEmployee = a.employeeId === currentEmployeeId;
        if (!matchesEmployee) {
            console.warn('Créneau filtré (ID non correspondant):', {
                creneauId: a.id,
                creneauEmployeeId: a.employeeId,
                currentEmployeeId: currentEmployeeId
            });
        }
        return isActive && matchesEmployee;
    });
    
    console.log('Créneaux filtrés après vérification employeeId:', filtered.length);
    
    if (currentMonthFilter) {
        const [year, month] = currentMonthFilter.split('-');
        filtered = filtered.filter(avail => {
            if (!avail.date) {
                if (avail.dayOfWeek !== undefined) {
                    return false;
                }
                return true;
            }
            const availDate = new Date(avail.date);
            return availDate.getFullYear() == year && availDate.getMonth() + 1 == month;
        });
    }
    
    filtered = filtered.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
        }
        return (a.startTime || '').localeCompare(b.startTime || '');
    });
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="no-slots"><i class="fas fa-calendar-times"></i><br>Aucun créneau disponible</div>';
        return;
    }
    
    const groupedByDate = {};
    filtered.forEach(avail => {
        let dateKey;
        if (avail.date) {
            dateKey = avail.date;
        } else if (avail.dayOfWeek !== undefined) {
            dateKey = `day_${avail.dayOfWeek}`;
        } else {
            dateKey = 'unknown';
        }
        
        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(avail);
    });
    
    let html = '';
    Object.keys(groupedByDate).sort().forEach(dateKey => {
        const slots = groupedByDate[dateKey];
        let dateLabel;
        let dateValue;
        
        if (dateKey.startsWith('day_')) {
            const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
            const dayOfWeek = parseInt(dateKey.replace('day_', ''));
            dateLabel = `${dayNames[dayOfWeek]} (Ancien format - à corriger)`;
            dateValue = dateKey;
        } else if (dateKey === 'unknown') {
            dateLabel = 'Date non définie';
            dateValue = dateKey;
        } else {
            const dateObj = new Date(dateKey);
            dateLabel = dateObj.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            dateValue = dateKey;
        }
        
        slots.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        
        html += `
            <div class="availability-date-group">
                <div class="availability-date-header">
                    <h3><i class="fas fa-calendar-day"></i> ${dateLabel}</h3>
                    ${dateKey.startsWith('day_') ? '<span style="background: #ff9800; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem;">À corriger</span>' : ''}
                </div>
                <div class="availability-date-slots">
                    ${slots.map(avail => `
                        <div class="availability-slot">
                            <div class="slot-info">
                                <div class="slot-time">${avail.startTime || ''} - ${avail.endTime || ''}</div>
                                ${avail.duration ? `<small style="color: #666;">Durée : ${avail.duration} min</small>` : ''}
                            </div>
                            <div class="slot-actions">
                                <button class="slot-action-btn toggle-btn ${avail.active ? '' : 'inactive'}" 
                                        onclick="toggleAvailability('${avail.id}', ${!avail.active})"
                                        title="${avail.active ? 'Désactiver' : 'Activer'}">
                                    <i class="fas fa-${avail.active ? 'toggle-on' : 'toggle-off'}"></i>
                                </button>
                                <button class="slot-action-btn delete-btn" 
                                        onclick="deleteAvailability('${avail.id}')"
                                        title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function handleAddAvailability(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const date = formData.get('availabilityDate');
    const repeatWeekly = formData.get('repeatWeekly') === 'on';
    const repeatUntil = formData.get('repeatUntil');
    
    if (!date) {
        toast.error('Veuillez sélectionner une date');
        return;
    }
    
    const startTime = formData.get('startTime');
    const endTime = formData.get('endTime');
    const slotDuration = parseInt(formData.get('slotDuration'));
    
    if (startTime >= endTime) {
        toast.error('L\'heure de fin doit être après l\'heure de début');
        return;
    }
    
    if (repeatWeekly && !repeatUntil) {
        toast.error('Veuillez sélectionner une date de fin pour la répétition');
        return;
    }
    
    const submitBtn = e.target.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout...';
    
    try {
        const displayName = await getDisplayName();
        const timeSlots = generateTimeSlots(startTime, endTime, slotDuration);
        const startDate = new Date(date);
        const endDate = repeatWeekly ? new Date(repeatUntil) : new Date(date);
        
        let datesToAdd = [];
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            datesToAdd.push(new Date(currentDate).toISOString().split('T')[0]);
            if (repeatWeekly) {
                currentDate.setDate(currentDate.getDate() + 7);
            } else {
                break;
            }
        }
        
        let successCount = 0;
        for (const dateStr of datesToAdd) {
            for (const slot of timeSlots) {
                const result = await AvailabilityManager.addAvailability({
                    employeeId: currentEmployeeId,
                    employeeName: displayName,
                    date: dateStr,
                    startTime: slot.start,
                    endTime: slot.end,
                    duration: slotDuration,
                    active: true
                });
                if (result.success) successCount++;
            }
        }
        
        toast.success(`${successCount} créneau(x) ajouté(s) avec succès`);
        closeAddAvailabilityModal();
        e.target.reset();
        const dateInput = document.getElementById('availabilityDate');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    } catch (error) {
        console.error('Error adding availability:', error);
        toast.error('Erreur lors de l\'ajout des créneaux');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Ajouter';
    }
}

async function migrateOldAvailabilities() {
    if (!confirm('Voulez-vous convertir tous les anciens créneaux (par jour de la semaine) en créneaux avec dates précises pour TOUS les employés ?\n\nCette action va créer de nouveaux créneaux pour les 3 prochains mois basés sur les jours de la semaine existants.')) {
        return;
    }
    
    const btn = document.querySelector('button[onclick="migrateOldAvailabilities()"]') || event?.target?.closest('button');
    if (!btn) {
        toast.error('Bouton introuvable');
        return;
    }
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Migration...';
    
    try {
        const result = await AvailabilityManager.migrateOldAvailabilities(null);
        
        if (result.success) {
            toast.success(`Migration terminée ! ${result.count} nouveau(x) créneau(x) créé(s) pour tous les employés.`);
            loadAvailabilities();
        } else {
            toast.error(`Erreur lors de la migration: ${result.error}`);
        }
    } catch (error) {
        console.error('Erreur lors de la migration:', error);
        toast.error('Erreur lors de la migration');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function deleteAllAvailabilitiesExceptPending() {
    if (!confirm('⚠️ ATTENTION: Cette action va supprimer TOUS les créneaux sauf ceux qui ont un rendez-vous en attente (pending).\n\nLes créneaux protégés sont ceux qui correspondent à:\n- Date + Heure + Employé identiques à un rendez-vous en statut "pending"\n\nÊtes-vous sûr de vouloir continuer ?')) {
        return;
    }
    
    const btn = document.querySelector('button[onclick="deleteAllAvailabilitiesExceptPending()"]') || event?.target?.closest('button');
    if (!btn) {
        toast.error('Bouton introuvable');
        return;
    }
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Suppression...';
    
    try {
        const result = await AvailabilityManager.deleteAllExceptPendingAppointments();
        
        if (result.success) {
            toast.success(`Suppression terminée ! ${result.count} créneau(x) supprimé(s). ${result.protected || 0} créneau(x) protégé(s) (avec rendez-vous en attente).`);
            loadAvailabilities();
        } else {
            toast.error(`Erreur lors de la suppression: ${result.error}`);
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        toast.error('Erreur lors de la suppression');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function getDisplayName() {
    const user = discordAuth.getUser();
    if (!user) return 'Admin';
    
    try {
        const userDoc = await db.collection('users').doc(user.id).get();
        if (userDoc.exists && userDoc.data().displayName) {
            return userDoc.data().displayName;
        }
        return user.username;
    } catch (error) {
        console.error('Error getting display name:', error);
        return user.username;
    }
}

function generateTimeSlots(startTime, endTime, durationMinutes) {
    const slots = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    while (currentMinutes + durationMinutes <= endMinutes) {
        const slotStartHour = Math.floor(currentMinutes / 60);
        const slotStartMin = currentMinutes % 60;
        const slotEndMinutes = currentMinutes + durationMinutes;
        const slotEndHour = Math.floor(slotEndMinutes / 60);
        const slotEndMin = slotEndMinutes % 60;
        
        slots.push({
            start: `${String(slotStartHour).padStart(2, '0')}:${String(slotStartMin).padStart(2, '0')}`,
            end: `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`
        });
        
        currentMinutes += durationMinutes;
    }
    
    return slots;
}

async function toggleAvailability(availabilityId, active) {
    const result = await AvailabilityManager.updateAvailability(availabilityId, { active });
    
    if (result.success) {
        toast.success(active ? 'Créneau activé' : 'Créneau désactivé');
    } else {
        toast.error('Erreur lors de la modification');
    }
}

async function deleteAvailability(availabilityId) {
    if (!confirm('Supprimer ce créneau ?')) return;
    
    const result = await AvailabilityManager.deleteAvailability(availabilityId);
    
    if (result.success) {
        toast.success('Créneau supprimé');
    } else {
        toast.error('Erreur lors de la suppression');
    }
}

function openAddAvailabilityModal() {
    document.getElementById('addAvailabilityModal').classList.add('active');
    const dateInput = document.getElementById('availabilityDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
}

function closeAddAvailabilityModal() {
    document.getElementById('addAvailabilityModal').classList.remove('active');
    const form = document.getElementById('availabilityForm');
    if (form) {
        form.reset();
        const dateInput = document.getElementById('availabilityDate');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
        const repeatUntilInput = document.getElementById('repeatUntil');
        if (repeatUntilInput) {
            repeatUntilInput.disabled = true;
        }
    }
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('addAvailabilityModal');
    if (e.target === modal) {
        closeAddAvailabilityModal();
    }
});
