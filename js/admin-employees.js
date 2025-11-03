async function updateEmployeeCount() {
    try {
        const employees = await employeesDB.getAll();
        const countElement = document.querySelector('#employeeCount span');
        if (countElement) {
            countElement.textContent = employees.length;
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}
function showAddEmployeeModal() {
    document.getElementById('addEmployeeModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeAddEmployeeModal() {
    document.getElementById('addEmployeeModal').classList.remove('active');
    document.getElementById('addEmployeeForm').reset();
    document.body.style.overflow = '';
}
async function handleAddEmployee(event) {
    event.preventDefault();
    const employeeData = {
        name: document.getElementById('employeeName').value,
        grade: document.getElementById('employeeGrade').value,
        commission: parseFloat(document.getElementById('employeeCommission').value),
        primes: parseFloat(document.getElementById('employeePrimes').value || 0),
        dividendes: parseFloat(document.getElementById('employeeDividendes').value || 0)
    };
    try {
        await employeesDB.add(employeeData);
        toast.success('Employé ajouté avec succès !');
        closeAddEmployeeModal();
        await updateEmployeeCount();
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de l\'ajout de l\'employé');
    }
}
async function showManageEmployeesModal() {
    const modal = document.getElementById('manageEmployeesModal');
    const list = document.getElementById('employeesList');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    try {
        const employees = await employeesDB.getAll();
        if (employees.length === 0) {
            list.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-color);">Aucun employé enregistré.</p>';
            return;
        }
        let html = '';
        for (const employee of employees) {
            const stats = await employeesDB.getStats(employee.id);
            html += `
                <div class="property-item">
                    <div class="property-item-content">
                        <h3>${employee.name}</h3>
                        <div class="property-item-details">
                            <span><i class="fas fa-id-badge"></i> ${employee.grade}</span>
                            <span><i class="fas fa-percent"></i> Commission: ${employee.commission}%</span>
                            <span><i class="fas fa-chart-line"></i> ${stats.nombreVentes} ventes</span>
                            <span><i class="fas fa-euro-sign"></i> CA: ${formatCurrency(stats.totalCA)}</span>
                        </div>
                    </div>
                    <div class="property-item-actions">
                        <a href="fiche-employee.html?id=${employee.id}" class="property-action-btn edit-btn" title="Voir la fiche">
                            <i class="fas fa-eye"></i>
                        </a>
                        <button onclick="editEmployee('${employee.id}')" class="property-action-btn edit-btn" title="Modifier">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteEmployee('${employee.id}')" class="property-action-btn delete-btn" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        list.innerHTML = html;
    } catch (error) {
        console.error('Erreur:', error);
        list.innerHTML = '<p style="text-align: center; padding: 2rem; color: red;">Erreur lors du chargement des employés.</p>';
    }
}
function closeManageEmployeesModal() {
    document.getElementById('manageEmployeesModal').classList.remove('active');
    document.body.style.overflow = '';
}
async function editEmployee(employeeId) {
    try {
        const employee = await employeesDB.getById(employeeId);
        if (!employee) {
            toast.error('Employé introuvable');
            return;
        }
        document.getElementById('editEmployeeId').value = employeeId;
        document.getElementById('editEmployeeName').value = employee.name;
        document.getElementById('editEmployeeGrade').value = employee.grade;
        document.getElementById('editEmployeeCommission').value = employee.commission;
        document.getElementById('editEmployeePrimes').value = employee.primes || 0;
        document.getElementById('editEmployeeDividendes').value = employee.dividendes || 0;
        closeManageEmployeesModal();
        document.getElementById('editEmployeeModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement de l\'employé');
    }
}
function closeEditEmployeeModal() {
    document.getElementById('editEmployeeModal').classList.remove('active');
    document.getElementById('editEmployeeForm').reset();
    document.body.style.overflow = '';
}
async function handleEditEmployee(event) {
    event.preventDefault();
    const employeeId = document.getElementById('editEmployeeId').value;
    const employeeData = {
        name: document.getElementById('editEmployeeName').value,
        grade: document.getElementById('editEmployeeGrade').value,
        commission: parseFloat(document.getElementById('editEmployeeCommission').value),
        primes: parseFloat(document.getElementById('editEmployeePrimes').value || 0),
        dividendes: parseFloat(document.getElementById('editEmployeeDividendes').value || 0)
    };
    try {
        await employeesDB.update(employeeId, employeeData);
        toast.success('Employé modifié avec succès !');
        closeEditEmployeeModal();
        await updateEmployeeCount();
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la modification de l\'employé');
    }
}
async function deleteEmployee(employeeId) {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet employé ? Toutes ses ventes seront également supprimées.')) {
        return;
    }
    try {
        await employeesDB.delete(employeeId);
        toast.success('Employé supprimé avec succès !');
        await showManageEmployeesModal();
        await updateEmployeeCount();
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la suppression de l\'employé');
    }
}
async function updateDeclarationCount() {
    try {
        const declarations = await declarationsDB.getAll();
        const countElement = document.querySelector('#declarationCount span');
        if (countElement) {
            countElement.textContent = declarations.length;
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}
function showClotureModal() {
    const now = new Date();
    const defaultPeriodName = `Déclaration ${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    document.getElementById('periodName').value = defaultPeriodName;
    document.getElementById('clotureModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeClotureModal() {
    document.getElementById('clotureModal').classList.remove('active');
    document.getElementById('clotureForm').reset();
    document.body.style.overflow = '';
}
async function handleCloture(event) {
    event.preventDefault();
    const periodName = document.getElementById('periodName').value;
    if (!confirm(`⚠️ Confirmer la clôture de la période "${periodName}" ?\n\nCette action :\n• Sauvegardera toutes les ventes dans l'historique\n• Réinitialisera les fiches de vente de tous les employés\n\nCette action est irréversible.`)) {
        return;
    }
    try {
        const declarationId = await declarationsDB.cloture(periodName);
        toast.success('Période clôturée avec succès ! Les données ont été sauvegardées dans l\'historique.');
        closeClotureModal();
        await updateDeclarationCount();
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la clôture de la période');
    }
}
async function showHistoriqueModal() {
    const modal = document.getElementById('historiqueModal');
    const list = document.getElementById('historiqueList');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    try {
        const declarations = await declarationsDB.getAll();
        if (declarations.length === 0) {
            list.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-color);">Aucune déclaration archivée.</p>';
            return;
        }
        let html = '';
        declarations.forEach(declaration => {
            const date = declaration.clotureeAt ? new Date(declaration.clotureeAt.toDate()).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'N/A';
            html += `
                <div class="property-item">
                    <div class="property-item-content">
                        <h3>${declaration.periodeName}</h3>
                        <div class="property-item-details">
                            <span><i class="fas fa-calendar"></i> ${date}</span>
                            <span><i class="fas fa-users"></i> ${declaration.totalEmployees} employés</span>
                            <span><i class="fas fa-chart-line"></i> ${declaration.totalVentes + declaration.totalLocations} ventes</span>
                            <span><i class="fas fa-euro-sign"></i> CA: ${formatCurrency(declaration.totalCA)}</span>
                        </div>
                    </div>
                    <div class="property-item-actions">
                        <button onclick="showDeclarationDetails('${declaration.id}')" class="property-action-btn edit-btn" title="Voir les détails">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="deleteDeclaration('${declaration.id}')" class="property-action-btn delete-btn" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    } catch (error) {
        console.error('Erreur:', error);
        list.innerHTML = '<p style="text-align: center; padding: 2rem; color: red;">Erreur lors du chargement de l\'historique.</p>';
    }
}
function closeHistoriqueModal() {
    document.getElementById('historiqueModal').classList.remove('active');
    document.body.style.overflow = '';
}
async function showDeclarationDetails(declarationId) {
    const modal = document.getElementById('declarationDetailsModal');
    const content = document.getElementById('declarationDetailsContent');
    try {
        const declaration = await declarationsDB.getById(declarationId);
        if (!declaration) {
            toast.error('Déclaration introuvable');
            return;
        }
        const date = declaration.clotureeAt ? new Date(declaration.clotureeAt.toDate()).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'N/A';
        let html = `
            <div style="margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2 style="color: var(--primary-color); margin: 0;">${declaration.periodeName}</h2>
                    <button onclick="shareDeclaration('${declaration.id}')" class="btn btn-primary" style="padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-share-alt"></i> Partager
                    </button>
                </div>
                <p style="color: var(--text-color); margin-bottom: 0.5rem;"><strong>Date de clôture:</strong> ${date}</p>
                <p style="color: var(--text-color); margin-bottom: 0.5rem;"><strong>Nombre d'employés:</strong> ${declaration.totalEmployees}</p>
                <p style="color: var(--text-color); margin-bottom: 0.5rem;"><strong>Total ventes:</strong> ${declaration.totalVentes}</p>
                <p style="color: var(--text-color); margin-bottom: 0.5rem;"><strong>Total locations:</strong> ${declaration.totalLocations}</p>
                <p style="color: var(--text-color); margin-bottom: 0.5rem;"><strong>Chiffre d'affaires total:</strong> ${formatCurrency(declaration.totalCA)}</p>
                <p style="color: var(--text-color); margin-bottom: 0.5rem;"><strong>Bénéfice total:</strong> ${formatCurrency(declaration.totalBenefice)}</p>
                <p style="color: var(--text-color);"><strong>Salaires versés:</strong> ${formatCurrency(declaration.totalSalaires)}</p>
            </div>
            <h3 style="color: var(--secondary-color); margin-bottom: 1rem; border-bottom: 2px solid var(--primary-color); padding-bottom: 0.5rem;">Détails par Employé</h3>
            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Employé</th>
                            <th>Grade</th>
                            <th>Commission</th>
                            <th>Ventes</th>
                            <th>Locations</th>
                            <th>Total Ventes</th>
                            <th>CA</th>
                            <th>Bénéfice</th>
                            <th>Salaire</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        declaration.employeesData.forEach(emp => {
            html += `
                <tr>
                    <td><strong>${emp.employeeName}</strong></td>
                    <td>${emp.employeeGrade}</td>
                    <td>${emp.commission}%</td>
                    <td>${emp.totalVentes}</td>
                    <td>${emp.totalLocations}</td>
                    <td>${emp.nombreVentes}</td>
                    <td>${formatCurrency(emp.totalCA)}</td>
                    <td>${formatCurrency(emp.totalBenefice)}</td>
                    <td><strong>${formatCurrency(emp.totalSalaire)}</strong></td>
                </tr>
            `;
        });
        html += `
                    </tbody>
                </table>
            </div>
        `;
        content.innerHTML = html;
        closeHistoriqueModal();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement des détails');
    }
}
function closeDeclarationDetailsModal() {
    document.getElementById('declarationDetailsModal').classList.remove('active');
    document.body.style.overflow = '';
}

function shareDeclaration(declarationId) {
    let declarationUrl;
    
    // Vérifier que la méthode existe (protection contre le cache)
    if (!declarationsDB || typeof declarationsDB.getDeclarationUrl !== 'function') {
        // Fallback: générer l'URL manuellement
        const hostname = window.location.hostname;
        const origin = window.location.origin;
        
        if (hostname.includes('github.io')) {
            const parts = hostname.split('.');
            if (parts.length === 3 && parts[0] !== 'www') {
                declarationUrl = `${origin}/declaration-partage.html?id=${declarationId}`;
            } else {
                const pathname = window.location.pathname;
                const pathParts = pathname.split('/').filter(p => p && !p.includes('.'));
                const repoName = pathParts[0] || '';
                const baseUrl = repoName ? `${origin}/${repoName}` : origin;
                declarationUrl = `${baseUrl}/declaration-partage.html?id=${declarationId}`;
            }
        } else {
            declarationUrl = `${origin}/declaration-partage.html?id=${declarationId}`;
        }
        
        console.warn('getDeclarationUrl non disponible, utilisation du fallback. Rechargez la page (F5) pour la dernière version.');
    } else {
        // Générer l'URL de partage
        declarationUrl = declarationsDB.getDeclarationUrl(declarationId);
    }
    
    // Créer un modal pour afficher le lien
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 2rem;';
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 600px; width: 100%;">
            <h2 style="color: var(--primary-color); margin-bottom: 1rem;">
                <i class="fas fa-share-alt"></i> Partager la déclaration
            </h2>
            <p style="margin-bottom: 1rem;">Partagez ce lien avec n'importe qui pour afficher le récapitulatif :</p>
            <div style="background: #f3f4f6; padding: 1rem; border-radius: 5px; margin-bottom: 1rem; word-break: break-all;">
                <code id="declarationUrlText">${declarationUrl}</code>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="copyDeclarationBtn" class="btn btn-primary">
                    <i class="fas fa-copy"></i> Copier le lien
                </button>
                <button id="openDeclarationBtn" class="btn btn-secondary">
                    <i class="fas fa-external-link-alt"></i> Ouvrir
                </button>
                <button id="closeDeclarationModalBtn" class="btn btn-secondary">
                    Fermer
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Ajouter les event listeners
    document.getElementById('copyDeclarationBtn').addEventListener('click', () => {
        copyDeclarationUrl(declarationUrl);
    });
    document.getElementById('openDeclarationBtn').addEventListener('click', () => {
        openDeclarationPage(declarationUrl);
    });
    document.getElementById('closeDeclarationModalBtn').addEventListener('click', () => {
        modal.remove();
    });
}

function copyDeclarationUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        toast.success('Lien copié dans le presse-papiers !');
    }).catch(() => {
        // Fallback pour les navigateurs qui ne supportent pas l'API Clipboard
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            toast.success('Lien copié dans le presse-papiers !');
        } catch (err) {
            toast.error('Impossible de copier le lien');
        }
        document.body.removeChild(textArea);
    });
}

function openDeclarationPage(url) {
    window.open(url, '_blank');
}
async function deleteDeclaration(declarationId) {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cette déclaration de l\'historique ?')) {
        return;
    }
    try {
        await declarationsDB.delete(declarationId);
        toast.success('Déclaration supprimée avec succès !');
        await showHistoriqueModal();
        await updateDeclarationCount();
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la suppression de la déclaration');
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
document.addEventListener('DOMContentLoaded', () => {
    updateEmployeeCount();
    updateDeclarationCount();
    
    // Vérifier que firebase-declarations.js est bien chargé avec la nouvelle méthode
    if (typeof declarationsDB !== 'undefined' && typeof declarationsDB.getDeclarationUrl !== 'function') {
        console.warn('⚠️ firebase-declarations.js semble être en cache. Rechargez la page (Ctrl+F5) pour obtenir la dernière version.');
    }
});
