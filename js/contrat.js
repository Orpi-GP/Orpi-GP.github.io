let currentContract = null;
let unsubscribe = null;
let canvasAdmin = null;
let canvasClient = null;
let ctxAdmin = null;
let ctxClient = null;
let isDrawing = false;

const urlParams = new URLSearchParams(window.location.search);
const contractId = urlParams.get('id');

const statusTexts = {
    pending: 'En attente de signature',
    partially_signed: 'Partiellement signé',
    completed: 'Complété'
};

document.addEventListener('DOMContentLoaded', () => {
    if (!contractId) {
        showError();
        return;
    }
    loadContract();
});

async function loadContract() {
    try {
        const contract = await ContractsManager.getContract(contractId);
        
        if (!contract) {
            showError();
            return;
        }

        currentContract = contract;
        displayContract(contract);
        
        unsubscribe = ContractsManager.onContractSnapshot(contractId, (updatedContract) => {
            currentContract = updatedContract;
            updateContractDisplay(updatedContract);
        });

        document.getElementById('loadingContainer').style.display = 'none';
        document.getElementById('contractContainer').style.display = 'block';
    } catch (error) {
        console.error('Erreur chargement contrat:', error);
        showError();
    }
}

function displayContract(contract) {
    document.getElementById('contractId').textContent = contract.id;
    document.getElementById('contractTitle').textContent = contract.title;
    document.getElementById('contractType').textContent = contract.type;
    document.getElementById('contractClient').textContent = contract.clientName;
    document.getElementById('contractAmount').textContent = contract.amount ? `${contract.amount} €` : 'Non spécifié';
    document.getElementById('contractDescription').innerHTML = contract.description.replace(/\n/g, '<br>');
    document.getElementById('contractTerms').innerHTML = contract.terms.replace(/\n/g, '<br>');
    
    if (contract.createdAt) {
        const date = contract.createdAt.toDate();
        document.getElementById('contractDate').textContent = date.toLocaleDateString('fr-FR');
    }

    updateContractDisplay(contract);
}

function updateContractDisplay(contract) {
    const statusElement = document.getElementById('contractStatus');
    statusElement.textContent = statusTexts[contract.status];
    statusElement.className = `contract-status status-${contract.status}`;

    if (contract.status === 'completed') {
        document.getElementById('completedBanner').style.display = 'block';
    }

    updateSignatureBox('admin', contract);
    updateSignatureBox('client', contract);
}

function updateSignatureBox(role, contract) {
    const box = document.getElementById(`${role}SignatureBox`);
    const content = document.getElementById(`${role}SignatureContent`);
    
    if (contract.signatures[role]) {
        box.classList.add('signed');
        const signedDate = contract.signedAt[role] ? contract.signedAt[role].toDate().toLocaleString('fr-FR') : '';
        content.innerHTML = `
            <img src="${contract.signatures[role]}" alt="Signature ${role}" class="signature-image">
            <div class="signature-info">
                <i class="fas fa-check-circle" style="color: #10B981;"></i>
                Signé le ${signedDate}
            </div>
        `;
    } else {
        box.classList.remove('signed');
        content.innerHTML = `
            <canvas id="${role}Canvas" class="signature-canvas" width="300" height="150"></canvas>
            <div class="signature-actions">
                <button class="btn-clear" onclick="clearSignature('${role}')">
                    <i class="fas fa-eraser"></i> Effacer
                </button>
                <button class="btn-sign" onclick="saveSignature('${role}')">
                    <i class="fas fa-signature"></i> Signer
                </button>
            </div>
            <div class="signature-info">
                Signez dans le cadre ci-dessus
            </div>
        `;
        
        initializeCanvas(role);
    }
}

function initializeCanvas(role) {
    const canvas = document.getElementById(`${role}Canvas`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    if (role === 'admin') {
        canvasAdmin = canvas;
        ctxAdmin = ctx;
    } else {
        canvasClient = canvas;
        ctxClient = ctx;
    }

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    const startDrawing = (e) => {
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = (e.clientX || e.touches[0].clientX) - rect.left;
        lastY = (e.clientY || e.touches[0].clientY) - rect.top;
    };

    const draw = (e) => {
        if (!drawing) return;
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        lastX = x;
        lastY = y;
    };

    const stopDrawing = () => {
        drawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
}

function clearSignature(role) {
    const canvas = role === 'admin' ? canvasAdmin : canvasClient;
    const ctx = role === 'admin' ? ctxAdmin : ctxClient;
    
    if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

async function saveSignature(role) {
    const canvas = role === 'admin' ? canvasAdmin : canvasClient;
    
    if (!canvas) {
        toast.error('Canvas de signature introuvable');
        return;
    }

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let hasDrawing = false;

    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] > 0) {
            hasDrawing = true;
            break;
        }
    }

    if (!hasDrawing) {
        toast.warning('Veuillez signer avant de valider');
        return;
    }

    const user = JSON.parse(localStorage.getItem('discord_user') || '{}');
    const isAdmin = DISCORD_CONFIG.authorizedIds.includes(user.id);

    if (role === 'admin' && !isAdmin) {
        toast.error('Seul un administrateur peut signer en tant qu\'admin');
        return;
    }

    try {
        const signatureData = canvas.toDataURL('image/png');
        await ContractsManager.signContract(contractId, signatureData, role);
        toast.success(`Signature ${role === 'admin' ? 'administrateur' : 'client'} enregistrée avec succès !`);
    } catch (error) {
        console.error('Erreur signature:', error);
        toast.error('Erreur lors de l\'enregistrement de la signature');
    }
}

function showError() {
    document.getElementById('loadingContainer').style.display = 'none';
    document.getElementById('errorContainer').style.display = 'block';
}

window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});

