// js/dragdrop.js
class DragDropHandler {
    constructor() {
        this.initializeElements();
        this.attachEvents();
    }
    
    initializeElements() {
        this.elements = {
            fabAdd: document.getElementById('fabAdd'),
            fileInput: document.getElementById('fileInput'),
            dropOverlay: document.getElementById('dropOverlay')
        };
        
        // Vérifier que les éléments existent
        if (!this.elements.fabAdd) {
            console.error('❌ Bouton FAB+ introuvable');
        }
        if (!this.elements.fileInput) {
            console.error('❌ Input fichier introuvable');
        }
    }
    
    attachEvents() {
        // Bouton FAB + - OUVRE LE SÉLECTEUR DE FICHIERS
        this.elements.fabAdd.addEventListener('click', (e) => {
            console.log('🟢 Clic sur le bouton +');
            e.preventDefault();
            e.stopPropagation();
            
            // Vérifier que l'input existe
            if (this.elements.fileInput) {
                console.log('📂 Ouverture du sélecteur de fichiers...');
                this.elements.fileInput.click();
            } else {
                console.error('❌ fileInput est null');
            }
        });
        
        // Sélection de fichiers via l'input
        this.elements.fileInput.addEventListener('change', (e) => {
            console.log('📁 Fichiers sélectionnés:', e.target.files.length);
            if (e.target.files.length > 0) {
                this.handleFiles(e.target.files);
                // Réinitialiser pour permettre de resélectionner le même fichier
                this.elements.fileInput.value = '';
            }
        });
        
        // Drag & Drop global
        let dragCounter = 0;
        
        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            if (dragCounter === 1 && this.elements.dropOverlay) {
                this.elements.dropOverlay.classList.add('active');
            }
        });
        
        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0 && this.elements.dropOverlay) {
                this.elements.dropOverlay.classList.remove('active');
            }
        });
        
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            if (this.elements.dropOverlay) {
                this.elements.dropOverlay.classList.remove('active');
            }
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                console.log('🔄 Fichiers déposés:', files.length);
                this.handleFiles(files);
            }
        });
        
        // Éviter que le drop sur la page ne télécharge le fichier
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    }
    
    handleFiles(files) {
        if (!files || files.length === 0) {
            console.warn('⚠️ Aucun fichier à traiter');
            return;
        }
        
        console.log(`🔍 Traitement de ${files.length} fichier(s)...`);
        
        const supportedExtensions = /\.(mp3|wav|ogg|webm|mp4|m4a|mov|aac|flac)$/i;
        let addedCount = 0;
        let skippedCount = 0;
        
        Array.from(files).forEach(file => {
            const isAudio = file.type.startsWith('audio/');
            const isVideo = file.type.startsWith('video/');
            const hasValidExtension = supportedExtensions.test(file.name);
            
            console.log(`📄 ${file.name} - type: ${file.type} - extension valide: ${hasValidExtension}`);
            
            if (isAudio || isVideo || hasValidExtension) {
                // Déterminer le type
                const type = isVideo || file.name.match(/\.(mp4|mov|webm)$/i) ? 'video' : 'audio';
                
                if (window.playlistManager) {
                    window.playlistManager.addTrack(file);
                    addedCount++;
                    console.log(`✅ Ajouté: ${file.name}`);
                } else {
                    console.error('❌ playlistManager non disponible');
                }
            } else {
                skippedCount++;
                console.warn(`⏭️ Ignoré: ${file.name} (format non supporté)`);
            }
        });
        
        // Notification
        if (addedCount > 0) {
            this.showToast(`✅ ${addedCount} fichier(s) ajouté(s)`);
        }
        if (skippedCount > 0) {
            setTimeout(() => {
                this.showToast(`⚠️ ${skippedCount} fichier(s) ignoré(s) - format non supporté`);
            }, 2000);
        }
        if (addedCount === 0 && skippedCount > 0) {
            this.showToast('❌ Aucun fichier compatible trouvé');
        }
    }
    
    showToast(message) {
        // Supprimer les toasts existants
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-card, #FFFFFF);
            color: var(--text, #2D3436);
            padding: 12px 24px;
            border-radius: 24px;
            font-size: 14px;
            font-weight: 500;
            z-index: 9999;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            border: 1px solid var(--border, #E8EAF0);
            animation: toastIn 0.3s ease, toastOut 0.3s ease 2s forwards;
            pointer-events: none;
            white-space: nowrap;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 2500);
    }
}

// Initialiser quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Initialisation DragDropHandler...');
        window.dragDropHandler = new DragDropHandler();
    });
} else {
    console.log('🚀 Initialisation DragDropHandler (DOM déjà prêt)...');
    window.dragDropHandler = new DragDropHandler();
}

// Ajouter les animations pour les toasts
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes toastIn {
        from { 
            opacity: 0; 
            transform: translateX(-50%) translateY(-20px); 
        }
        to { 
            opacity: 1; 
            transform: translateX(-50%) translateY(0); 
        }
    }
    @keyframes toastOut {
        from { 
            opacity: 1; 
            transform: translateX(-50%) translateY(0); 
        }
        to { 
            opacity: 0; 
            transform: translateX(-50%) translateY(-20px); 
        }
    }
`;
document.head.appendChild(toastStyles);