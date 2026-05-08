// js/storage.js
class StorageManager {
    constructor() {
        this.dbName = 'MelodiaDB';
        this.dbVersion = 1;
        this.db = null;
        this.init();
    }
    
    async init() {
        try {
            this.db = await this.openDB();
            console.log('🗄️ IndexedDB initialisé avec succès');
        } catch (error) {
            console.error('❌ Erreur IndexedDB:', error);
        }
    }
    
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                reject(new Error('Impossible d\'ouvrir IndexedDB'));
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Créer le store pour les fichiers
                if (!db.objectStoreNames.contains('tracks')) {
                    const store = db.createObjectStore('tracks', { keyPath: 'id' });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('addedAt', 'addedAt', { unique: false });
                    console.log('📦 Object store "tracks" créé');
                }
                
                // Store pour les métadonnées
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                    console.log('📦 Object store "metadata" créé');
                }
            };
        });
    }
    
    // Sauvegarder un fichier
    async saveTrack(track) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tracks'], 'readwrite');
            const store = transaction.objectStore('tracks');
            
            // Convertir le File en ArrayBuffer pour le stockage
            const reader = new FileReader();
            reader.onload = async () => {
                const trackData = {
                    id: track.id,
                    name: track.name,
                    type: track.type,
                    size: track.size,
                    mimeType: track.file.type || (track.type === 'video' ? 'video/mp4' : 'audio/mpeg'),
                    fileData: reader.result, // ArrayBuffer
                    duration: track.duration || null,
                    addedAt: track.addedAt || new Date().toISOString()
                };
                
                const request = store.put(trackData);
                
                request.onsuccess = () => {
                    console.log('💾 Track sauvegardé:', track.name);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ Erreur sauvegarde track:', track.name);
                    reject(new Error('Erreur lors de la sauvegarde'));
                };
            };
            
            reader.onerror = () => {
                reject(new Error('Erreur de lecture du fichier'));
            };
            
            reader.readAsArrayBuffer(track.file);
        });
    }
    
    // Charger tous les tracks
    async loadAllTracks() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tracks'], 'readonly');
            const store = transaction.objectStore('tracks');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const tracks = request.result;
                console.log(`📂 ${tracks.length} tracks chargés depuis IndexedDB`);
                
                // Convertir ArrayBuffer en Blob/File
                const processedTracks = tracks.map(trackData => {
                    const blob = new Blob([trackData.fileData], { type: trackData.mimeType });
                    const file = new File([blob], trackData.name + this.getExtension(trackData.mimeType), {
                        type: trackData.mimeType
                    });
                    
                    return {
                        id: trackData.id,
                        name: trackData.name,
                        type: trackData.type,
                        size: trackData.size,
                        file: file,
                        duration: trackData.duration,
                        addedAt: new Date(trackData.addedAt)
                    };
                });
                
                resolve(processedTracks);
            };
            
            request.onerror = () => {
                console.error('❌ Erreur chargement tracks');
                reject(new Error('Erreur lors du chargement'));
            };
        });
    }
    
    // Supprimer un track
    async deleteTrack(id) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tracks'], 'readwrite');
            const store = transaction.objectStore('tracks');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('🗑️ Track supprimé:', id);
                resolve(true);
            };
            
            request.onerror = () => {
                console.error('❌ Erreur suppression track:', id);
                reject(new Error('Erreur lors de la suppression'));
            };
        });
    }
    
    // Supprimer tous les tracks
    async clearAllTracks() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['tracks'], 'readwrite');
            const store = transaction.objectStore('tracks');
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('🗑️ Tous les tracks supprimés');
                resolve(true);
            };
            
            request.onerror = () => {
                reject(new Error('Erreur lors du nettoyage'));
            };
        });
    }
    
    // Sauvegarder l'ordre de la playlist
    async savePlaylistOrder(trackIds) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            
            const request = store.put({
                key: 'playlistOrder',
                value: trackIds
            });
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(new Error('Erreur sauvegarde ordre'));
        });
    }
    
    // Charger l'ordre de la playlist
    async loadPlaylistOrder() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.get('playlistOrder');
            
            request.onsuccess = () => {
                resolve(request.result?.value || []);
            };
            
            request.onerror = () => {
                resolve([]);
            };
        });
    }
    
    // Vérifier l'espace de stockage
    async getStorageInfo() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            const usedMB = (estimate.usage / 1024 / 1024).toFixed(2);
            const totalMB = (estimate.quota / 1024 / 1024).toFixed(2);
            console.log(`💾 Stockage: ${usedMB} MB / ${totalMB} MB`);
            return { used: estimate.usage, quota: estimate.quota };
        }
        return null;
    }
    
    getExtension(mimeType) {
        const extensions = {
            'audio/mpeg': '.mp3',
            'audio/mp3': '.mp3',
            'audio/wav': '.wav',
            'audio/ogg': '.ogg',
            'audio/webm': '.webm',
            'audio/aac': '.aac',
            'audio/flac': '.flac',
            'video/mp4': '.mp4',
            'video/webm': '.webm',
            'video/ogg': '.ogv',
            'video/quicktime': '.mov'
        };
        return extensions[mimeType] || '';
    }
}

// Initialiser le gestionnaire de stockage
window.storageManager = new StorageManager();
