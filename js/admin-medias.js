let allMedias = [];
let filteredMedias = [];
let allProperties = [];
let allInterieurs = [];
const WORKER_BASE = 'https://orpi-cloudinary-proxy.orpigp.workers.dev';
let selectedIds = new Set();

document.addEventListener('DOMContentLoaded', async () => {
    if (!discordAuth.isAuthorized()) {
        window.location.href = 'index.html';
        return;
    }
    
    await loadData();
});

async function loadData() {
    try {
        allProperties = await propertyManager.getAll();
        const interieursRes = await getAllInterieurs();
        allInterieurs = interieursRes && interieursRes.success ? interieursRes.data : [];
        await loadCloudinaryImages();
    } catch (error) {
        console.error('Erreur chargement données:', error);
        showToast('Erreur lors du chargement', 'error');
    }
}

async function loadCloudinaryImages() {
    const loadingState = document.getElementById('loadingState');
    const mediaGrid = document.getElementById('mediaGrid');
    const emptyState = document.getElementById('emptyState');
    
    loadingState.style.display = 'block';
    mediaGrid.style.display = 'none';
    emptyState.style.display = 'none';
    
    try {
        const response = await fetch(`${WORKER_BASE}/list`);
        if (!response.ok) throw new Error('Erreur API proxy');
        const data = await response.json();
        allMedias = data.resources.map(resource => ({
            public_id: resource.public_id,
            url: resource.secure_url,
            format: resource.format,
            width: resource.width,
            height: resource.height,
            bytes: resource.bytes,
            created_at: resource.created_at,
            filename: resource.public_id.split('/').pop()
        }));
        
        analyzeUsage();
        updateStats();
        filteredMedias = [...allMedias];
        displayMedias();
        
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur lors du chargement des images', 'error');
        loadingState.style.display = 'none';
        emptyState.style.display = 'block';
    }
}

function analyzeUsage() {
    allMedias.forEach(media => {
        media.usedIn = [];
        
        allProperties.forEach(prop => {
            if (prop.images && Array.isArray(prop.images)) {
                if (prop.images.some(img => (typeof img === 'string') && (img.includes(media.public_id)))) {
                    media.usedIn.push({
                        type: 'Bien',
                        name: prop.title || prop.name || 'Sans nom',
                        id: prop.id
                    });
                }
            }
            if (prop.image && (typeof prop.image === 'string') && prop.image.includes(media.public_id)) {
                media.usedIn.push({
                    type: 'Bien',
                    name: prop.title || prop.name || 'Sans nom',
                    id: prop.id
                });
            }
        });
        
        allInterieurs.forEach(int => {
            if (int.images && Array.isArray(int.images)) {
                if (int.images.some(img => (typeof img === 'string') && img.includes(media.public_id))) {
                    media.usedIn.push({
                        type: 'Intérieur',
                        name: int.title || int.titre || int.name || 'Sans nom',
                        id: int.id
                    });
                }
            }
            if (int.image && (typeof int.image === 'string') && int.image.includes(media.public_id)) {
                media.usedIn.push({
                    type: 'Intérieur',
                    name: int.title || int.titre || int.name || 'Sans nom',
                    id: int.id
                });
            }
        });
    });
}

function updateStats() {
    const totalImages = allMedias.length;
    const usedImages = allMedias.filter(m => m.usedIn.length > 0).length;
    const unusedImages = totalImages - usedImages;
    const totalBytes = allMedias.reduce((sum, m) => sum + m.bytes, 0);
    const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
    
    document.getElementById('totalImages').textContent = totalImages;
    document.getElementById('usedImages').textContent = usedImages;
    document.getElementById('unusedImages').textContent = unusedImages;
    document.getElementById('totalStorage').textContent = totalMB + ' MB';
}

