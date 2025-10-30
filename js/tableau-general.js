let employeesData = [];
let salesData = [];
let statsCache = new Map();
let cacheTimestamp = 0;
const CACHE_TTL = 180000;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Début chargement tableau général...');
    
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
        employeesData = await employeesDB.getAll();
        salesData = await salesDB.getAll();
        await displayTableau();
        saveToCache();
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        showError('Erreur lors du chargement des données');
    }
}
async function displayTableau() {
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;
    if (employeesData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center">
                    <p style="padding: 2rem;">Aucun employé enregistré</p>
                </td>
            </tr>
        `;
        updateSummary();
        return;
    }
    let html = '';
    let totals = {
        benefices: 0,
        vente: 0,
        nbVente: 0,
        primes: 0,
        dividendes: 0,
        salaire: 0,
        salaireAVerser: 0
    };
    for (const employee of employeesData) {
        let stats;
        if (statsCache.has(employee.id)) {
            stats = statsCache.get(employee.id);
        } else {
            stats = await employeesDB.getStats(employee.id);
            statsCache.set(employee.id, stats);
        }
        const totalBenefices = stats.totalBenefice; 
        const totalVente = stats.totalCA; 
        const nbVente = stats.nombreVentes;
        const primes = employee.primes || 0;
        const dividendes = employee.dividendes || 0;
        const salaire = stats.totalSalaire || 0;
        const salaireAVerser = salaire + primes + dividendes;
        totals.benefices += totalBenefices;
        totals.vente += totalVente;
        totals.nbVente += nbVente;
        totals.primes += primes;
        totals.dividendes += dividendes;
        totals.salaire += salaire;
        totals.salaireAVerser += salaireAVerser;
        html += `
            <tr data-employee-id="${employee.id}">
                <td><strong>${employee.name}</strong></td>
                <td>${employee.grade || 'N/A'}</td>
                <td>
                    <a href="fiche-employee.html?id=${employee.id}" class="btn btn-sm btn-primary">
                        📋 Voir Fiche
                    </a>
                </td>
                <td>${formatCurrency(totalBenefices)}</td>
                <td>${formatCurrency(totalVente)}</td>
                <td><strong>${nbVente}</strong></td>
                <td class="editable-cell" data-field="primes">
                    <input type="number" value="${primes}" 
                           class="editable-input" 
                           onchange="updateEmployeeField('${employee.id}', 'primes', this.value)">
                </td>
                <td class="editable-cell" data-field="dividendes">
                    <input type="number" value="${dividendes}" 
                           class="editable-input" 
                           onchange="updateEmployeeField('${employee.id}', 'dividendes', this.value)">
                </td>
                <td>${formatCurrency(salaire)}</td>
                <td><strong>${formatCurrency(salaireAVerser)}</strong></td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
    updateFooter(totals);
    updateSummary();
}
async function updateEmployeeField(employeeId, field, value) {
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
    document.getElementById('footerNbVente').textContent = totals.nbVente;
    document.getElementById('footerPrimes').textContent = formatCurrency(totals.primes);
    document.getElementById('footerDividendes').textContent = formatCurrency(totals.dividendes);
    document.getElementById('footerSalaire').textContent = formatCurrency(totals.salaire);
    document.getElementById('footerSalaireAVerser').textContent = formatCurrency(totals.salaireAVerser);
}
function updateSummary() {
    document.getElementById('totalEmployees').textContent = employeesData.length;
    let totalVentes = 0;
    let totalCA = 0;
    let totalSalaires = 0;
    let totalEntrepriseRevenue = 0;
    salesData.forEach(sale => {
        totalVentes++;
        if (sale.type === 'vente') {
            totalCA += parseFloat(sale.prixMaison || 0);
        } else if (sale.type === 'location') {
            totalCA += parseFloat(sale.prixLocation || 0);
        }
        totalSalaires += parseFloat(sale.salaire || 0);
        totalEntrepriseRevenue += parseFloat(sale.entrepriseRevenue || 0);
    });
    document.getElementById('totalVentes').textContent = totalVentes;
    document.getElementById('totalCA').textContent = formatCurrency(totalCA);
    document.getElementById('totalSalaires').textContent = formatCurrency(totalSalaires);
    const entrepriseRevenueEl = document.getElementById('totalEntrepriseRevenue');
    if (entrepriseRevenueEl) {
        entrepriseRevenueEl.textContent = '+' + formatCurrency(totalEntrepriseRevenue);
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
