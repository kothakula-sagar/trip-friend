'use strict';
const currentVersion = '1.5.1';
document.querySelectorAll('[data-version]').forEach(node => { node.textContent = currentVersion; });
const installButton = document.getElementById('install-app');
let installPrompt;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});
if (installButton) {
  installButton.addEventListener('click', async () => {
    const status = document.getElementById('install-status');
    if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
      status.textContent = 'Trip Friend is already open as an installed app.';
      return;
    }
    if (!installPrompt) {
      status.textContent = 'Use the installation steps above for your device.';
      return;
    }
    const prompt = installPrompt;
    installPrompt = undefined;
    const result = await prompt.prompt();
    status.textContent = result.outcome === 'accepted' ? 'Trip Friend was added to your device.' : 'You can install Trip Friend anytime from this page.';
  });
}
if (!window.Capacitor?.isNativePlatform?.() && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(registration => {
    const banner = document.createElement('aside');
    banner.className = 'release-banner wrap';
    banner.hidden = true;
    banner.setAttribute('aria-live','polite');
    const label = document.createElement('span');
    const action = document.createElement('button');
    action.textContent = 'Update now';
    banner.append(label, action);
    document.querySelector('header').after(banner);
    let applying = false;
    let checking = false;
    let latest;
    function showUpdate() {
      if (!latest && !registration.waiting) return;
      label.textContent = latest ? 'Trip Friend ' + latest + ' is available. ' : 'A Trip Friend update is ready. ';
      banner.hidden = false;
    }
    async function check() {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch('./release.json', {cache:'no-store'});
        if (response.ok) {
          const {version} = await response.json();
          latest = typeof version === 'string' && version !== currentVersion ? version : undefined;
        }
        await registration.update();
      } catch {}
      finally { checking = false; showUpdate(); }
    }
    action.addEventListener('click', () => {
      if (registration.waiting) {
        applying = true;
        registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
      } else {
        window.location.reload();
      }
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (applying) window.location.reload();
    });
    registration.addEventListener('updatefound', () => {
      registration.installing?.addEventListener('statechange', showUpdate);
    });
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(check, 15 * 60 * 1000);
    check();
  }).catch(() => {});
}
