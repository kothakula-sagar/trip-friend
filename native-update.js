(() => {
  const capacitor = window.Capacitor;
  if (!capacitor?.isNativePlatform?.()) return;
  const {App,TripUpdater,LocalNotifications} = capacitor.Plugins;
  if (!App || !TripUpdater) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'glass modal';
  dialog.setAttribute('aria-labelledby','apk-update-title');
  dialog.innerHTML = '<h2 id="apk-update-title">Update available</h2><p id="apk-update-detail"></p><p id="apk-update-status" role="status"></p><div class="actions"><button class="gold" type="button">Update now</button><form method="dialog"><button class="outline">Later</button></form></div>';
  document.body.append(dialog);
  const button = dialog.querySelector('button');
  const status = dialog.querySelector('#apk-update-status');
  const entry = document.createElement('button');
  entry.type = 'button';
  entry.className = 'outline';
  entry.hidden = true;
  document.querySelector('[data-real-screen="settings"]')?.append(entry);
  let version, checking = false, offered, lastCheck = 0;
  entry.onclick = () => { if (!dialog.open) dialog.showModal(); };
  button.onclick = async () => {
    button.disabled = true;
    status.textContent = 'Downloading the APK…';
    try {
      await TripUpdater.install({version});
      status.textContent = 'Confirm the update in Android’s installer.';
    } catch (error) {
      status.textContent = error.message || 'The update could not be installed.';
    } finally { button.disabled = false; }
  };
  function newer(candidate, installed) {
    const a = candidate.slice(1).split('.').map(Number);
    const b = installed.split('.').map(Number);
    const different = a.findIndex((value,index) => value !== b[index]);
    return different >= 0 && a[different] > b[different];
  }
  async function alertOnce(tag) {
    const key = 'trip-friend-update-alert:'+tag;
    try {
      if (!LocalNotifications || localStorage.getItem(key)) return;
      if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
      await LocalNotifications.createChannel({id:'app-updates',name:'App updates',importance:3});
      await LocalNotifications.schedule({notifications:[{
        id:712401,title:'Trip Friend update available',body:'Open Trip Friend to install '+tag+'.',
        channelId:'app-updates',smallIcon:'ic_trip_notification',extra:{appUpdate:true}
      }]});
      localStorage.setItem(key,'1');
    } catch {}
  }
  LocalNotifications?.addListener('localNotificationActionPerformed',event => {
    if (event.notification.extra?.appUpdate) {
      if (version) entry.click();
      else check(true);
    }
  });
  async function check(force = false) {
    if (checking || (!force && Date.now()-lastCheck < 60000)) return;
    checking = true;
    try {
      const installed = await App.getInfo();
      const response = await fetch('https://api.github.com/repos/kothakula-sagar/trip-friend/releases/latest',{cache:'no-store'});
      if (!response.ok) return;
      const release = await response.json();
      const tag = release.tag_name;
      if (!/^v\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(tag) || !newer(tag,installed.version)) return;
      if (!release.assets?.some(asset => asset.name === 'TripFriend.apk')) return;
      version = tag;
      entry.textContent = 'Install '+tag;
      entry.hidden = false;
      dialog.querySelector('#apk-update-detail').textContent = 'Trip Friend '+tag+' is ready. You have '+installed.version+'.';
      if (offered !== tag || force) {
        offered = tag;
        if (!dialog.open && !document.querySelector('dialog[open]')) dialog.showModal();
      }
      await alertOnce(tag);
    } catch {} finally { checking = false; lastCheck = Date.now(); }
  }
  App.addListener('appStateChange',event => { if (event.isActive) check(); });
  addEventListener('online',() => check());
  setInterval(() => { if (!document.hidden) check(); },15*60*1000);
  check(true);
})();
