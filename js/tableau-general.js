let employeesData = [];
let salesData = [];
let statsCache = new Map();
let cacheTimestamp = 0;
const CACHE_TTL = 180000;
let canManagePrimesDividendes = false;

async function hasPermission(permission) {
    const currentUser = discordAuth.getUser();
    if (!currentUser) return false;
    
    if (DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
        return true;
    }
    
    try {
        const db = firebase.firestore();
        const authDoc = await db.collection('admin_authorized_ids').doc(currentUser.id).get();
        if (!authDoc.exists || !authDoc.data().authorized) {
            return false;
        }
        
        const permissionsDoc = await db.collection('admin_permissions').doc(currentUser.id).get();
        if (!permissionsDoc.exists) {
            return false;
        }
        
        return permissionsDoc.data()[permission] === true;
    } catch (error) {
        console.error('Erreur vérification permissions:', error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Début chargement tableau général...');
    
    canManagePrimesDividendes = await hasPermission('manage_primes_dividendes');
    
    const cachedData = loadFromCache();
    if (cachedData) {
        employeesData = cachedData.employees;
        salesData = cachedData.sales;
        statsCache = new Map(cachedData.stats);
        displayTableau();
    }
    
    await loadTableauData();
    setupRealtimeListeners();
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        clearCache();
        loadTableauData();
    });
});

function loadFromCache() {
    const cached = localStorage.getItem('orpi_tableau_cache');
    const time = localStorage.getItem('orpi_tableau_cache_time');
    if (!cached || !time) return null;
    if (Date.now() - parseInt(time) > CACHE_TTL) return null;
    try {
        return JSON.parse(cached);
    } catch (e) {
        return null;
    }
}

function saveToCache() {
    const data = {
        employees: employeesData,
        sales: salesData,
        stats: Array.from(statsCache.entries())
    };
    localStorage.setItem('orpi_tableau_cache', JSON.stringify(data));
    localStorage.setItem('orpi_tableau_cache_time', Date.now().toString());
}

function clearCache() {
    statsCache.clear();
    localStorage.removeItem('orpi_tableau_cache');
    localStorage.removeItem('orpi_tableau_cache_time');
}

function setupRealtimeListeners() {
    employeesDB.onSnapshot(async (employees) => {
        employeesData = employees;
        clearCache();
        await loadTableauData();
    });
    firebase.firestore().collection('sales').onSnapshot(async () => {
        clearCache();
        await loadTableauData();
    });
}

async function loadTableauData() {
    try {
        canManagePrimesDividendes = await hasPermission('manage_primes_dividendes');
        employeesData = await employeesDB.getAll();
        await initializeEmployeeOrder();
        employeesData = sortEmployeesByOrder(employeesData);
        salesData = await salesDB.getAll();
        await displayTableau();
        saveToCache();
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        showError('Erreur lors du chargement des données');
    }
}

async function initializeEmployeeOrder() {
    const db = firebase.firestore();
    let needsUpdate = false;
    
    for (let i = 0; i < employeesData.length; i++) {
        const employee = employeesData[i];
        if (employee.order === undefined || employee.order === null) {
            employee.order = i;
            needsUpdate = true;
            await db.collection('employees').doc(employee.id).update({
                order: i
            });
        }
    }
    
    if (needsUpdate) {
        employeesData = await employeesDB.getAll();
    }
}

