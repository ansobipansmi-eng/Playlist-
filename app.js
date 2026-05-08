// js/app.js
class App {
  constructor() {
    this.init();
  }
  
  init() {
    console.log('🎵 Mélodia initialisée');
    
    // Gérer le mode sombre/clair
    this.handleColorScheme();
    
    // Gérer le défilement pour éviter le zoom
    this.preventDoubleTapZoom();
    
    // Raccourcis clavier supplémentaires
    this.setupGlobalShortcuts();
  }
  
  handleColorScheme() {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = (e) => {
      document.documentElement.style.setProperty('--bg-dark', e.matches ? '#0a0a1a' : '#f5f5f5');
    };
    
    darkModeQuery.addListener(updateTheme);
    updateTheme(darkModeQuery);
  }
  
  preventDoubleTapZoom() {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }
  
  setupGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+O pour importer
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        document.getElementById('fileInput').click();
      }
      
      // Escape pour fermer la vidéo
      if (e.key === 'Escape') {
        window.mediaPlayer?.closeVideo();
      }
    });
  }
}

// Initialiser l'application
window.app = new App();

// Notification d'installation PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
  
  // Afficher un bouton d'installation personnalisé si souhaité
  console.log('💡 L\'application peut être installée!');
});