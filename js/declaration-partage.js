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
    document.getElementById('declarationDate').innerHTML = `<i class="fas fa-calendar-alt"></i> ${date}`;

    // Calculer le CA après 15%
    const totalCAAfter15 = declaration.totalEntrepriseRevenue || 0;
    const beneficeNet = declaration.totalBenefice || 0;

    // Afficher le résumé avec des cartes améliorées
    const summaryHtml = `
        <div class="summary-item">
            <div class="summary-label"><i class="fas fa-users"></i> Employés</div>
            <div class="summary-value">${declaration.totalEmployees}</div>
        </div>
        <div class="summary-item gradient-green">
            <div class="summary-label"><i class="fas fa-hand-holding-usd"></i> Ventes</div>
            <div class="summary-value">${declaration.totalVentes}</div>
        </div>
        <div class="summary-item gradient-blue">
            <div class="summary-label"><i class="fas fa-key"></i> Locations</div>
            <div class="summary-value">${declaration.totalLocations}</div>
        </div>
        <div class="summary-item gradient-yellow">
            <div class="summary-label"><i class="fas fa-euro-sign"></i> Chiffre d'affaires</div>
            <div class="summary-value">${formatCurrency(declaration.totalCA)}</div>
        </div>
        <div class="summary-item gradient-green">
            <div class="summary-label"><i class="fas fa-chart-line"></i> CA Après 15%</div>
            <div class="summary-value">${formatCurrency(totalCAAfter15)}</div>
        </div>
        <div class="summary-item gradient-red">
            <div class="summary-label"><i class="fas fa-money-bill-wave"></i> Salaires Versés</div>
            <div class="summary-value">${formatCurrency(declaration.totalSalaires)}</div>
        </div>
        <div class="summary-item gradient-blue">
            <div class="summary-label"><i class="fas fa-coins"></i> Bénéfice Net</div>
            <div class="summary-value">${formatCurrency(beneficeNet)}</div>
        </div>
    `;
    document.getElementById('declarationSummary').innerHTML = summaryHtml;

    // Afficher le tableau des employés avec les nouvelles colonnes
    const tbody = document.getElementById('employeesTableBody');
    let tableHtml = '';
    
    if (declaration.employeesData && declaration.employeesData.length > 0) {
        declaration.employeesData.forEach((emp, index) => {
            const montantParVente = emp.montantParVente || 3300;
            tableHtml += `
                <tr>
                    <td style="font-weight: 600;"><strong>${escapeHtml(emp.employeeName || 'N/A')}</strong></td>
                    <td>${escapeHtml(emp.employeeGrade || 'N/A')}</td>
                    <td>${emp.commission || 0}%</td>
                    <td>${formatCurrency(montantParVente)}</td>
                    <td style="color: #28a745; font-weight: 600;">${emp.totalVentes || 0}</td>
                    <td style="color: #17a2b8; font-weight: 600;">${emp.totalLocations || 0}</td>
                    <td style="font-weight: 600;">${emp.nombreVentes || 0}</td>
                    <td>${formatCurrency(emp.totalCA || 0)}</td>
                    <td style="color: #17a2b8; font-weight: 600;">${formatCurrency(emp.totalBenefice || 0)}</td>
                    <td style="font-weight: 700; color: #dc3545;"><strong>${formatCurrency(emp.totalSalaire || 0)}</strong></td>
                </tr>
            `;
        });
        
        // Ajouter la ligne de totaux
        tableHtml += `
            <tfoot>
                <tr>
                    <td colspan="3" style="text-align: right; padding: 1.25rem 1rem;"><strong>TOTAUX</strong></td>
                    <td style="padding: 1.25rem 1rem;">-</td>
                    <td style="padding: 1.25rem 1rem;">${declaration.totalVentes}</td>
                    <td style="padding: 1.25rem 1rem;">${declaration.totalLocations}</td>
                    <td style="padding: 1.25rem 1rem;">${declaration.totalVentes + declaration.totalLocations}</td>
                    <td style="padding: 1.25rem 1rem;">${formatCurrency(declaration.totalCA)}</td>
                    <td style="padding: 1.25rem 1rem;">${formatCurrency(declaration.totalBenefice)}</td>
                    <td style="padding: 1.25rem 1rem; font-size: 1.1rem;">${formatCurrency(declaration.totalSalaires)}</td>
                </tr>
            </tfoot>
        `;
    } else {
        tableHtml = '<tr><td colspan="10" style="text-align: center; padding: 3rem; color: #666; font-size: 1.1rem;">Aucun employé dans cette déclaration</td></tr>';
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

