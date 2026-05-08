// js/playlist.js - VERSION MISE À JOUR
class PlaylistManager {
    constructor() {
        this.tracks = [];
        this.currentFilter = 'all';
        this.isLoading = true;
        this.initializeElements();
        this.loadFromStorage(); // Charger depuis IndexedDB
    }
    
    initializeElements() {
        this.elements = {
            playlist: document.getElementById('playlist'),
            trackCount: document.getElementById('trackCount'),
            emptyState: document.getElementById('emptyState'),
            clearAllBtn: document.getElementById('clearAll'),
            tabBtns: document.querySelectorAll('.tab-btn')
        };
        
        if (this.elements.tabBtns) {
            this.elements.tabBtns.forEach(btn => {
                btn.addEventListener('click', () => this.setFilter(btn.dataset.tab));
            });
        }
        
        if (this.elements.clearAllBtn) {
            this.elements.clearAllBtn.addEventListener('click', () => this.clearAll());
        }
    }
    
    async addTrack(file) {
        const track = {
            id: Date.now() + Math.random(),
            file: file,
            name: file.name.replace(/\.[^/.]+$/, ""),
            type: file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|webm)$/i) ? 'video' : 'audio',
            size: file.size,
            duration: null,
            addedAt: new Date()
        };
        
        console.log('➕ Ajout du track:', track.name, track.type);
        this.tracks.push(track);
        
        // Sauvegarder dans IndexedDB
        if (window.storageManager) {
            try {
                await window.storageManager.saveTrack(track);
                console.log('💾 Track sauvegardé dans IndexedDB');
            } catch (error) {
                console.error('❌ Erreur sauvegarde:', error);
            }
        }
        
        this.savePlaylistOrder();
        this.render();
        this.animateNewItem(track.id);
        
        return track;
    }
    
    async removeTrack(id) {
        const index = this.tracks.findIndex(t => t.id === id);
        if (index !== -1) {
            const track = this.tracks[index];
            
            // Si c'est la piste en cours, arrêter la lecture
            if (window.mediaPlayer && window.mediaPlayer.currentTrack?.id === id) {
                window.mediaPlayer.pause();
                window.mediaPlayer.currentTrack = null;
            }
            
            this.tracks.splice(index, 1);
            
            // Supprimer de IndexedDB
            if (window.storageManager) {
                try {
                    await window.storageManager.deleteTrack(id);
                } catch (error) {
                    console.error('❌ Erreur suppression:', error);
                }
            }
            
            this.savePlaylistOrder();
            this.render();
            console.log('🗑️ Track supprimé:', track.name);
        }
    }
    
    getFilteredTracks() {
        if (this.currentFilter === 'all') return this.tracks;
        return this.tracks.filter(track => track.type === this.currentFilter);
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        
        if (this.elements.tabBtns) {
            this.elements.tabBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === filter);
            });
        }
        
        this.render();
    }
    
    async clearAll() {
        if (confirm('Voulez-vous vraiment supprimer tous les médias ? Cette action est irréversible.')) {
            if (window.mediaPlayer) {
                window.mediaPlayer.pause();
                window.mediaPlayer.currentTrack = null;
            }
            
            this.tracks = [];
            
            // Vider IndexedDB
            if (window.storageManager) {
                try {
                    await window.storageManager.clearAllTracks();
                    console.log('🗑️ Tous les tracks supprimés de IndexedDB');
                } catch (error) {
                    console.error('❌ Erreur nettoyage:', error);
                }
            }
            
            this.savePlaylistOrder();
            this.render();
        }
    }
    
    getPreviousTrack(currentTrack, shuffled) {
        if (this.tracks.length === 0) return null;
        let filteredTracks = this.getFilteredTracks();
        if (filteredTracks.length === 0) return null;
        
        if (shuffled) {
            const randomIndex = Math.floor(Math.random() * filteredTracks.length);
            return filteredTracks[randomIndex];
        }
        
        const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack?.id);
        const prevIndex = currentIndex <= 0 ? filteredTracks.length - 1 : currentIndex - 1;
        return filteredTracks[prevIndex];
    }
    
    getNextTrack(currentTrack, shuffled, repeatMode) {
        if (this.tracks.length === 0) return null;
        let filteredTracks = this.getFilteredTracks();
        if (filteredTracks.length === 0) return null;
        
        if (shuffled) {
            const randomIndex = Math.floor(Math.random() * filteredTracks.length);
            return filteredTracks[randomIndex];
        }
        
        const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack?.id);
        
        if (currentIndex === filteredTracks.length - 1) {
            if (repeatMode === 0) return null;
            if (repeatMode === 1) return filteredTracks[0];
            if (repeatMode === 2) return filteredTracks[currentIndex];
        }
        
        return filteredTracks[currentIndex + 1];
    }
    
    getFirstTrack() {
        const filteredTracks = this.getFilteredTracks();
        return filteredTracks.length > 0 ? filteredTracks[0] : null;
    }
    
    render() {
        const filteredTracks = this.getFilteredTracks();
        
        if (!this.elements.playlist) return;
        
        // Mise à jour du compteur
        if (this.elements.trackCount) {
            this.elements.trackCount.textContent = `${this.tracks.length} titre(s)`;
        }
        
        // Afficher/masquer l'état vide
        if (this.isLoading) {
            this.elements.playlist.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⏳</div>
                    <p>Chargement de votre playlist...</p>
                </div>
            `;
            return;
        }
        
        if (filteredTracks.length === 0) {
            this.elements.playlist.innerHTML = '';
            if (this.elements.emptyState) {
                this.elements.emptyState.style.display = 'block';
            }
        } else {
            if (this.elements.emptyState) {
                this.elements.emptyState.style.display = 'none';
            }
            this.elements.playlist.innerHTML = filteredTracks.map((track, index) => this.createTrackElement(track, index)).join('');
            this.attachTrackEvents();
        }
    }
    
    createTrackElement(track, index) {
        const iconMap = {
            audio: '🎵',
            video: '🎬'
        };
        
        const typeLabel = track.type === 'audio' ? 'Audio' : 'Vidéo';
        const badgeClass = track.type;
        
        return `
            <div class="playlist-item" 
                 data-id="${track.id}" 
                 data-index="${index}">
                <div class="item-icon">${iconMap[track.type] || '🎵'}</div>
                <div class="item-info">
                    <div class="item-name">${this.escapeHtml(track.name)}</div>
                    <div class="item-meta">
                        <span class="item-type-badge ${badgeClass}">${typeLabel}</span>
                        <span>·</span>
                        <span>${this.formatSize(track.size)}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="item-btn play-item" title="Lire">▶️</button>
                    <button class="item-btn delete" title="Supprimer">🗑️</button>
                </div>
            </div>
        `;
    }
    
    attachTrackEvents() {
        if (!this.elements.playlist) return;
        
        const items = this.elements.playlist.querySelectorAll('.playlist-item');
        
        items.forEach(item => {
            const id = parseFloat(item.dataset.id);
            const track = this.tracks.find(t => t.id === id);
            
            if (!track) return;
            
            item.addEventListener('click', (e) => {
                if (e.target.closest('.item-actions') || e.target.closest('button')) return;
                if (window.mediaPlayer) {
                    window.mediaPlayer.createInlinePlayer(track, item);
                }
            });
            
            const playBtn = item.querySelector('.play-item');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.mediaPlayer) {
                        window.mediaPlayer.createInlinePlayer(track, item);
                    }
                });
            }
            
            const deleteBtn = item.querySelector('.delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeTrack(id);
                });
            }
        });
    }
    
    animateNewItem(id) {
        setTimeout(() => {
            if (!this.elements.playlist) return;
            const item = this.elements.playlist.querySelector(`[data-id="${id}"]`);
            if (item) {
                item.style.animation = 'none';
                item.offsetHeight;
                item.style.animation = 'slideIn 0.3s ease';
            }
        }, 100);
    }
    
    async savePlaylistOrder() {
        const trackIds = this.tracks.map(t => t.id);
        if (window.storageManager) {
            await window.storageManager.savePlaylistOrder(trackIds);
        }
        localStorage.setItem('melodia-playlist-order', JSON.stringify(trackIds));
    }
    
    async loadFromStorage() {
        console.log('📂 Chargement de la playlist depuis IndexedDB...');
        
        if (window.storageManager) {
            try {
                // Charger les tracks depuis IndexedDB
                const tracks = await window.storageManager.loadAllTracks();
                
                // Charger l'ordre sauvegardé
                const order = await window.storageManager.loadPlaylistOrder();
                
                if (tracks.length > 0) {
                    console.log(`✅ ${tracks.length} tracks chargés`);
                    
                    // Réorganiser selon l'ordre sauvegardé
                    if (order.length > 0) {
                        const orderedTracks = [];
                        order.forEach(id => {
                            const track = tracks.find(t => t.id === id);
                            if (track) orderedTracks.push(track);
                        });
                        // Ajouter les tracks qui ne sont pas dans l'ordre
                        tracks.forEach(track => {
                            if (!order.includes(track.id)) {
                                orderedTracks.push(track);
                            }
                        });
                        this.tracks = orderedTracks;
                    } else {
                        this.tracks = tracks;
                    }
                    
                    console.log('🎵 Playlist restaurée avec succès !');
                } else {
                    console.log('📭 Aucun track sauvegardé');
                }
                
                // Afficher l'espace utilisé
                await window.storageManager.getStorageInfo();
                
            } catch (error) {
                console.error('❌ Erreur chargement:', error);
            }
        }
        
        this.isLoading = false;
        this.render();
    }
    
    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialiser quand le DOM est prêt ET que StorageManager est prêt
async function initPlaylistManager() {
    console.log('🚀 Initialisation PlaylistManager...');
    
    // Attendre que StorageManager soit initialisé
    if (window.storageManager && window.storageManager.db === null) {
        await new Promise(resolve => {
            const check = setInterval(() => {
                if (window.storageManager.db !== null) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
    }
    
    window.playlistManager = new PlaylistManager();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlaylistManager);
} else {
    initPlaylistManager();
                        }
