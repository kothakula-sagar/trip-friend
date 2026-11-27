'use strict';
window.TripShell = {
  native: Boolean(window.Capacitor?.isNativePlatform?.()),
  bindBack(handler) {
    return window.Capacitor?.Plugins?.App?.addListener('backButton', () => {
      const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
      if (dialog) dialog.close();
      else handler();
    });
  },
  state(element, state, detail = '') {
    element.dataset.tripState = state;
    element.setAttribute('aria-busy',String(state === 'loading'));
    element.textContent = detail;
  },
  route(hash = location.hash) {
    const match = /^#trip\/([A-Za-z0-9]{20})\/(home|map|bills|chat|photos|plans|polls|packing|invite|addexpense|crew|activity|guide|wrapup|settings)$/.exec(hash);
    return match ? {id:match[1], screen:match[2]} : {id:null, screen:'trips'};
  }
};
// Glass creates a containing block for fixed descendants in Android WebView.
// Keep viewport chrome directly under body, outside all blurred trip cards.
(() => {
  document.querySelectorAll('.native-tabs,.native-fab').forEach(element => {
    document.body.append(element);
  });
  let fullHeight = window.innerHeight;
  function keyboardLayout() {
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    const editing = document.activeElement?.matches('input:not([type=checkbox]),textarea,select');
    if (!editing) fullHeight = Math.max(fullHeight,window.innerHeight,height);
    const open = Boolean(editing && fullHeight - height > 140);
    document.documentElement.classList.toggle('keyboard-open',open);
  }
  window.visualViewport?.addEventListener('resize',keyboardLayout);
  window.addEventListener('resize',keyboardLayout);
  document.addEventListener('focusin',keyboardLayout);
  document.addEventListener('focusout',() => requestAnimationFrame(keyboardLayout));
})();
(() => {
  const capacitor = window.Capacitor;
  if (!capacitor?.isNativePlatform?.() || !document.getElementById('native-title')) return;
  const root = document.documentElement;
  root.classList.add('native-runtime');
  const plugins = capacitor.Plugins;
  const $ = id => document.getElementById(id);
  const pageNames = {home:'Manali getaway',map:'Trip map',expenses:'Bills',chat:'Chat',album:'Photos',plans:'Plans',packing:'Packing',trip:'Wrap-up',settings:'Settings'};
  const current = () => Object.hasOwn(pageNames,location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  if (!location.hash) history.replaceState(null,'','#home');
  if ((navigator.deviceMemory || 8) <= 4) root.classList.add('native-economy');
  function render() {
    const screen = current();
    $('native-title').textContent = pageNames[screen];
    $('native-back').hidden = screen === 'home';
    for (const anchor of document.querySelectorAll('.native-tabs a')) {
      if (anchor.hash === '#'+screen) anchor.setAttribute('aria-current','page');
      else anchor.removeAttribute('aria-current');
    }
  }
  window.addEventListener('hashchange',() => { render(); window.scrollTo(0,0); });
  const back = () => {
    const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
    if (dialog) dialog.close();
    else if (current() !== 'home') location.hash = 'home';
    else $('native-exit').showModal();
  };
  $('native-back').onclick = back;
  plugins.App?.addListener('backButton',back);
  $('native-exit-confirm').onclick = () => plugins.App?.exitApp();
  $('native-add').onclick = () => $('native-sheet').showModal();
  $('native-sheet').querySelectorAll('a').forEach(link => link.addEventListener('click',() => $('native-sheet').close()));
  $('native-alerts').onclick = () => { location.hash = 'chat'; };
  $('native-call').onclick = () => { location.hash = 'chat'; setTimeout(() => $('call').click(),0); };
  $('native-location').onclick = async () => {
    if (!window.confirm('Use your current location? Coordinates will be shown on this device only.')) return;
    location.hash = 'map';
    const output = $('pin-info');
    try {
      const permission = await plugins.Geolocation.requestPermissions();
      if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') throw new Error();
      const {coords} = await plugins.Geolocation.getCurrentPosition({timeout:10000});
      output.textContent = 'Your position · '+coords.latitude.toFixed(4)+', '+coords.longitude.toFixed(4);
    } catch { output.textContent = 'Location is unavailable. Check Android location permission and try again.'; }
  };
  document.addEventListener('click',event => {
    if (event.target.closest('button, input[type=checkbox]')) plugins.Haptics?.selectionChanged()?.catch(() => {});
  });
  const pushChannels = [
    {id:'calls',name:'Calls',importance:5,sound:'ringtone.wav',vibration:true},
    {id:'chat',name:'Chat',importance:3},
    {id:'bills',name:'Bills',importance:3},
    {id:'reminders',name:'Reminders',importance:3}
  ];
  const push = plugins.PushNotifications;
  function pushStatus(message) { $('native-push-status').textContent = message; }
  if (push) {
    push.addListener('registration',() => {
      pushStatus('This device registered with Firebase. Trip alerts need a connected notification sender.');
    });
    push.addListener('registrationError',() => pushStatus('Firebase Android registration is unavailable in this build.'));
    push.addListener('pushNotificationActionPerformed',event => {
      const screen = event.notification.data?.screen;
      if (Object.hasOwn(pageNames,screen)) location.hash = screen;
    });
  }
  $('native-push').onclick = async () => {
    try {
      const config = await fetch('./android-config.json').then(response => response.json());
      if (!config.push) return pushStatus('This APK needs the Firebase Android configuration to enable notifications.');
      const {receive} = await push.requestPermissions();
      if (receive !== 'granted') return pushStatus('Notifications are off. You can change this in Android Settings.');
      for (const channel of pushChannels) await push.createChannel(channel);
      await push.register();
    } catch { pushStatus('Notifications aren’t available in this build.'); }
  };
  const network = () => { $('native-offline').hidden = navigator.onLine; };
  addEventListener('online',network);
  addEventListener('offline',network);
  network();
  const read = (key,fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const write = (key,data) => { try { localStorage.setItem(key,JSON.stringify(data)); return true; } catch { return false; } };
  const theme = $('native-theme');
  theme.value = read('tf-android-theme','ivory');
  root.dataset.nativeTheme = theme.value;
  theme.onchange = () => { root.dataset.nativeTheme = theme.value; write('tf-android-theme',theme.value); };
  const plans = read('tf-android-plans',['6:30 PM · Meet at Old Manali bridge']);
  const renderPlans = () => $('native-plans').replaceChildren(...plans.map(plan => {
    const item = document.createElement('li');
    item.textContent = plan;
    return item;
  }));
  $('native-plan-form').onsubmit = event => {
    event.preventDefault();
    const value = new FormData(event.target).get('plan').trim();
    if (!value) return;
    if (!write('tf-android-plans',[...plans,value])) { alert('Device storage is full. Copy your plan before leaving this screen.'); return; }
    plans.push(value);
    renderPlans();
    event.target.reset();
  };
  renderPlans();
  const countdown = () => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(18,30,0,0);
    const minutes = Math.ceil((target-now)/60000);
    $('native-countdown').textContent = minutes > 0 ? 'Starts in '+Math.floor(minutes/60)+' hr '+minutes%60+' min' : 'Today’s meet-up time has passed.';
  };
  countdown();
  setInterval(countdown,60000);
  const openDeepLink = url => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'tripfriend:' || parsed.hostname !== 'trip' || !/^\/[A-Za-z0-9]{20}$/.test(parsed.pathname)) return;
      location.href = './trips.html?open='+encodeURIComponent(parsed.pathname.slice(1));
    } catch {}
  };
  plugins.App?.addListener('appUrlOpen',event => openDeepLink(event.url));
  plugins.App?.getLaunchUrl().then(event => { if (event?.url) openDeepLink(event.url); }).catch(() => {});
  plugins.App?.getInfo().then(info => { $('native-version').textContent = 'Android version '+info.version; }).catch(() => {});
  setTimeout(() => { $('native-splash').hidden = true; },matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 390);
  render();
})();
