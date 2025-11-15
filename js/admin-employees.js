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
async function showAddEmployeeModal() {
    const currentUser = discordAuth.getUser();
    if (!currentUser) return;
    
    if (!DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
        const db = firebase.firestore();
        const permissionsDoc = await db.collection('admin_permissions').doc(currentUser.id).get();
        if (!permissionsDoc.exists || !permissionsDoc.data().manage_employees_full) {
            toast.error('Vous n\'avez pas la permission de gérer les employés.');
            return;
        }
    }
    
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
    
    const currentUser = discordAuth.getUser();
    if (!currentUser) return;
    
    if (!DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
        const db = firebase.firestore();
        const permissionsDoc = await db.collection('admin_permissions').doc(currentUser.id).get();
        if (!permissionsDoc.exists || !permissionsDoc.data().manage_employees_full) {
            toast.error('Vous n\'avez pas la permission de gérer les employés.');
            return;
        }
    }
    
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
    const currentUser = discordAuth.getUser();
    if (!currentUser) return;
    
    if (!DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
        const db = firebase.firestore();
        const permissionsDoc = await db.collection('admin_permissions').doc(currentUser.id).get();
        if (!permissionsDoc.exists || !permissionsDoc.data().manage_employees_full) {
            toast.error('Vous n\'avez pas la permission de gérer les employés.');
            return;
        }
    }
    
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
    
    const currentUser = discordAuth.getUser();
    if (!currentUser) return;
    
    if (!DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
        const db = firebase.firestore();
        const permissionsDoc = await db.collection('admin_permissions').doc(currentUser.id).get();
        if (!permissionsDoc.exists || !permissionsDoc.data().manage_employees_full) {
            toast.error('Vous n\'avez pas la permission de gérer les employés.');
            return;
        }
    }
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
    const currentUser = discordAuth.getUser();
    if (!currentUser) return;
    
    if (!DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
        const db = firebase.firestore();
        const permissionsDoc = await db.collection('admin_permissions').doc(currentUser.id).get();
        if (!permissionsDoc.exists || !permissionsDoc.data().manage_employees_full) {
            toast.error('Vous n\'avez pas la permission de gérer les employés.');
            return;
        }
    }
    
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
async function showClotureModal() {
    const currentUser = discordAuth.getUser();
    if (!currentUser) return;
    
    if (!DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
        const db = firebase.firestore();
        const permissionsDoc = await db.collection('admin_permissions').doc(currentUser.id).get();
        if (!permissionsDoc.exists || !permissionsDoc.data().manage_declarations) {
            toast.error('Vous n\'avez pas la permission de gérer les déclarations.');
            return;
        }
    }
    
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
    
    const currentUser = discordAuth.getUser();
    if (!currentUser) return;
    
    if (!DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
        const db = firebase.firestore();
        const permissionsDoc = await db.collection('admin_permissions').doc(currentUser.id).get();
        if (!permissionsDoc.exists || !permissionsDoc.data().manage_declarations) {
            toast.error('Vous n\'avez pas la permission de gérer les déclarations.');
            return;
        }
    }
    
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
    const currentUser = discordAuth.getUser();
    if (!currentUser) return;
    
    if (!DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
        const db = firebase.firestore();
        const permissionsDoc = await db.collection('admin_permissions').doc(currentUser.id).get();
        if (!permissionsDoc.exists || (!permissionsDoc.data().view_declarations && !permissionsDoc.data().manage_declarations)) {
            toast.error('Vous n\'avez pas la permission de voir l\'historique des déclarations.');
            return;
        }
    }
    
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
        
        // Calculer le CA après 15%
        const totalCAAfter15 = declaration.totalEntrepriseRevenue || 0;
        const beneficeNet = declaration.totalBenefice || 0;
        
        let html = `
            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 2rem; border-radius: 12px; margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 style="color: var(--primary-color); margin: 0 0 0.5rem 0; font-size: 1.75rem;">${declaration.periodeName}</h2>
                        <p style="color: #6c757d; margin: 0; font-size: 0.95rem;"><i class="fas fa-calendar"></i> ${date}</p>
                    </div>
                    <button onclick="shareDeclaration('${declaration.id}')" class="btn btn-primary" style="padding: 0.75rem 1.5rem; display: flex; align-items: center; gap: 0.5rem; white-space: nowrap;">
                        <i class="fas fa-share-alt"></i> Partager
                    </button>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="background: white; padding: 1rem; border-radius: 8px; border-left: 4px solid var(--primary-color);">
                        <div style="font-size: 0.85rem; color: #6c757d; margin-bottom: 0.25rem;">Employés</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color);">${declaration.totalEmployees}</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 8px; border-left: 4px solid #28a745;">
                        <div style="font-size: 0.85rem; color: #6c757d; margin-bottom: 0.25rem;">Ventes</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #28a745;">${declaration.totalVentes}</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 8px; border-left: 4px solid #17a2b8;">
                        <div style="font-size: 0.85rem; color: #6c757d; margin-bottom: 0.25rem;">Locations</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: #17a2b8;">${declaration.totalLocations}</div>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 8px; border-left: 4px solid #ffc107;">
                        <div style="font-size: 0.85rem; color: #6c757d; margin-bottom: 0.25rem;">Chiffre d'affaires</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #ffc107;">${formatCurrency(declaration.totalCA)}</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div style="background: linear-gradient(135deg, #28a745, #20c997); padding: 1.25rem; border-radius: 8px; color: white;">
                        <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.5rem;">CA Après 15%</div>
                        <div style="font-size: 1.75rem; font-weight: 700;">${formatCurrency(totalCAAfter15)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #dc3545, #c82333); padding: 1.25rem; border-radius: 8px; color: white;">
                        <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.5rem;">Salaires Versés</div>
                        <div style="font-size: 1.75rem; font-weight: 700;">${formatCurrency(declaration.totalSalaires)}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #17a2b8, #138496); padding: 1.25rem; border-radius: 8px; color: white;">
                        <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 0.5rem;">Bénéfice Net</div>
                        <div style="font-size: 1.75rem; font-weight: 700;">${formatCurrency(beneficeNet)}</div>
                    </div>
                </div>
            </div>
            
            <h3 style="color: var(--secondary-color); margin-bottom: 1.5rem; border-bottom: 3px solid var(--primary-color); padding-bottom: 0.75rem; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-users"></i> Détails par Employé
            </h3>
            <div style="overflow-x: auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <table class="data-table" style="margin: 0;">
                    <thead>
                        <tr>
                            <th style="position: sticky; left: 0; background: linear-gradient(135deg, var(--secondary-color, #1a1a1a), #2d2d2d); z-index: 10;">Employé</th>
                            <th>Grade</th>
                            <th>Commission Locations</th>
                            <th>Montant/Vente</th>
                            <th>Ventes</th>
                            <th>Locations</th>
                            <th>Total</th>
                            <th>CA</th>
                            <th>Bénéfice</th>
                            <th style="background: linear-gradient(135deg, #dc3545, #c82333);">Salaire</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        declaration.employeesData.forEach((emp, index) => {
            const montantParVente = emp.montantParVente || 3300;
            const isEven = index % 2 === 0;
            html += `
                <tr style="background: ${isEven ? '#f8f9fa' : 'white'};">
                    <td style="position: sticky; left: 0; background: ${isEven ? '#f8f9fa' : 'white'}; z-index: 5; font-weight: 600;"><strong>${emp.employeeName}</strong></td>
                    <td>${emp.employeeGrade || 'N/A'}</td>
                    <td>${emp.commission || 0}%</td>
                    <td>${formatCurrency(montantParVente)}</td>
                    <td style="color: #28a745; font-weight: 600;">${emp.totalVentes || 0}</td>
                    <td style="color: #17a2b8; font-weight: 600;">${emp.totalLocations || 0}</td>
                    <td style="font-weight: 600;">${emp.nombreVentes || 0}</td>
                    <td>${formatCurrency(emp.totalCA || 0)}</td>
                    <td style="color: #17a2b8; font-weight: 600;">${formatCurrency(emp.totalBenefice || 0)}</td>
                    <td style="background: linear-gradient(135deg, rgba(220, 53, 69, 0.1), rgba(200, 35, 51, 0.1)); font-weight: 700; color: #dc3545;"><strong>${formatCurrency(emp.totalSalaire || 0)}</strong></td>
                </tr>
            `;
        });
        html += `
                    </tbody>
                    <tfoot style="background: linear-gradient(135deg, var(--primary-color, #E30613), #ff2a39); color: white; font-weight: 700;">
                        <tr>
                            <td colspan="4" style="text-align: right; padding: 1rem;"><strong>TOTAUX</strong></td>
                            <td style="padding: 1rem;">${declaration.totalVentes}</td>
                            <td style="padding: 1rem;">${declaration.totalLocations}</td>
                            <td style="padding: 1rem;">${declaration.totalVentes + declaration.totalLocations}</td>
                            <td style="padding: 1rem;">${formatCurrency(declaration.totalCA)}</td>
                            <td style="padding: 1rem;">${formatCurrency(declaration.totalBenefice)}</td>
                            <td style="padding: 1rem; font-size: 1.1rem;">${formatCurrency(declaration.totalSalaires)}</td>
                        </tr>
                    </tfoot>
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
    
    if (!declarationsDB || typeof declarationsDB.getDeclarationUrl !== 'function') {
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
        declarationUrl = declarationsDB.getDeclarationUrl(declarationId);
    }
    
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
async function showAdvancedEmployeeManagementModal() {
    const currentUser = discordAuth.getUser();
    if (!currentUser) return;
    
    if (!DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
        const db = firebase.firestore();
        const permissionsDoc = await db.collection('admin_permissions').doc(currentUser.id).get();
        if (!permissionsDoc.exists || !permissionsDoc.data().manage_employee_salary) {
            toast.error('Vous n\'avez pas la permission de gérer les salaires par vente.');
            return;
        }
    }
    
    const modal = document.getElementById('advancedEmployeeManagementModal');
    const list = document.getElementById('advancedEmployeeList');
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
            const montantParVente = employee.montantParVente || 3300;
            html += `
                <div class="property-item" style="margin-bottom: 1rem;">
                    <div class="property-item-content" style="flex: 1;">
                        <h3 style="margin-bottom: 0.5rem;">${employee.name}</h3>
                        <div class="property-item-details" style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <span><i class="fas fa-id-badge"></i> ${employee.grade}</span>
                            <span><i class="fas fa-chart-line"></i> ${stats.nombreVentes} ventes</span>
                            <span><i class="fas fa-euro-sign"></i> Salaire actuel: ${formatCurrency(stats.totalSalaire)}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; min-width: 200px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="montantParVente_${employee.id}" style="font-size: 0.9rem; margin-bottom: 0.25rem;">Montant par vente (€)</label>
                            <input type="number" 
                                   id="montantParVente_${employee.id}" 
                                   value="${montantParVente}" 
                                   min="0" 
                                   step="100"
                                   style="width: 100%; padding: 0.5rem; border: 2px solid var(--light-bg); border-radius: 5px;"
                                   onchange="updateEmployeeSalaryPerSale('${employee.id}', this.value)">
                        </div>
                        <button onclick="updateEmployeeSalaryPerSale('${employee.id}', document.getElementById('montantParVente_${employee.id}').value)" 
                                class="property-action-btn edit-btn" 
                                style="width: 100%; padding: 0.5rem;">
                            <i class="fas fa-save"></i> Enregistrer
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

function closeAdvancedEmployeeManagementModal() {
    document.getElementById('advancedEmployeeManagementModal').classList.remove('active');
    document.body.style.overflow = '';
}

async function updateEmployeeSalaryPerSale(employeeId, montant) {
    const currentUser = discordAuth.getUser();
    if (!currentUser) return;
    
    if (!DISCORD_CONFIG.adminManagerIds.includes(currentUser.id)) {
        const db = firebase.firestore();
        const permissionsDoc = await db.collection('admin_permissions').doc(currentUser.id).get();
        if (!permissionsDoc.exists || !permissionsDoc.data().manage_employee_salary) {
            toast.error('Vous n\'avez pas la permission de gérer les salaires par vente.');
            return;
        }
    }
    
    const montantNum = parseFloat(montant) || 3300;
    
    try {
        await employeesDB.update(employeeId, {
            montantParVente: montantNum
        });
        toast.success('Montant par vente mis à jour avec succès !');
        
        // Recalculer les salaires pour toutes les ventes de cet employé
        await recalculateEmployeeSales(employeeId);
        
        // Rafraîchir l'affichage
        await showAdvancedEmployeeManagementModal();
    } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la mise à jour');
    }
}

async function recalculateEmployeeSales(employeeId) {
    try {
        const employee = await employeesDB.getById(employeeId);
        if (!employee) return;
        
        const montantParVente = employee.montantParVente || 3300;
        const commissionLocations = employee.commission || 0;
        const salesSnapshot = await firebase.firestore()
            .collection('sales')
            .where('employeeId', '==', employeeId)
            .get();
        
        const batch = firebase.firestore().batch();
        const ENTREPRISE_PERCENTAGE = 0.15;
        const SALAIRE_MAX = 150000;
        
        salesSnapshot.docs.forEach(doc => {
            const sale = doc.data();
            const prixMaison = parseFloat(sale.prixMaison || 0);
            const prixLocation = parseFloat(sale.prixLocation || 0);
            let entrepriseRevenue = 0;
            let salaire = 0;
            let benefice = 0;
            
            if (sale.type === 'vente') {
                // Pour les ventes : montant fixe par vente
                entrepriseRevenue = prixMaison * ENTREPRISE_PERCENTAGE;
                salaire = montantParVente;
                benefice = entrepriseRevenue - salaire;
            } else if (sale.type === 'location') {
                // Pour les locations : pourcentage sur le CA après 15%
                entrepriseRevenue = prixLocation * ENTREPRISE_PERCENTAGE;
                salaire = Math.min(entrepriseRevenue * (commissionLocations / 100), SALAIRE_MAX);
                benefice = entrepriseRevenue - salaire;
            }
            
            batch.update(doc.ref, {
                salaire: salaire,
                benefice: benefice,
                entrepriseRevenue: entrepriseRevenue
            });
        });
        
        await batch.commit();
        console.log(`Salaires recalculés pour l'employé ${employeeId}`);
    } catch (error) {
        console.error('Erreur lors du recalcul des ventes:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateEmployeeCount();
    updateDeclarationCount();
    
    if (typeof declarationsDB !== 'undefined' && typeof declarationsDB.getDeclarationUrl !== 'function') {
        console.warn('⚠️ firebase-declarations.js semble être en cache. Rechargez la page (Ctrl+F5) pour obtenir la dernière version.');
    }
});