function sortEmployeesByOrder(employees) {
    return [...employees].sort((a, b) => {
        const orderA = a.order !== undefined && a.order !== null ? a.order : 999;
        const orderB = b.order !== undefined && b.order !== null ? b.order : 999;
        return orderA - orderB;
    });
}
async function displayTableau() {
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;
    if (employeesData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center">
                    <p style="padding: 2rem;">Aucun employé enregistré</p>
                </td>
            </tr>
        `;
        updateSummary();
        return;
    }
    
    setupDragAndDrop();
    let html = '';
    let totals = {
        benefices: 0,
        vente: 0,
        entrepriseRevenue: 0,
        nbVente: 0,
        primes: 0,
        dividendes: 0,
        salaire: 0,
        salaireAVerser: 0
    };
    for (let index = 0; index < employeesData.length; index++) {
        const employee = employeesData[index];
        let stats;
        if (statsCache.has(employee.id)) {
            stats = statsCache.get(employee.id);
        } else {
            stats = await employeesDB.getStats(employee.id);
            statsCache.set(employee.id, stats);
        }
        const totalBenefices = stats.totalBenefice; 
        const totalVente = stats.totalCA;
        const totalEntrepriseRevenue = stats.totalEntrepriseRevenue || 0;
        const nbVente = stats.nombreVentes;
        const primes = employee.primes || 0;
        const dividendes = employee.dividendes || 0;
        const salaire = stats.totalSalaire || 0;
        const salaireAVerser = salaire + primes + dividendes;
        totals.benefices += totalBenefices;
        totals.vente += totalVente;
        totals.entrepriseRevenue += totalEntrepriseRevenue;
        totals.nbVente += nbVente;
        totals.primes += primes;
        totals.dividendes += dividendes;
        totals.salaire += salaire;
        totals.salaireAVerser += salaireAVerser;
        const isFirst = index === 0;
        const isLast = index === employeesData.length - 1;
        const currentOrder = employee.order !== undefined && employee.order !== null ? employee.order : index;
        
        html += `
            <tr data-employee-id="${employee.id}" data-order="${currentOrder}" draggable="true" class="draggable-row">
                <td style="text-align: center; cursor: grab; width: 80px;">
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: center;">
                        <i class="fas fa-grip-vertical" style="color: #6c757d; font-size: 1.25rem; cursor: grab;"></i>
                        <span style="font-weight: 600; font-size: 0.9rem; min-width: 30px; display: inline-block; text-align: center; background: linear-gradient(135deg, var(--primary-color, #E30613), #ff2a39); color: white; padding: 0.25rem 0.5rem; border-radius: 8px;">${currentOrder + 1}</span>
                    </div>
                </td>
                <td><strong>${employee.name}</strong></td>
                <td>${employee.grade || 'N/A'}</td>
                <td>
                    <a href="fiche-employee.html?id=${employee.id}" class="btn btn-sm btn-primary">
                        📋 Voir Fiche
                    </a>
                </td>
                <td><strong style="color: #495057;">${formatCurrency(totalBenefices)}</strong></td>
                <td><strong style="color: #212529;">${formatCurrency(totalVente)}</strong></td>
                <td><strong style="color: #28a745; font-size: 1.05rem;">${formatCurrency(totalEntrepriseRevenue)}</strong></td>
                <td><strong style="color: var(--primary-color, #E30613);">${nbVente}</strong></td>
                <td class="editable-cell" data-field="primes">
                    <input type="number" value="${primes}" 
                           class="editable-input" 
                           ${canManagePrimesDividendes ? '' : 'disabled'}
                           onchange="updateEmployeeField('${employee.id}', 'primes', this.value)"
                           title="${canManagePrimesDividendes ? '' : 'Vous n\'avez pas la permission de modifier les primes'}">
                </td>
                <td class="editable-cell" data-field="dividendes">
                    <input type="number" value="${dividendes}" 
                           class="editable-input" 
                           ${canManagePrimesDividendes ? '' : 'disabled'}
                           onchange="updateEmployeeField('${employee.id}', 'dividendes', this.value)"
                           title="${canManagePrimesDividendes ? '' : 'Vous n\'avez pas la permission de modifier les dividendes'}">
                </td>
                <td><strong style="color: #495057;">${formatCurrency(salaire)}</strong></td>
                <td><strong style="color: #28a745; font-size: 1.05rem;">${formatCurrency(salaireAVerser)}</strong></td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
    updateFooter(totals);
    updateSummary();
    
    setTimeout(() => {
        setupDragAndDrop();
    }, 100);
}
async function updateEmployeeField(employeeId, field, value) {
    if (field === 'primes' || field === 'dividendes') {
        const hasPermission = await hasPermission('manage_primes_dividendes');
        if (!hasPermission) {
            showError('Vous n\'avez pas la permission de modifier les primes et dividendes.');
            await loadTableauData();
            return;
        }
    }
    
    try {
        await employeesDB.update(employeeId, {
            [field]: parseFloat(value) || 0
        });
        await loadTableauData();
        showSuccess('Champ mis à jour avec succès');
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        showError('Erreur lors de la mise à jour');
    }
}
function updateFooter(totals) {
    document.getElementById('footerTotalBenefices').textContent = formatCurrency(totals.benefices);
    document.getElementById('footerTotalVente').textContent = formatCurrency(totals.vente);
    const footerCAAfter = document.getElementById('footerTotalCAAfter');
    if (footerCAAfter) {
        footerCAAfter.textContent = formatCurrency(totals.entrepriseRevenue);
    }
    document.getElementById('footerNbVente').textContent = totals.nbVente;
    document.getElementById('footerPrimes').textContent = formatCurrency(totals.primes);
    document.getElementById('footerDividendes').textContent = formatCurrency(totals.dividendes);
    document.getElementById('footerSalaire').textContent = formatCurrency(totals.salaire);
    document.getElementById('footerSalaireAVerser').textContent = formatCurrency(totals.salaireAVerser);
}
async function updateSummary() {
    document.getElementById('totalEmployees').textContent = employeesData.length;
    let totalVentes = 0;
    let totalCA = 0;
    let totalEntrepriseRevenue = 0;
    let totalSalaires = 0;
    
    // Calculer le CA et le revenue entreprise depuis les ventes
    salesData.forEach(sale => {
        totalVentes++;
        if (sale.type === 'vente') {
            totalCA += parseFloat(sale.prixMaison || 0);
        } else if (sale.type === 'location') {
            totalCA += parseFloat(sale.prixLocation || 0);
        }
        totalEntrepriseRevenue += parseFloat(sale.entrepriseRevenue || 0);
    });
    
    // Calculer le salaire total basé sur le nombre de ventes × montant par vente pour chaque employé
    for (const employee of employeesData) {
        const stats = await employeesDB.getStats(employee.id);
        totalSalaires += stats.totalSalaire || 0;
    }
    
    // Calculer le bénéfice net (CA après 15% - salaires)
    const beneficeNet = totalEntrepriseRevenue - totalSalaires;
    
    document.getElementById('totalVentes').textContent = totalVentes;
    document.getElementById('totalCA').textContent = formatCurrency(totalCA);
    document.getElementById('totalSalaires').textContent = formatCurrency(totalSalaires);
    const entrepriseRevenueEl = document.getElementById('totalEntrepriseRevenue');
    if (entrepriseRevenueEl) {
        // Afficher le bénéfice net (après déduction des salaires) dans le Coffre Entreprise
        entrepriseRevenueEl.textContent = '+' + formatCurrency(beneficeNet);
    }
    const totalCAAfterEl = document.getElementById('totalCAAfter');
    if (totalCAAfterEl) {
        totalCAAfterEl.textContent = 'Après 15%: ' + formatCurrency(totalEntrepriseRevenue);
    }
}
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);
}
function showSuccess(message) {
    toast.success(message);
}
function showError(message) {
    toast.error(message);
}

