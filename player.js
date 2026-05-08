// js/player.js
class MediaPlayer {
    constructor() {
        this.audioElement = new Audio();
        this.videoElement = document.getElementById('videoPlayer');
        this.currentTrack = null;
        this.isPlaying = false;
        this.isShuffled = false;
        this.repeatMode = 0;
        this.volume = 0.8;
        this.currentUrl = null;
        this.videoUrl = null;
        this.inlinePlayerElement = null;
        
        this.initializeElements();
        this.attachEvents();
        this.audioElement.volume = this.volume;
        console.log('🎵 MediaPlayer initialisé');
    }
    
    initializeElements() {
        this.elements = {
            playBtn: document.getElementById('playBtn'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            shuffleBtn: document.getElementById('shuffleBtn'),
            repeatBtn: document.getElementById('repeatBtn'),
            progressBar: document.getElementById('progressBar'),
            progressFill: document.getElementById('progressFill'),
            currentTime: document.getElementById('currentTime'),
            totalTime: document.getElementById('totalTime'),
            playerTitle: document.getElementById('playerTitle'),
            playerArtist: document.getElementById('playerArtist'),
            playerArtwork: document.getElementById('playerArtwork'),
            videoModal: document.getElementById('videoModal'),
            videoPlayer: document.getElementById('videoPlayer'),
            closeVideo: document.getElementById('closeVideo')
        };
        
        // Cacher le lecteur principal au début
        const playerBar = document.getElementById('playerBar');
        if (playerBar) {
            playerBar.style.display = 'none';
        }
    }
    
    attachEvents() {
        if (this.elements.playBtn) {
            this.elements.playBtn.addEventListener('click', () => this.togglePlay());
        }
        if (this.elements.prevBtn) {
            this.elements.prevBtn.addEventListener('click', () => this.previous());
        }
        if (this.elements.nextBtn) {
            this.elements.nextBtn.addEventListener('click', () => this.next());
        }
        if (this.elements.shuffleBtn) {
            this.elements.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        }
        if (this.elements.repeatBtn) {
            this.elements.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        }
        if (this.elements.progressBar) {
            this.elements.progressBar.addEventListener('click', (e) => this.seek(e));
        }
        if (this.elements.closeVideo) {
            this.elements.closeVideo.addEventListener('click', () => this.closeVideo());
        }
        
        this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
        this.audioElement.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audioElement.addEventListener('ended', () => this.handleTrackEnd());
        this.audioElement.addEventListener('error', () => this.handleError());
        
        // Contrôles clavier
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'ArrowLeft':
                    if (e.ctrlKey) this.previous();
                    else this.audioElement.currentTime -= 5;
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey) this.next();
                    else this.audioElement.currentTime += 5;
                    break;
            }
        });
    }
    
    // NOUVEAU : Mini-lecteur inline
    createInlinePlayer(track, itemElement) {
        console.log('🎯 Création du mini-lecteur pour:', track.name);
        
        // Supprimer les anciens lecteurs inline
        document.querySelectorAll('.inline-player').forEach(el => el.remove());
        document.querySelectorAll('.playlist-item.active').forEach(el => el.classList.remove('active'));
        
        // Marquer l'item comme actif
        if (itemElement) {
            itemElement.classList.add('active');
        }
        
        // Si c'est une vidéo, ouvrir la modal
        if (track.type === 'video') {
            this.openVideo(track);
            return;
        }
        
        // Créer le mini-lecteur inline
        const inlinePlayer = document.createElement('div');
        inlinePlayer.className = 'inline-player active';
        inlinePlayer.innerHTML = `
            <div class="inline-controls">
                <button class="inline-btn prev-inline" title="Précédent">⏮️</button>
                <button class="inline-btn play-inline" title="Lecture">▶️</button>
                <button class="inline-btn next-inline" title="Suivant">⏭️</button>
                <div class="inline-progress">
                    <span class="inline-time time-curr-inline">0:00</span>
                    <div class="inline-progress-bar inline-progress-click">
                        <div class="inline-progress-fill"></div>
                    </div>
                    <span class="inline-time time-total-inline">0:00</span>
                </div>
                <button class="inline-close" title="Fermer">✕</button>
            </div>
        `;
        
        // Insérer après l'item
        if (itemElement) {
            itemElement.after(inlinePlayer);
            this.inlinePlayerElement = inlinePlayer;
        }
        
        // Charger le track
        this.loadTrack(track);
        
        // Attacher les événements du mini-lecteur
        const playBtn = inlinePlayer.querySelector('.play-inline');
        const prevBtn = inlinePlayer.querySelector('.prev-inline');
        const nextBtn = inlinePlayer.querySelector('.next-inline');
        const closeBtn = inlinePlayer.querySelector('.inline-close');
        const progressBar = inlinePlayer.querySelector('.inline-progress-click');
        const progressFill = inlinePlayer.querySelector('.inline-progress-fill');
        const currTimeEl = inlinePlayer.querySelector('.time-curr-inline');
        const totalTimeEl = inlinePlayer.querySelector('.time-total-inline');
        
        // Surcharger updateProgress pour mettre à jour aussi le mini-lecteur
        const originalUpdateProgress = this.updateProgress.bind(this);
        this.updateProgress = () => {
            originalUpdateProgress();
            
            if (progressFill && currTimeEl && totalTimeEl) {
                const { currentTime, duration } = this.audioElement;
                if (duration) {
                    const percentage = (currentTime / duration) * 100;
                    progressFill.style.width = `${percentage}%`;
                    currTimeEl.textContent = this.formatTime(currentTime);
                    totalTimeEl.textContent = this.formatTime(duration);
                }
            }
        };
        
        playBtn.addEventListener('click', () => {
            if (this.isPlaying) {
                this.pause();
                playBtn.textContent = '▶️';
            } else {
                this.play();
                playBtn.textContent = '⏸️';
            }
        });
        
        prevBtn.addEventListener('click', () => this.previous());
        nextBtn.addEventListener('click', () => this.next());
        
        closeBtn.addEventListener('click', () => {
            this.pause();
            inlinePlayer.remove();
            this.inlinePlayerElement = null;
            if (itemElement) itemElement.classList.remove('active');
            this.currentTrack = null;
            
            // Cacher le lecteur principal
            const playerBar = document.getElementById('playerBar');
            if (playerBar) playerBar.style.display = 'none';
        });
        
        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                const rect = progressBar.getBoundingClientRect();
                const percentage = (e.clientX - rect.left) / rect.width;
                this.audioElement.currentTime = percentage * this.audioElement.duration;
            });
        }
        
        // Scroll vers le mini-lecteur
        setTimeout(() => {
            inlinePlayer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        
        // Afficher aussi le lecteur principal
        const playerBar = document.getElementById('playerBar');
        if (playerBar) {
            playerBar.style.display = 'block';
        }
    }
    
    loadTrack(track) {
        if (!track) return;
        
        console.log('🔄 Chargement du track:', track.name);
        this.currentTrack = track;
        
        // Nettoyer l'ancienne URL
        if (this.currentUrl) {
            URL.revokeObjectURL(this.currentUrl);
        }
        
        const url = URL.createObjectURL(track.file);
        this.audioElement.src = url;
        this.currentUrl = url;
        this.audioElement.load();
        
        this.updatePlayerInfo(track);
        this.play();
        
        // Afficher le lecteur principal
        const playerBar = document.getElementById('playerBar');
        if (playerBar) {
            playerBar.style.display = 'block';
        }
    }
    
    togglePlay() {
        if (!this.currentTrack) return;
        
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    play() {
        if (!this.currentTrack || this.currentTrack.type === 'video') return;
        
        this.audioElement.play()
            .then(() => {
                this.isPlaying = true;
                if (this.elements.playBtn) {
                    this.elements.playBtn.textContent = '⏸️';
                }
            })
            .catch(error => {
                console.error('Erreur de lecture:', error);
            });
    }
    
    pause() {
        this.audioElement.pause();
        this.isPlaying = false;
        if (this.elements.playBtn) {
            this.elements.playBtn.textContent = '▶️';
        }
    }
    
    previous() {
        if (window.playlistManager) {
            const prevTrack = window.playlistManager.getPreviousTrack(this.currentTrack, this.isShuffled);
            if (prevTrack) {
                // Trouver l'élément correspondant
                const item = document.querySelector(`.playlist-item[data-id="${prevTrack.id}"]`);
                this.createInlinePlayer(prevTrack, item);
            }
        }
    }
    
    next() {
        if (window.playlistManager) {
            const nextTrack = window.playlistManager.getNextTrack(this.currentTrack, this.isShuffled, this.repeatMode);
            if (nextTrack) {
                const item = document.querySelector(`.playlist-item[data-id="${nextTrack.id}"]`);
                this.createInlinePlayer(nextTrack, item);
            } else if (this.repeatMode === 1) {
                const firstTrack = window.playlistManager.getFirstTrack();
                if (firstTrack) {
                    const item = document.querySelector(`.playlist-item[data-id="${firstTrack.id}"]`);
                    this.createInlinePlayer(firstTrack, item);
                }
            }
        }
    }
    
    seek(event) {
        if (!this.elements.progressBar) return;
        const rect = this.elements.progressBar.getBoundingClientRect();
        const percentage = (event.clientX - rect.left) / rect.width;
        this.audioElement.currentTime = percentage * this.audioElement.duration;
    }
    
    updateProgress() {
        const { currentTime, duration } = this.audioElement;
        if (duration && this.elements.progressFill && this.elements.currentTime) {
            const percentage = (currentTime / duration) * 100;
            this.elements.progressFill.style.width = `${percentage}%`;
            this.elements.currentTime.textContent = this.formatTime(currentTime);
        }
    }
    
    updateDuration() {
        if (this.elements.totalTime) {
            this.elements.totalTime.textContent = this.formatTime(this.audioElement.duration);
        }
    }
    
    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        if (this.elements.shuffleBtn) {
            this.elements.shuffleBtn.style.opacity = this.isShuffled ? '1' : '0.5';
        }
    }
    
    toggleRepeat() {
        this.repeatMode = (this.repeatMode + 1) % 3;
        if (this.elements.repeatBtn) {
            switch(this.repeatMode) {
                case 0:
                    this.elements.repeatBtn.textContent = '🔁';
                    this.elements.repeatBtn.style.opacity = '0.5';
                    break;
                case 1:
                    this.elements.repeatBtn.textContent = '🔁';
                    this.elements.repeatBtn.style.opacity = '1';
                    break;
                case 2:
                    this.elements.repeatBtn.textContent = '🔂';
                    this.elements.repeatBtn.style.opacity = '1';
                    break;
            }
        }
    }
    
    handleTrackEnd() {
        if (this.repeatMode === 2) {
            this.audioElement.currentTime = 0;
            this.play();
        } else {
            this.next();
        }
    }
    
    handleError() {
        console.error('Erreur lors de la lecture du fichier audio');
        this.next();
    }
    
    updatePlayerInfo(track) {
        if (this.elements.playerTitle) {
            this.elements.playerTitle.textContent = track.name;
        }
        if (this.elements.playerArtist) {
            this.elements.playerArtist.textContent = track.type === 'audio' ? 'Fichier Audio' : 'Fichier Vidéo';
        }
        if (this.elements.playerArtwork) {
            this.elements.playerArtwork.textContent = track.type === 'audio' ? '🎵' : '🎬';
        }
    }
    
    openVideo(track) {
        if (!this.elements.videoPlayer || !this.elements.videoModal) return;
        
        if (this.videoUrl) {
            URL.revokeObjectURL(this.videoUrl);
        }
        
        const url = URL.createObjectURL(track.file);
        this.videoUrl = url;
        this.elements.videoPlayer.src = url;
        this.elements.videoModal.classList.add('active');
        this.elements.videoPlayer.play();
    }
    
    closeVideo() {
        if (this.elements.videoPlayer) {
            this.elements.videoPlayer.pause();
            this.elements.videoPlayer.src = '';
        }
        if (this.elements.videoModal) {
            this.elements.videoModal.classList.remove('active');
        }
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// Initialiser quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Initialisation MediaPlayer...');
        window.mediaPlayer = new MediaPlayer();
    });
} else {
    console.log('🚀 Initialisation MediaPlayer (DOM déjà prêt)...');
    window.mediaPlayer = new MediaPlayer();
}