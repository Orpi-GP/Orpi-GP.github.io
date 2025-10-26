let currentEmployeeId = null;
let availabilities = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadAvailabilities();
    setupEventListeners();
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
}

function setupEventListeners() {
    const form = document.getElementById('availabilityForm');
    if (form) {
        form.addEventListener('submit', handleAddAvailability);
    }
}

function loadAvailabilities() {
    if (!currentEmployeeId) return;
    
    AvailabilityManager.listenToAvailabilities(currentEmployeeId, (avails) => {
        availabilities = avails;
        renderAvailabilities();
    });
}

function renderAvailabilities() {
    for (let day = 0; day <= 6; day++) {
        const container = document.getElementById(`slots-${day}`);
        const dayAvailabilities = availabilities.filter(a => a.dayOfWeek === day);
        
        if (dayAvailabilities.length === 0) {
            container.innerHTML = '<div class="no-slots"><i class="fas fa-times-circle"></i><br>Aucun créneau</div>';
            continue;
        }
        
        dayAvailabilities.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        container.innerHTML = dayAvailabilities.map(avail => `
            <div class="availability-slot">
                <div class="slot-time">${avail.startTime} - ${avail.endTime}</div>
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
        `).join('');
    }
}

async function handleAddAvailability(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const selectedDays = Array.from(document.querySelectorAll('input[name="days"]:checked'))
        .map(cb => parseInt(cb.value));
    
    if (selectedDays.length === 0) {
        toast.warning('Veuillez sélectionner au moins un jour');
        return;
    }
    
    const startTime = formData.get('startTime');
    const endTime = formData.get('endTime');
    const slotDuration = parseInt(formData.get('slotDuration'));
    
    if (startTime >= endTime) {
        toast.error('L\'heure de fin doit être après l\'heure de début');
        return;
    }
    
    const submitBtn = e.target.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout...';
    
    try {
        const displayName = await getDisplayName();
        const timeSlots = generateTimeSlots(startTime, endTime, slotDuration);
        
        for (const day of selectedDays) {
            for (const slot of timeSlots) {
                await AvailabilityManager.addAvailability({
                    employeeId: currentEmployeeId,
                    employeeName: displayName,
                    dayOfWeek: day,
                    startTime: slot.start,
                    endTime: slot.end,
                    duration: slotDuration,
                    active: true
                });
            }
        }
        
        toast.success('Créneaux ajoutés avec succès');
        closeAddAvailabilityModal();
        e.target.reset();
    } catch (error) {
        console.error('Error adding availability:', error);
        toast.error('Erreur lors de l\'ajout des créneaux');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Ajouter';
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
}

function closeAddAvailabilityModal() {
    document.getElementById('addAvailabilityModal').classList.remove('active');
    document.getElementById('availabilityForm').reset();
}

document.addEventListener('click', (e) => {
    const modal = document.getElementById('addAvailabilityModal');
    if (e.target === modal) {
        closeAddAvailabilityModal();
    }
});

