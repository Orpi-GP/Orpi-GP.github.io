let currentEmployeeId = null;
let currentEmployee = null;
let employeeSales = [];
let editingSaleId = null;

function showSuccess(message) {
    if (window.toast) {
        toast.success(message);
    } else {
        console.log('SUCCESS:', message);
    }
}

function showError(message) {
    if (window.toast) {
        toast.error(message);
    } else {
        console.error('ERROR:', message);
    }
}
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentEmployeeId = urlParams.get('id');
    if (!currentEmployeeId) {
        toast.error('ID employé manquant');
        window.location.href = 'tableau-general.html';
        return;
    }
    const updateVersion = 'v3';
    const currentVersion = localStorage.getItem('salesUpdateVersion');
    console.log('Version actuelle:', currentVersion, 'Version cible:', updateVersion);
    
    if (currentVersion !== updateVersion) {
        console.log('Mise à jour des ventes nécessaire...');
        try {
            const result = await salesDB.updateExistingSalesWithEntrepriseRevenue();
            if (result.success) {
                console.log(`${result.updated} ventes ont été mises à jour avec les nouveaux calculs`);
                showSuccess(`${result.updated} vente(s) mise(s) à jour avec les nouveaux calculs`);
                localStorage.setItem('salesUpdateVersion', updateVersion);
                await loadSales();
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour des ventes:', error);
            showError('Erreur lors de la mise à jour des ventes');
        }
    }
    await loadEmployeeData();
    setupEventListeners();
});
async function loadEmployeeData() {
    try {
        currentEmployee = await employeesDB.getById(currentEmployeeId);
        if (!currentEmployee) {
            toast.error('Employé introuvable');
            window.location.href = 'tableau-general.html';
            return;
        }
        document.getElementById('employeeName').textContent = currentEmployee.name;
        document.getElementById('employeeGrade').textContent = `Grade: ${currentEmployee.grade || 'N/A'} | Commission: ${currentEmployee.commission || 0}%`;
        await loadSales();
        salesDB.onSnapshotByEmployee(currentEmployeeId, (sales) => {
            employeeSales = sales;
            displaySales();
            updateSummary();
        });
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        showError('Erreur lors du chargement des données');
    }
}
async function loadSales() {
    try {
        employeeSales = await salesDB.getByEmployee(currentEmployeeId);
        displaySales();
        updateSummary();
    } catch (error) {
        console.error('Erreur lors du chargement des ventes:', error);
        showError('Erreur lors du chargement des ventes');
    }
}
function displaySales() {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;
    if (employeeSales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center">
                    <p style="padding: 2rem;">Aucune vente enregistrée. Cliquez sur "Ajouter une Vente" pour commencer.</p>
                </td>
            </tr>
        `;
        return;
    }
    let html = '';
    employeeSales.forEach(sale => {
        const prixMaison = sale.type === 'vente' ? formatCurrency(sale.prixMaison || 0) : '-';
        const prixLocation = sale.type === 'location' ? formatCurrency(sale.prixLocation || 0) : '-';
        html += `
            <tr data-sale-id="${sale.id}">
                <td>${sale.acheteur || 'N/A'}</td>
                <td>${sale.propriete || 'N/A'}</td>
                <td>${sale.interieur || 'N/A'}</td>
                <td><span class="badge badge-${sale.type === 'vente' ? 'success' : 'info'}">${sale.type === 'vente' ? 'Vente' : 'Location'}</span></td>
                <td>${prixMaison}</td>
                <td>${prixLocation}</td>
                <td style="color: #28a745; font-weight: 600;">+${formatCurrency(sale.entrepriseRevenue || 0)}</td>
                <td>${formatCurrency(sale.benefice || 0)}</td>
                <td><strong>${formatCurrency(sale.salaire || 0)}</strong></td>
                <td>${currentEmployee.commission || 0}%</td>
                <td class="actions">
                    <button onclick="editSale('${sale.id}')" class="btn btn-sm btn-secondary" title="Modifier">✏️</button>
                    <button onclick="deleteSale('${sale.id}')" class="btn btn-sm btn-danger" title="Supprimer">🗑️</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}
function updateSummary() {
    let totalVentes = 0;
    let totalCA = 0;
    let totalBenefice = 0;
    let totalSalaire = 0;
    let totalEntrepriseRevenue = 0;
    employeeSales.forEach(sale => {
        totalVentes++;
        if (sale.type === 'vente') {
            totalCA += parseFloat(sale.prixMaison || 0);
        } else if (sale.type === 'location') {
            totalCA += parseFloat(sale.prixLocation || 0);
        }
        totalBenefice += parseFloat(sale.benefice || 0);
        totalSalaire += parseFloat(sale.salaire || 0);
        totalEntrepriseRevenue += parseFloat(sale.entrepriseRevenue || 0);
    });
    document.getElementById('totalSales').textContent = totalVentes;
    document.getElementById('totalCA').textContent = formatCurrency(totalCA);
    document.getElementById('totalBenefice').textContent = formatCurrency(totalBenefice);
    document.getElementById('employeeSalaire').textContent = formatCurrency(totalSalaire);
    const entrepriseRevenueEl = document.getElementById('totalEntrepriseRevenue');
    if (entrepriseRevenueEl) {
        entrepriseRevenueEl.textContent = '+' + formatCurrency(totalEntrepriseRevenue);
    }
}
function setupEventListeners() {
    document.getElementById('addSaleBtn').addEventListener('click', openAddSaleModal);
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    document.getElementById('saleForm').addEventListener('submit', handleSaleSubmit);
    document.getElementById('saleType').addEventListener('change', function() {
        const prixMaisonGroup = document.getElementById('prixMaisonGroup');
        const prixLocationGroup = document.getElementById('prixLocationGroup');
        if (this.value === 'vente') {
            prixMaisonGroup.style.display = 'flex';
            prixLocationGroup.style.display = 'none';
            document.getElementById('salePrixMaison').required = true;
            document.getElementById('salePrixLocation').required = false;
        } else if (this.value === 'location') {
            prixMaisonGroup.style.display = 'none';
            prixLocationGroup.style.display = 'flex';
            document.getElementById('salePrixMaison').required = false;
            document.getElementById('salePrixLocation').required = true;
        } else {
            prixMaisonGroup.style.display = 'none';
            prixLocationGroup.style.display = 'none';
        }
    });
}
function openAddSaleModal() {
    editingSaleId = null;
    document.getElementById('saleModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Ajouter une Vente';
    document.getElementById('saleForm').reset();
    document.getElementById('saleId').value = '';
    document.getElementById('saleModal').style.display = 'block';
}
function closeSaleModal() {
    document.getElementById('saleModal').style.display = 'none';
    editingSaleId = null;
}
async function editSale(saleId) {
    editingSaleId = saleId;
    const sale = employeeSales.find(s => s.id === saleId);
    if (!sale) {
        showError('Vente introuvable');
        return;
    }
    document.getElementById('saleModalTitle').innerHTML = '<i class="fas fa-edit"></i> Modifier la Vente';
    document.getElementById('saleId').value = saleId;
    document.getElementById('saleAcheteur').value = sale.acheteur || '';
    document.getElementById('salePropriete').value = sale.propriete || '';
    document.getElementById('saleInterieur').value = sale.interieur || '';
    document.getElementById('saleType').value = sale.type || '';
    document.getElementById('saleType').dispatchEvent(new Event('change'));
    if (sale.type === 'vente') {
        document.getElementById('salePrixMaison').value = sale.prixMaison || '';
    } else if (sale.type === 'location') {
        document.getElementById('salePrixLocation').value = sale.prixLocation || '';
    }
    document.getElementById('saleModal').style.display = 'block';
}
async function deleteSale(saleId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vente ?')) {
        return;
    }
    try {
        await salesDB.delete(saleId);
        showSuccess('Vente supprimée avec succès');
        await loadSales();
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showError('Erreur lors de la suppression de la vente');
    }
}
async function handleSaleSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('saleType').value;
    const prixMaison = parseFloat(document.getElementById('salePrixMaison').value || 0);
    const prixLocation = parseFloat(document.getElementById('salePrixLocation').value || 0);
    const stats = salesDB.calculateSaleStats({
        type,
        prixMaison,
        prixLocation
    }, currentEmployee.commission || 0);
    const saleData = {
        employeeId: currentEmployeeId,
        employeeName: currentEmployee.name,
        acheteur: document.getElementById('saleAcheteur').value,
        propriete: document.getElementById('salePropriete').value,
        interieur: document.getElementById('saleInterieur').value,
        type: type,
        prixMaison: type === 'vente' ? prixMaison : 0,
        prixLocation: type === 'location' ? prixLocation : 0,
        benefice: stats.benefice,
        salaire: stats.salaire,
        entrepriseRevenue: stats.entrepriseRevenue,
        commission: currentEmployee.commission || 0
    };
    try {
        if (editingSaleId) {
            await salesDB.update(editingSaleId, saleData);
            showSuccess('Vente modifiée avec succès');
        } else {
            await salesDB.add(saleData);
            showSuccess('Vente ajoutée avec succès');
        }
        closeSaleModal();
        await loadSales();
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement:', error);
        showError('Erreur lors de l\'enregistrement de la vente');
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
