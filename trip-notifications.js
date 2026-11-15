const notes = {chime:[523.25,659.25,783.99],soft:[587.33,440],bright:[659.25,880,1046.5]};
export function setupTripNotifications({uid,openTrip}) {
  const $ = id => document.getElementById(id);
  const plugin = window.Capacitor?.Plugins?.LocalNotifications;
  const tones = new Set(['chime','soft','bright','silent','custom']);
  const key = () => 'tripfriend-notifications:'+uid();
  const defaults = {enabled:false,tone:'chime'};
  const get = () => {
    try { return {...defaults,...JSON.parse(localStorage.getItem(key()))}; }
    catch { return defaults; }
  };
  const save = settings => localStorage.setItem(key(),JSON.stringify(settings));
  const message = text => { $('trip-alert-status').textContent = text; };
  let audio;
  function refresh() {
    const settings = get();
    $('trip-alert-enable').checked = settings.enabled;
    $('trip-alert-tone').value = tones.has(settings.tone) ? settings.tone : 'chime';
    $('trip-alert-file').value = '';
    message(settings.custom ? 'Custom sound saved on this device.' : '');
  }
  async function ensurePermission() {
    if (!plugin) return true;
    const {display} = await plugin.checkPermissions();
    if (display === 'granted') return true;
    if (display === 'denied') return false;
    return (await plugin.requestPermissions()).display === 'granted';
  }
  async function play(url) {
    audio?.pause();
    audio = new Audio(url);
    await audio.play();
  }
  async function preview(tone) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error('This browser does not support sound previews.');
    const context = new Context();
    try {
      await context.resume();
      const end = context.currentTime + notes[tone].length*.19;
      const ended = new Promise(resolve => notes[tone].forEach((pitch,index) => {
        const oscillator = context.createOscillator(), volume = context.createGain();
        const start = end - (notes[tone].length-index)*.19;
        oscillator.frequency.value = pitch;
        volume.gain.setValueAtTime(0,start);
        volume.gain.linearRampToValueAtTime(.2,start+.012);
        volume.gain.linearRampToValueAtTime(0,start+.19);
        oscillator.connect(volume).connect(context.destination);
        if (index === notes[tone].length-1) oscillator.onended = resolve;
        oscillator.start(start); oscillator.stop(start+.19);
      }));
      await ended;
    } finally { await context.close(); }
  }
  async function notify(settings,tripId) {
    const {tone} = settings;
    if (tone === 'custom' && !settings.custom) throw new Error('Choose a custom sound first.');
    if (!plugin || tone === 'custom') {
      if (tone === 'custom') await play(settings.custom);
      else if (tone !== 'silent') await preview(tone);
      if (!plugin) message(tripId ? 'New message in this trip.' : 'Sound test complete.');
      return;
    }
    if ((await plugin.checkPermissions()).display !== 'granted') throw new Error('Allow Trip Friend notifications in Android Settings.');
    const channelId = 'trip-chat-'+tone+'-v1';
    await plugin.createChannel({
      id:channelId,name:'Trip chat · '+({chime:'Aurora chime',soft:'Soft bell',bright:'Royal signal',silent:'Silent'}[tone]),
      importance:tone === 'silent' ? 2 : 4,
      ...(tone !== 'silent' ? {sound:tone+'.wav',vibration:true} : {})
    });
    const random = crypto.getRandomValues(new Uint32Array(1))[0];
    await plugin.schedule({notifications:[{
      id:1+(random%2147483646),title:'Trip Friend',body:tripId ? 'New trip message' : 'Notification sound test',
      channelId,smallIcon:'ic_trip_notification',extra:{tripId}
    }]});
  }
  $('trip-alert-enable').onchange = async event => {
    const input = event.target;
    const owner = uid();
    const enabled = input.checked;
    input.disabled = true;
    try {
      if (enabled && !(await ensurePermission())) {
        if (uid() === owner) { input.checked = false; message('Allow notifications in Android Settings, then return here.'); }
        return;
      }
      if (uid() === owner) { save({...get(),enabled}); message(enabled ? 'Trip message alerts are on.' : 'Trip message alerts are off.'); }
    } catch {
      if (uid() === owner) { input.checked = get().enabled; message('Could not save alert settings on this device.'); }
    } finally { input.disabled = false; }
  };
  $('trip-alert-tone').onchange = event => {
    try { save({...get(),tone:event.target.value}); }
    catch { event.target.value = get().tone; message('Could not save the selected sound.'); }
  };
  $('trip-alert-file').onchange = async event => {
    const file = event.target.files[0], owner = uid();
    if (!file) return;
    if (!file.type.startsWith('audio/') || file.size > 512000) {
      event.target.value = '';
      return message('Choose an audio file under 500 KB.');
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (owner !== uid()) return;
      try { save({...get(),custom:reader.result,tone:'custom'}); refresh(); }
      catch { message('There isn’t enough space to save the sound.'); }
    };
    reader.onerror = () => message('Could not read that audio file.');
    reader.readAsDataURL(file);
  };
  $('trip-permission-alerts').onclick = async () => {
    try {
      if (!plugin) { message('This browser can preview sounds. Android system alerts are available in the installed app.'); return; }
      message(await ensurePermission() ? 'Android notification permission is enabled.' : 'Notifications are off. You can enable them in Android Settings.');
    } catch { message('Could not check notification permission.'); }
  };
  $('trip-alert-test').onclick = async () => {
    try {
      if (!(await ensurePermission())) return message('Allow Trip Friend notifications in Android Settings.');
      await notify(get());
      message('Test complete. For an Android system alert, check the notification shade.');
    } catch (error) { message(error.message || 'Could not play the notification.'); }
  };
  plugin?.addListener('localNotificationActionPerformed',event => {
    const tripId = event.notification.extra?.tripId;
    if (typeof tripId === 'string' && /^[A-Za-z0-9]{20}$/.test(tripId) && uid()) openTrip(tripId);
  });
  return {
    refresh,
    alert(tripId) {
      const settings = get();
      if (!settings.enabled || !uid() || document.hidden) return;
      notify(settings,tripId).catch(() => {});
    }
  };
}
