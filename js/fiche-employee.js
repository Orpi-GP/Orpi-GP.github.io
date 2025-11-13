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
    const totalCAAfterEl = document.getElementById('totalCAAfter');
    if (totalCAAfterEl) {
        totalCAAfterEl.textContent = 'Après 15%: ' + formatCurrency(totalEntrepriseRevenue);
    }
}
function setupEventListeners() {
    document.getElementById('addSaleBtn').addEventListener('click', openAddSaleModal);
    
    const saleModal = document.getElementById('saleModal');
    saleModal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeSaleModal();
        }
    });
    
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
            document.body.style.overflow = '';
        });
    });
    
    document.getElementById('saleForm').addEventListener('submit', handleSaleSubmit);
    loadInteriorOptions();
    document.getElementById('saleType').addEventListener('change', function() {
        const prixMaisonGroup = document.getElementById('prixMaisonGroup');
        const prixLocationGroup = document.getElementById('prixLocationGroup');
        if (this.value === 'vente') {
            prixMaisonGroup.style.display = 'flex';
            prixLocationGroup.style.display = 'none';
            document.getElementById('salePrixMaison').required = true;
            document.getElementById('salePrixLocation').required = false;
            document.getElementById('salePrixLocation').value = '';
        } else if (this.value === 'location') {
            prixMaisonGroup.style.display = 'none';
            prixLocationGroup.style.display = 'flex';
            document.getElementById('salePrixMaison').required = false;
            document.getElementById('salePrixLocation').required = true;
            document.getElementById('salePrixMaison').value = '';
        } else {
            prixMaisonGroup.style.display = 'none';
            prixLocationGroup.style.display = 'none';
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && saleModal.classList.contains('active')) {
            closeSaleModal();
        }
    });
}

async function openAddSaleModal() {
    editingSaleId = null;
    document.getElementById('saleModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Ajouter une Vente';
    document.getElementById('saleForm').reset();
    document.getElementById('saleId').value = '';
    document.getElementById('saleModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('prixMaisonGroup').style.display = 'none';
    document.getElementById('prixLocationGroup').style.display = 'none';
    document.getElementById('saleType').value = '';
    await loadInteriorOptions();
}

function closeSaleModal() {
    document.getElementById('saleModal').classList.remove('active');
    document.body.style.overflow = '';
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
    await loadInteriorOptions();
    if (sale.interieur) {
        const select = document.getElementById('saleInterieur');
        select.value = sale.interieur;
    }
    if (sale.type === 'vente') {
        document.getElementById('salePrixMaison').value = sale.prixMaison || '';
    } else if (sale.type === 'location') {
        document.getElementById('salePrixLocation').value = sale.prixLocation || '';
    }
    document.getElementById('saleModal').classList.add('active');
    document.body.style.overflow = 'hidden';
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
    const interieurSelect = document.getElementById('saleInterieur');
    const selectedOption = interieurSelect.options[interieurSelect.selectedIndex];
    const selectedInterieurId = selectedOption ? selectedOption.getAttribute('data-id') : null;

    const saleData = {
        employeeId: currentEmployeeId,
        employeeName: currentEmployee.name,
        acheteur: document.getElementById('saleAcheteur').value,
        propriete: document.getElementById('salePropriete').value,
        interieur: document.getElementById('saleInterieur').value,
        interieurId: selectedInterieurId || null,
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

async function loadInteriorOptions() {
    try {
        const select = document.getElementById('saleInterieur');
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Sélectionner --</option>';
        const store = typeof db !== 'undefined' ? db : firebase.firestore();
        const categoriesSnapshot = await store.collection('interieurs_categories').orderBy('name', 'asc').get();
        const categoryIdToName = {};
        categoriesSnapshot.forEach(doc => {
            const data = doc.data();
            categoryIdToName[doc.id] = data.name;
        });

        const interieursSnapshot = await store.collection('interieurs').orderBy('titre', 'asc').get();

        const groups = {};
        interieursSnapshot.forEach(doc => {
            const data = doc.data();
            const catName = categoryIdToName[data.categorieId] || 'Sans catégorie';
            if (!groups[catName]) {
                const og = document.createElement('optgroup');
                og.label = catName;
                groups[catName] = og;
            }
            const opt = document.createElement('option');
            opt.value = data.titre;
            opt.textContent = data.titre;
            opt.setAttribute('data-id', doc.id);
            groups[catName].appendChild(opt);
        });

        const groupNames = Object.keys(groups).sort();
        groupNames.forEach(name => select.appendChild(groups[name]));

        if (groupNames.length === 0) {
            const og = document.createElement('optgroup');
            og.label = 'Aucun intérieur';
            select.appendChild(og);
        }

        if (currentValue) {
            select.value = currentValue;
        }
    } catch (error) {
        console.error('Erreur chargement intérieurs:', error);
    }
}
