const urlParams = new URLSearchParams(window.location.search);
const declarationId = urlParams.get('id');

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);
}

document.addEventListener('DOMContentLoaded', () => {
    if (!declarationId) {
        showError();
        return;
    }
    loadDeclaration();
});

async function loadDeclaration() {
    try {
        const declaration = await declarationsDB.getById(declarationId);
        
        if (!declaration) {
            showError();
            return;
        }

        displayDeclaration(declaration);
        
        document.getElementById('loadingContainer').style.display = 'none';
        document.getElementById('declarationContainer').style.display = 'block';
    } catch (error) {
        console.error('Erreur chargement déclaration:', error);
        showError();
    }
}

function displayDeclaration(declaration) {
    // Afficher l'ID et le titre
    document.getElementById('declarationId').textContent = declaration.id;
    document.getElementById('declarationTitle').textContent = declaration.periodeName;
    
    // Afficher la date de clôture
    const date = declaration.clotureeAt ? new Date(declaration.clotureeAt.toDate()).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'N/A';
    document.getElementById('declarationDate').textContent = `Date de clôture: ${date}`;

    // Afficher le résumé
    const summaryHtml = `
        <div class="summary-item">
            <div class="summary-label"><i class="fas fa-users"></i> Nombre d'employés</div>
            <div class="summary-value">${declaration.totalEmployees}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label"><i class="fas fa-hand-holding-usd"></i> Total ventes</div>
            <div class="summary-value">${declaration.totalVentes}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label"><i class="fas fa-key"></i> Total locations</div>
            <div class="summary-value">${declaration.totalLocations}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label"><i class="fas fa-euro-sign"></i> Chiffre d'affaires</div>
            <div class="summary-value">${formatCurrency(declaration.totalCA)}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label"><i class="fas fa-chart-line"></i> Bénéfice total</div>
            <div class="summary-value">${formatCurrency(declaration.totalBenefice)}</div>
        </div>
        <div class="summary-item">
            <div class="summary-label"><i class="fas fa-money-bill-wave"></i> Salaires versés</div>
            <div class="summary-value">${formatCurrency(declaration.totalSalaires)}</div>
        </div>
    `;
    document.getElementById('declarationSummary').innerHTML = summaryHtml;

    // Afficher le tableau des employés
    const tbody = document.getElementById('employeesTableBody');
    let tableHtml = '';
    
    if (declaration.employeesData && declaration.employeesData.length > 0) {
        declaration.employeesData.forEach(emp => {
            tableHtml += `
                <tr>
                    <td><strong>${escapeHtml(emp.employeeName || 'N/A')}</strong></td>
                    <td>${escapeHtml(emp.employeeGrade || 'N/A')}</td>
                    <td>${emp.commission || 0}%</td>
                    <td>${emp.totalVentes || 0}</td>
                    <td>${emp.totalLocations || 0}</td>
                    <td>${emp.nombreVentes || 0}</td>
                    <td>${formatCurrency(emp.totalCA || 0)}</td>
                    <td>${formatCurrency(emp.totalBenefice || 0)}</td>
                    <td><strong>${formatCurrency(emp.totalSalaire || 0)}</strong></td>
                </tr>
            `;
        });
    } else {
        tableHtml = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: #666;">Aucun employé dans cette déclaration</td></tr>';
    }
    
    tbody.innerHTML = tableHtml;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError() {
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'block';
}

