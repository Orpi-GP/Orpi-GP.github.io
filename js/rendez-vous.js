let currentDate = new Date();
let selectedDate = null;
let selectedTimeSlot = null;

const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

document.addEventListener('DOMContentLoaded', () => {
    initializeCalendar();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    const form = document.getElementById('appointmentForm');
    if (form) {
        form.addEventListener('submit', handleAppointmentSubmit);
    }
}

function initializeCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    const firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const lastDayDate = lastDay.getDate();
    const prevLastDayDate = prevLastDay.getDate();
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    for (let i = firstDayIndex; i > 0; i--) {
        const day = createDayElement(prevLastDayDate - i + 1, true, false);
        day.classList.add('other-month');
        calendarDays.appendChild(day);
    }
    
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    
    for (let day = 1; day <= lastDayDate; day++) {
        const date = new Date(year, month, day);
        const isPast = date < today.setHours(0, 0, 0, 0);
        const isToday = day === todayDate && month === todayMonth && year === todayYear;
        
        const dayElement = createDayElement(day, false, isPast);
        
        if (isToday) {
            dayElement.classList.add('today');
        }
        
        if (selectedDate && selectedDate.getDate() === day && 
            selectedDate.getMonth() === month && selectedDate.getFullYear() === year) {
            dayElement.classList.add('selected');
        }
        
        calendarDays.appendChild(dayElement);
    }
    
    const nextDays = 42 - (firstDayIndex + lastDayDate);
    for (let i = 1; i <= nextDays; i++) {
        const day = createDayElement(i, true, false);
        day.classList.add('other-month');
        calendarDays.appendChild(day);
    }
}

function createDayElement(day, isOtherMonth, isDisabled) {
    const dayElement = document.createElement('div');
    dayElement.classList.add('calendar-day');
    dayElement.textContent = day;
    
    if (isDisabled) {
        dayElement.classList.add('disabled');
    } else if (!isOtherMonth) {
        dayElement.addEventListener('click', () => {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            selectDate(new Date(year, month, day));
        });
        dayElement.classList.add('has-slots');
    }
    
    return dayElement;
}

async function selectDate(date) {
    selectedDate = date;
    selectedTimeSlot = null;
    renderCalendar();
    
    document.getElementById('noDateSelected').style.display = 'none';
    document.getElementById('appointmentFormWrapper').style.display = 'block';
    document.getElementById('appointmentDetails').style.display = 'none';
    
    const dateStr = formatDate(date);
    document.getElementById('selectedDateInfo').textContent = `Date sélectionnée : ${dateStr}`;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    document.getElementById('selectedDate').value = dateString;
    
    await loadTimeSlots(date);
}

async function loadTimeSlots(date) {
    const container = document.getElementById('timeSlotsContainer');
    container.innerHTML = '<div class="loading">Chargement des créneaux...</div>';
    
    try {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const slots = await AppointmentsManager.getAvailableSlots(dateStr);
        
        container.innerHTML = '';
        
        if (slots.length === 0) {
            container.innerHTML = '<div class="no-selection"><p>Aucun créneau disponible pour cette date</p></div>';
            return;
        }
        
        slots.forEach(slot => {
            const slotElement = document.createElement('div');
            slotElement.classList.add('time-slot');
            
            slotElement.innerHTML = `
                <div class="time-slot-info">
                    <div class="time-slot-time">${slot.time} - ${slot.endTime}</div>
                    <div class="time-slot-employee">${slot.employeeName}</div>
                </div>
            `;
            
            slotElement.addEventListener('click', () => selectTimeSlot(slot, slotElement));
            container.appendChild(slotElement);
        });
    } catch (error) {
        console.error('Error loading time slots:', error);
        container.innerHTML = '<div class="no-selection"><p>Erreur lors du chargement des créneaux</p></div>';
    }
}

function selectTimeSlot(slot, element) {
    document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    
    selectedTimeSlot = slot;
    document.getElementById('selectedTime').value = slot.time;
    document.getElementById('selectedEmployee').value = slot.employeeId;
    
    document.getElementById('appointmentDetails').style.display = 'block';
    
    document.getElementById('appointmentDetails').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
    });
}

async function handleAppointmentSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Réservation...';
    
    const formData = new FormData(e.target);
    const appointmentData = {
        date: formData.get('selectedDate'),
        time: formData.get('selectedTime'),
        employeeId: formData.get('selectedEmployee'),
        clientName: formData.get('clientName'),
        clientPhone: formData.get('clientPhone'),
        type: formData.get('appointmentType'),
        message: formData.get('appointmentMessage') || ''
    };
    
    try {
        const result = await AppointmentsManager.createAppointment(appointmentData);
        
        if (result.success) {
            toast.success('Rendez-vous confirmé !');
            resetAppointmentForm();
            e.target.reset();
        } else {
            toast.error('Erreur lors de la réservation');
        }
    } catch (error) {
        console.error('Error submitting appointment:', error);
        toast.error('Erreur lors de la réservation');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function resetAppointmentForm() {
    selectedDate = null;
    selectedTimeSlot = null;
    document.getElementById('noDateSelected').style.display = 'block';
    document.getElementById('appointmentFormWrapper').style.display = 'none';
    document.getElementById('appointmentDetails').style.display = 'none';
    document.getElementById('appointmentForm').reset();
    renderCalendar();
}

function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
}

