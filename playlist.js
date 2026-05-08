// js/playlist.js
class PlaylistManager {
    constructor() {
        this.tracks = [];
        this.currentFilter = 'all';
        this.loadFromStorage();
        this.initializeElements();
        this.render();
        console.log('📋 PlaylistManager initialisé');
    }
    
    initializeElements() {
        this.elements = {
            playlist: document.getElementById('playlist'),
            trackCount: document.getElementById('trackCount'),
            emptyState: document.getElementById('emptyState'),
            clearAllBtn: document.getElementById('clearAll'),
            tabBtns: document.querySelectorAll('.tab-btn')
        };
        
        // Événements des onglets
        if (this.elements.tabBtns) {
            this.elements.tabBtns.forEach(btn => {
                btn.addEventListener('click', () => this.setFilter(btn.dataset.tab));
            });
        }
        
        // Bouton tout effacer
        if (this.elements.clearAllBtn) {
            this.elements.clearAllBtn.addEventListener('click', () => this.clearAll());
        }
    }
    
    addTrack(file) {
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
        this.saveToStorage();
        this.render();
        this.animateNewItem(track.id);
        
        return track;
    }
    
    removeTrack(id) {
        const index = this.tracks.findIndex(t => t.id === id);
        if (index !== -1) {
            const track = this.tracks[index];
            
            // Si c'est la piste en cours, arrêter la lecture
            if (window.mediaPlayer && window.mediaPlayer.currentTrack?.id === id) {
                window.mediaPlayer.pause();
                window.mediaPlayer.currentTrack = null;
            }
            
            this.tracks.splice(index, 1);
            this.saveToStorage();
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
    
    clearAll() {
        if (confirm('Voulez-vous vraiment supprimer tous les médias ?')) {
            if (window.mediaPlayer) {
                window.mediaPlayer.pause();
                window.mediaPlayer.currentTrack = null;
            }
            this.tracks = [];
            this.saveToStorage();
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
        
        if (!this.elements.playlist) {
            console.error('❌ Élément playlist introuvable');
            return;
        }
        
        // Mise à jour du compteur
        if (this.elements.trackCount) {
            this.elements.trackCount.textContent = `${this.tracks.length} titre(s)`;
        }
        
        // Afficher/masquer l'état vide
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
            
            // Attacher les événements
            this.attachTrackEvents();
        }
    }
    
    createTrackElement(track, index) {
        const iconMap = {
            audio: '🎵',
            video: '🎬'
        };
        
        const typeLabel = track.type === 'audio' ? 'Audio' : 'Vidéo';
        const badgeClass = track.type === 'audio' ? 'audio' : 'video';
        
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
            
            // Clic sur l'item = ouvrir le mini-lecteur
            item.addEventListener('click', (e) => {
                // Ne pas déclencher si on clique sur les boutons d'action
                if (e.target.closest('.item-actions') || e.target.closest('button')) return;
                
                if (window.mediaPlayer) {
                    window.mediaPlayer.createInlinePlayer(track, item);
                }
            });
            
            // Bouton play
            const playBtn = item.querySelector('.play-item');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.mediaPlayer) {
                        window.mediaPlayer.createInlinePlayer(track, item);
                    }
                });
            }
            
            // Bouton delete
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
                item.offsetHeight; // Force reflow
                item.style.animation = 'slideIn 0.3s ease';
            }
        }, 100);
    }
    
    saveToStorage() {
        try {
            const metadata = this.tracks.map(track => ({
                id: track.id,
                name: track.name,
                type: track.type,
                size: track.size,
                addedAt: track.addedAt
            }));
            localStorage.setItem('melodia-playlist', JSON.stringify(metadata));
        } catch (e) {
            console.warn('Impossible de sauvegarder la playlist:', e);
        }
    }
    
    loadFromStorage() {
        try {
            const data = localStorage.getItem('melodia-playlist');
            if (data) {
                const metadata = JSON.parse(data);
                console.log('💾 Playlist chargée:', metadata.length, 'titres (métadonnées uniquement)');
                // Les fichiers réels ne sont pas restaurés depuis localStorage
            }
        } catch (e) {
            console.warn('Impossible de charger la playlist:', e);
        }
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

// Initialiser quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Initialisation PlaylistManager...');
        window.playlistManager = new PlaylistManager();
    });
} else {
    console.log('🚀 Initialisation PlaylistManager (DOM déjà prêt)...');
    window.playlistManager = new PlaylistManager();
}