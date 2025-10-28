const cloudinaryUpload = {
    async uploadImage(file, onProgress = null) {
        try {
            const compressedFile = await this.compressImage(file);
            
            const formData = new FormData();
            formData.append('file', compressedFile);
            formData.append('upload_preset', window.CLOUDINARY_CONFIG.uploadPreset);
            formData.append('folder', 'orpi-immobilier');
            
            const xhr = new XMLHttpRequest();
            
            return new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable && onProgress) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete);
                    }
                });
                
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response.secure_url);
                    } else {
                        reject(new Error('Upload échoué'));
                    }
                });
                
                xhr.addEventListener('error', () => reject(new Error('Erreur réseau')));
                
                xhr.open('POST', `https://api.cloudinary.com/v1_1/${window.CLOUDINARY_CONFIG.cloudName}/image/upload`);
                xhr.send(formData);
            });
        } catch (error) {
            console.error('Erreur upload Cloudinary:', error);
            throw error;
        }
    },
    
    async uploadMultipleImages(files, onProgress = null) {
        const uploadPromises = Array.from(files).map((file, index) => 
            this.uploadImage(file, (progress) => {
                if (onProgress) {
                    const totalProgress = ((index + (progress / 100)) / files.length) * 100;
                    onProgress(totalProgress, index + 1, files.length);
                }
            })
        );
        
        return Promise.all(uploadPromises);
    },
    
    compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    const maxSize = 1920;
                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = (height / width) * maxSize;
                            width = maxSize;
                        } else {
                            width = (width / height) * maxSize;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    }, 'image/jpeg', 0.85);
                };
                
                img.onerror = reject;
                img.src = e.target.result;
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },
    
    getOptimizedUrl(url, width = null, height = null, quality = 'auto') {
        if (!url || !url.includes('cloudinary.com')) return url;
        
        const transformations = [];
        if (width) transformations.push(`w_${width}`);
        if (height) transformations.push(`h_${height}`);
        transformations.push(`q_${quality}`);
        transformations.push('f_auto');
        
        const transformation = transformations.join(',');
        return url.replace('/upload/', `/upload/${transformation}/`);
    },
    
    getThumbnailUrl(url, size = 400) {
        return this.getOptimizedUrl(url, size, size, 'auto');
    },
    
    async deleteImage(url) {
        if (!url || !url.includes('cloudinary.com')) {
            return { success: true };
        }
        
        console.log('Image Cloudinary supprimée (côté client) :', url);
        return { success: true };
    },
    
    extractPublicIdFromUrl(url) {
        if (!url || !url.includes('cloudinary.com')) return null;
        
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return null;
        
        const afterUpload = parts.slice(uploadIndex + 1);
        const versionIndex = afterUpload.findIndex(p => p.startsWith('v'));
        const pathParts = versionIndex > 0 ? afterUpload.slice(versionIndex + 1) : afterUpload;
        
        const publicId = pathParts.join('/').replace(/\.[^/.]+$/, '');
        return publicId;
    }
};