function displayMedias() {
    const loadingState = document.getElementById('loadingState');
    const mediaGrid = document.getElementById('mediaGrid');
    const emptyState = document.getElementById('emptyState');
    
    loadingState.style.display = 'none';
    
    if (filteredMedias.length === 0) {
        mediaGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    mediaGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    mediaGrid.innerHTML = filteredMedias.map(media => {
        const isUsed = media.usedIn.length > 0;
        const sizeKB = (media.bytes / 1024).toFixed(1);
        const date = new Date(media.created_at).toLocaleDateString('fr-FR');
        
        let usageHTML = '';
        if (isUsed) {
            usageHTML = media.usedIn.map(usage => {
                const name = usage.name || 'Sans nom';
                return `<div><i class=\"fas fa-link\"></i> ${usage.type}: ${name}</div>`
            }).join('');
        } else {
            usageHTML = '<div style="color: #ff9800;"><i class="fas fa-exclamation-triangle"></i> Non utilisée</div>';
        }
        
        return `
            <div class="media-card">
                <div class="media-image-container">
                    <img src="${media.url}" alt="${media.filename}" class="media-image" loading="lazy">
                    <div class="media-badge ${isUsed ? 'used' : 'unused'}">
                        ${isUsed ? 'Utilisée' : 'Non utilisée'}
                    </div>
                    <div style="position:absolute; left:10px; top:10px; background:#fff; border-radius:6px; padding:4px; box-shadow:0 1px 4px rgba(0,0,0,.15);">
                        <input type="checkbox" ${selectedIds.has(media.public_id) ? 'checked' : ''} onchange="toggleSelect('${media.public_id}', this.checked)">
                    </div>
                </div>
                <div class="media-info">
                    <div class="media-name" title="${media.filename}">${media.filename}</div>
                    <div class="media-meta">
                        <span>${media.width}x${media.height}</span>
                        <span>${sizeKB} KB</span>
                        <span>${date}</span>
                    </div>
                    <div class="media-usage">
                        ${usageHTML}
                    </div>
                    <div class="media-actions">
                        <button class="btn btn-view" onclick="viewImage('${media.url}')">
                            <i class="fas fa-eye"></i> Voir
                        </button>
                        <button class="btn btn-delete" onclick="deleteMedia('${media.public_id}', ${isUsed})">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function applyFilters() {
    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('filterSearch').value.toLowerCase();
    
    filteredMedias = allMedias.filter(media => {
        if (status === 'used' && media.usedIn.length === 0) return false;
        if (status === 'unused' && media.usedIn.length > 0) return false;
        
        if (search && !media.filename.toLowerCase().includes(search)) return false;
        
        return true;
    });
    
    displayMedias();
}

function viewImage(url) {
    window.open(url, '_blank');
}

async function deleteMedia(publicId, isUsed) {
    if (isUsed) {
        if (!confirm('⚠️ ATTENTION: Cette image est utilisée dans un ou plusieurs biens!\n\nÊtes-vous sûr de vouloir la supprimer? Cela causera des images manquantes.')) {
            return;
        }
    } else {
        if (!confirm('Voulez-vous vraiment supprimer cette image?')) {
            return;
        }
    }
    
    try {
        const response = await fetch(`${WORKER_BASE}/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_id: publicId })
        });
        const result = await response.json();
        
        if (result.result === 'ok') {
            showToast('Image supprimée avec succès', 'success');
            await loadCloudinaryImages();
        } else {
            throw new Error('Échec de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

async function refreshMedias() {
    await loadData();
    showToast('Liste actualisée', 'success');
}

function toggleSelect(id, checked) {
  if (checked) selectedIds.add(id); else selectedIds.delete(id);
}

function toggleSelectAll() {
  const allIds = filteredMedias.map(m => m.public_id);
  const allSelected = allIds.every(id => selectedIds.has(id));
  if (allSelected) {
    selectedIds.clear();
  } else {
    allIds.forEach(id => selectedIds.add(id));
  }
  displayMedias();
}

async function bulkDelete() {
  if (selectedIds.size === 0) {
    showToast('Aucune image sélectionnée', 'warning');
    return;
  }
  if (!confirm(`Supprimer ${selectedIds.size} image(s) ?`)) return;
  let success = 0, fail = 0;
  for (const id of Array.from(selectedIds)) {
    try {
      const res = await fetch(`${WORKER_BASE}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_id: id }) });
      const json = await res.json();
      if (json.result === 'ok') success++; else fail++;
    } catch {
      fail++;
    }
  }
  selectedIds.clear();
  await loadCloudinaryImages();
  showToast(`${success} supprimée(s), ${fail} échec(s)`, fail ? 'warning' : 'success');
}

function showToast(message, type = 'info') {
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        info: '#2196f3',
        warning: '#ff9800'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: ${colors[type]};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

