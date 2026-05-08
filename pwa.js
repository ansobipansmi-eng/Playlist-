// js/pwa.js
class PWAManager {
  constructor() {
    this.registerServiceWorker();
    this.handleInstallPrompt();
  }
  
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('✅ Service Worker enregistré:', registration.scope);
        
        // Mise à jour automatique
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 Nouvelle version disponible...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🆕 Mise à jour prête!');
              if (confirm('Une nouvelle version est disponible. Actualiser?')) {
                window.location.reload();
              }
            }
          });
        });
      } catch (error) {
        console.error('❌ Erreur Service Worker:', error);
      }
    }
  }
  
  handleInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      
      // Notification subtile
      setTimeout(() => {
        const notification = document.createElement('div');
        notification.innerHTML = `
                    <div style="
                        position: fixed;
                        bottom: 160px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: var(--primary);
                        color: var(--bg-dark);
                        padding: 12px 24px;
                        border-radius: 24px;
                        font-weight: 600;
                        z-index: 300;
                        cursor: pointer;
                        animation: notificationIn 0.3s ease;
                    ">
                        📲 Installer l'application
                    </div>
                `;
        
        notification.addEventListener('click', async () => {
          if (window.deferredPrompt) {
            window.deferredPrompt.prompt();
            const { outcome } = await window.deferredPrompt.userChoice;
            console.log(`Installation: ${outcome}`);
            window.deferredPrompt = null;
            notification.remove();
          }
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 8000);
      }, 3000);
    });
    
    // Détecter si l'app est déjà installée
    window.addEventListener('appinstalled', () => {
      console.log('✅ Application installée avec succès!');
      window.deferredPrompt = null;
    });
    
    // Détecter le mode standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('📱 Mode application installée');
      document.body.classList.add('standalone-mode');
    }
  }
}

// Initialiser le PWA Manager
window.pwaManager = new PWAManager();