function setupDragAndDrop() {
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;
    
    let draggedRow = null;
    let draggedIndex = null;
    
    const rows = tbody.querySelectorAll('.draggable-row');
    
    rows.forEach((row, index) => {
        row.addEventListener('dragstart', (e) => {
            draggedRow = row;
            draggedIndex = index;
            row.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', row.getAttribute('data-employee-id'));
            
            setTimeout(() => {
                row.style.opacity = '0.5';
            }, 0);
        });
        
        row.addEventListener('dragend', (e) => {
            if (draggedRow) {
                draggedRow.classList.remove('dragging');
                draggedRow.style.opacity = '';
            }
            
            rows.forEach(r => {
                r.classList.remove('drag-over');
                r.classList.remove('drag-over-top');
                r.classList.remove('drag-over-bottom');
            });
            
            draggedRow = null;
            draggedIndex = null;
        });
        
        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (!draggedRow || draggedRow === row) return;
            
            const rect = row.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const midpoint = rect.height / 2;
            
            rows.forEach(r => {
                r.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
            });
            
            if (y < midpoint) {
                row.classList.add('drag-over-top');
            } else {
                row.classList.add('drag-over-bottom');
            }
        });
        
        row.addEventListener('dragleave', (e) => {
            if (!draggedRow || draggedRow === row) return;
            row.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
        });
        
        row.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!draggedRow || draggedRow === row) {
                rows.forEach(r => {
                    r.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
                });
                return;
            }
            
            const allRows = Array.from(tbody.querySelectorAll('.draggable-row'));
            const currentIndex = allRows.indexOf(row);
            const draggedRowIndex = allRows.indexOf(draggedRow);
            
            if (draggedRowIndex === -1 || currentIndex === -1) return;
            
            const rect = row.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const midpoint = rect.height / 2;
            const insertIndex = y < midpoint ? currentIndex : currentIndex + 1;
            
            rows.forEach(r => {
                r.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
            });
            
            if (draggedRowIndex < insertIndex) {
                tbody.insertBefore(draggedRow, allRows[insertIndex] || null);
            } else {
                tbody.insertBefore(draggedRow, allRows[insertIndex] || null);
            }
            
            await saveNewOrder();
        });
    });
}

async function saveNewOrder() {
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('.draggable-row'));
    const newOrder = [];
    
    rows.forEach((row, index) => {
        const employeeId = row.getAttribute('data-employee-id');
        const employee = employeesData.find(e => e.id === employeeId);
        if (employee) {
            newOrder.push({
                id: employeeId,
                newOrder: index
            });
        }
    });
    
    if (newOrder.length === 0) return;
    
    try {
        const db = firebase.firestore();
        const batch = db.batch();
        
        let hasChanges = false;
        
        for (const item of newOrder) {
            const employee = employeesData.find(e => e.id === item.id);
            if (employee && employee.order !== item.newOrder) {
                const employeeRef = db.collection('employees').doc(item.id);
                batch.update(employeeRef, { order: item.newOrder });
                employee.order = item.newOrder;
                hasChanges = true;
            }
        }
        
        if (hasChanges) {
            await batch.commit();
            employeesData = sortEmployeesByOrder(employeesData);
            
            const updatedRows = Array.from(tbody.querySelectorAll('.draggable-row'));
            updatedRows.forEach((row, index) => {
                const orderSpan = row.querySelector('td span[style*="background"]');
                if (orderSpan) {
                    orderSpan.textContent = index + 1;
                }
            });
            
            showSuccess('Ordre mis à jour avec succès');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'ordre:', error);
        showError('Erreur lors de la sauvegarde de l\'ordre');
        await displayTableau();
    }
}
