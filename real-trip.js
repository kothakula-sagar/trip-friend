const $ = id => document.getElementById(id);
const shell = window.TripShell;
const native = shell.native;

import {setupTripNotifications} from "./trip-notifications.js";

import {renderChat} from "./crew-ui.js";

export function createRealTrip({subscribe,write,patch,erase,identity,openTrip,showList}) {
  let trip, generation = 0, watch, watching = false, plans = [], subscriptions = [], lastWrite, positionBusy = false, queuedPosition;
  let routeDepth = 0;
  let profiles = new Map(), messages = [], unread = 0;
  function refreshChat() {
    renderChat($('real-messages'),messages,profiles,identity());
    const badge = $('real-chat-unread');
    badge.hidden = unread === 0;
    badge.textContent = String(unread);
  }
  function renderPacking(items) {
    const checked = items.filter(item => item.checked).length;
    $('real-pack-progress').max = items.length || 1;
    $('real-pack-progress').value = checked;
    $('real-pack-count').textContent = checked+' of '+items.length+' packed';
    $('real-packing-items').replaceChildren(...items.map(item => {
      const li = row('');
      const label = document.createElement('label');
      const control = document.createElement('input');
      control.type = 'checkbox';
      control.checked = item.checked;
      control.disabled = trip.closed;
      const id = trip.id;
      control.onchange = () => {
        const desired = control.checked;
        patch(id,'packing',item.id,{checked:desired,checkedBy:desired ? identity().uid : ''}).catch(() => {
          control.checked = !desired;
          alert('Could not update this item. Try again.');
        });
      };
      const assignee = profiles.get(item.assignee)?.name || (item.assignee === identity()?.uid ? 'You' : item.assignee ? 'Trip member' : '');
      label.append(control,document.createTextNode(' '+item.item+(assignee ? ' · '+assignee : '')));
      li.append(label);
      return li;
    }));
    if (!items.length) $('real-packing-items').append(row('Nothing to pack yet. Add your first item.'));
  }
  function renderAssignees() {
    const select = $('real-pack-form').elements.assignee;
    const current = select.value;
    select.replaceChildren(new Option('Unassigned',''),...trip.memberUids.map(id => new Option(
      profiles.get(id)?.name || (id === identity()?.uid ? 'You' : 'Trip member'),id)));
    if ([...select.options].some(option => option.value === current)) select.value = current;
  }
  const notifications = setupTripNotifications({uid:() => identity()?.uid,openTrip:id => go(id,'chat')});
  const notice = message => { $('real-location-banner').textContent = message; };
  function row(text) {
    const node = document.createElement('li');
    node.textContent = text;
    return node;
  }
  function route() {
    const target = shell.route();
    if (target.id) openTrip(target.id);
    else showList();
    render();
  }
  function render() {
    const target = shell.route();
    const id = trip?.id === target.id ? target.id : null;
    const screen = id ? target.screen : 'trips';
    document.querySelectorAll('[data-real-screen]').forEach(section => {
      section.hidden = (native || target.id) ? section.dataset.realScreen !== screen : ['chat','photos','packing','wrapup','settings','plans'].includes(section.dataset.realScreen);
    });
    document.querySelectorAll('[data-real-go]').forEach(link => {
      if (trip) link.href = '#trip/'+trip.id+'/'+link.dataset.realGo;
      if (id && link.dataset.realGo === screen) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    if (screen === 'chat' && unread) { unread = 0; refreshChat(); }
    $('real-title').textContent = id ? trip.name : 'Trip Friend';
    document.documentElement.classList.toggle('trip-focused',Boolean(id));
    $('real-tabs').hidden = !id;
    if (screen === 'map') document.dispatchEvent(new Event('trip-map-open'));
    $('real-add').hidden = !native || !id;
    $('real-alerts').hidden = !id;
    $('real-back').hidden = !id;
  }
  function go(id,screen = 'home') {
    const hash = '#trip/'+id+'/'+screen;
    if (location.hash === hash) return;
    history.pushState({tripDepth:++routeDepth},'',hash);
    route();
    if (!native) window.scrollTo({top:0,behavior:'instant'});
  }
  function back() {
    if (history.state?.tripDepth > 0) history.back();
    else if (shell.route().id) { history.replaceState(null,'','#trips'); route(); }
    else if (native) $('real-exit').showModal();
  }
  if (native) {
    document.documentElement.classList.add('native-runtime','real-runtime');
    $('real-top').hidden = false;
    $('real-splash').hidden = false;
    setTimeout(() => { $('real-splash').hidden = true; }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 360);
    shell.bindBack(back);
  }
  $('real-back').onclick = back;
  $('real-exit-confirm').onclick = () => window.Capacitor?.Plugins?.App?.exitApp();
  $('real-alerts').onclick = () => { if (trip) go(trip.id,'chat'); };
  $('real-add').onclick = () => $('real-sheet').showModal();
  document.addEventListener('click',event => {
    const link = event.target.closest('[data-real-go]');
    if (!link || !trip) return;
    event.preventDefault();
    if ($('real-sheet').open) $('real-sheet').close();
    go(trip.id,link.dataset.realGo);
  });
  addEventListener('popstate', () => { routeDepth = history.state?.tripDepth || 0; route(); });
  addEventListener('hashchange',route);
  const updateCountdown = () => {
    const next = plans.find(plan => plan.startsAt?.toMillis() > Date.now());
    if (!next) { $('real-next-plan').textContent = 'No upcoming plan.'; return; }
    const minutes = Math.ceil((next.startsAt.toMillis()-Date.now())/60000);
    $('real-next-plan').textContent = next.title+' · '+new Date(next.startsAt.toMillis()).toLocaleString()+' · '+minutes+' min to go';
  };
  setInterval(updateCountdown,30000);
  let positions = [];
  function renderPresence() {
    $('real-presence').replaceChildren(...positions.map(point => row(
      point.label+' · '+(point.active && point.updatedAt?.toMillis() > Date.now()-900000 ? 'Sharing location' : 'Last seen')
    )));
    if (!positions.length) $('real-presence').append(row('Nobody is sharing location yet.'));
    document.dispatchEvent(new CustomEvent('trip-presence',{detail:positions.filter(point => point.active && point.updatedAt?.toMillis() > Date.now()-900000)}));
  }
  setInterval(renderPresence,15000);
  function paintNetwork() {
    document.documentElement.classList.toggle('trip-offline',!navigator.onLine);
    if (navigator.onLine) flushLocation();
  }
  addEventListener('online',paintNetwork);
  addEventListener('offline',paintNetwork);
  paintNetwork();
  function flushLocation() {
    if (!watching || !navigator.onLine || document.hidden || positionBusy || !queuedPosition || !trip) return;
    const coords = queuedPosition;
    const moved = !lastWrite || Math.hypot((coords.latitude-lastWrite.lat)*111000,(coords.longitude-lastWrite.lng)*111000*Math.cos(coords.latitude*Math.PI/180)) >= 20;
    if (lastWrite && Date.now()-lastWrite.time < (moved ? 15000 : 120000)) return;
    positionBusy = true;
    const active = generation;
    const id = trip.id;
    const user = identity();
    if (!user) { positionBusy = false; return; }
    const record = {lat:coords.latitude,lng:coords.longitude,accuracy:Math.min(10000,Math.max(0,coords.accuracy || 0)),heading:coords.heading ?? null,speed:coords.speed ?? null,label:(user.displayName || user.email.split('@')[0]).slice(0,80),active:true};
    lastWrite = {...record,time:Date.now()};
    write(id,'presence',record,user.uid).catch(() => { if (active === generation) notice('Sharing with '+trip.name+' crew · Latest position could not sync.'); }).finally(() => { positionBusy = false; });
  }
  setInterval(flushLocation,15000);
  function stopLocation() {
    const wasSharing = watching;
    watching = false;
    $('real-stop-location').hidden = true;
    queuedPosition = lastWrite = undefined;
    const plugin = window.Capacitor?.Plugins?.Geolocation;
    if (watch != null) {
      if (native) plugin?.clearWatch({id:watch}).catch(() => {});
      else navigator.geolocation.clearWatch(watch);
    }
    watch = undefined;
    const user = identity();
    if (wasSharing && trip && user) {
      erase(trip.id,'presence',user.uid).catch(() => {});
    }
    $('real-share-location').setAttribute('aria-pressed','false');
    $('real-share-location').textContent = 'Share my location with this trip';
    notice(wasSharing && !navigator.onLine ? 'Stopped on this device. Removal will sync when online.' : '');
  }
  $('real-stop-location').onclick = stopLocation;
  $('real-share-location').onclick = async () => {
    if (watching) return stopLocation();
    if (!trip || !confirm('Share your latest location with this trip while the app is open? You can stop at any time.')) return;
    const active = generation;
    watching = true;
    $('real-stop-location').hidden = false;
    $('real-share-location').setAttribute('aria-pressed','true');
    $('real-share-location').textContent = 'Stop location sharing';
    notice('Sharing with '+trip.name+' crew');
    const callback = (position,error) => {
      if (!watching || active !== generation) return;
      if (error || !position) { stopLocation(); notice('Location is unavailable. Check permission and try again.'); return; }
      queuedPosition = position.coords;
      flushLocation();
    };
    try {
      if (native) {
        const geo = window.Capacitor.Plugins.Geolocation;
        const permission = await geo.requestPermissions();
        if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') throw Error();
        if (!watching || active !== generation) return;
        const id = await geo.watchPosition({enableHighAccuracy:false,timeout:15000},callback);
        if (!watching || active !== generation) await geo.clearWatch({id});
        else watch = id;
      } else {
        watch = navigator.geolocation.watchPosition(callback,error => callback(null,error),{timeout:15000});
      }
    } catch { callback(null,true); }
  };
  function submit(id,collection,record) {
    $(id).addEventListener('submit',event => {
      event.preventDefault();
      if (!trip || trip.closed) return;
      const fields = new FormData(event.currentTarget);
      const data = record(fields);
      if (!data) return;
      const form = event.currentTarget;
      const message = data.text || data.title || data.item;
      form.reset();
      write(trip.id,collection,data).catch(() => {
        const input = form.querySelector('input');
        if (!input.value) input.value = message;
        alert('Could not save. Check your access and retry.');
      });
    });
  }
  submit('real-plan-form','plans',fields => {
    const title = fields.get('title').trim(), time = new Date(fields.get('time'));
    return title && Number.isFinite(time.getTime()) ? {title,startsAt:time} : null;
  });
  $('real-profile-form').onsubmit = async event => {
    event.preventDefault();
    if (!trip || trip.closed) return;
    const name = new FormData(event.currentTarget).get('name').trim();
    if (!name) return;
    const feedback = $('trip-profile-status');
    feedback.textContent = 'Saving your name…';
    try {
      await write(trip.id,'profiles',{name},identity().uid);
      feedback.textContent = 'Name saved.';
    } catch (error) {
      feedback.textContent = error.code === 'permission-denied'
        ? 'Firestore denied this change. Check that the trip is active and publish the current profile rules.'
        : 'Could not save your name. Try again when connected.';
    }
  };
  submit('real-pack-form','packing',fields => {
    const item = fields.get('item').trim();
    return item ? {item,assignee:fields.get('assignee'),checked:false,checkedBy:''} : null;
  });
  submit('real-chat-form','messages',fields => {
    const text = fields.get('text').trim();
    return text ? {text,authorUid:identity().uid} : null;
  });
  return {
    go, route, render, stopLocation,
    select(value) {
      if (value?.id === trip?.id && value?.closed === trip?.closed) { trip = value; if (trip) renderAssignees(); render(); return; }
      stopLocation();
      generation++;
      subscriptions.forEach(stop => stop());
      subscriptions = [];
      trip = value;
      profiles = new Map(); messages = []; unread = 0;
      refreshChat();
      if (trip) notifications.refresh();
      plans = []; positions = []; updateCountdown(); renderPresence();
      $('real-plans').replaceChildren();
      $('real-messages').replaceChildren();
      if (trip) {
        $('real-plan-form').hidden = !trip.admin || trip.closed;
        $('real-chat-form').hidden = trip.closed;
        $('real-share-location').hidden = trip.closed;
        const problem = id => () => { $(id).replaceChildren(row('Could not load this section. Check your connection and Firestore rules.')); };
        let seenMessages;
        let baseline;
        let packing = [];
        $('real-pack-form').hidden = trip.closed;
        $('real-profile-form').hidden = trip.closed;
        renderAssignees();
        renderPacking(packing);
        subscriptions = [
          subscribe(trip.id,'profiles','name','asc',items => {
            profiles = new Map(items.map(item => [item.id,item]));
            const field = $('real-profile-form').elements.name;
            if (document.activeElement !== field) field.value = profiles.get(identity()?.uid)?.name || '';
            renderAssignees(); renderPacking(packing); refreshChat();
          },() => {}),
          subscribe(trip.id,'packing','createdAt','asc',items => { packing = items; renderPacking(items); },problem('real-packing-items')),
          subscribe(trip.id,'plans','startsAt','asc',items => {
            plans = items;
            $('real-plans').replaceChildren(...items.map(plan => row(plan.title+' · '+new Date(plan.startsAt.toMillis()).toLocaleString())));
            updateCountdown();
          },problem('real-plans')),
          subscribe(trip.id,'messages','createdAt','desc',(items, metadata) => {
            const latest = new Set(items.map(item => item.id));
            if (!metadata.fromCache) {
              if (seenMessages && items.some(item => !seenMessages.has(item.id) && item.authorUid !== identity()?.uid && item.createdAt?.toMillis() > baseline)) {
                notifications.alert(trip.id);
                if (shell.route().screen !== 'chat') unread += items.filter(item =>
                  !seenMessages.has(item.id) && item.authorUid !== identity()?.uid && item.createdAt?.toMillis() > baseline).length;
              }
              seenMessages = latest;
              baseline = Math.max(baseline ?? 0,...items.map(item => item.createdAt?.toMillis() || 0));
            }
            messages = items; refreshChat();
          },problem('real-messages')),
          subscribe(trip.id,'presence','updatedAt','desc',items => { positions = items; renderPresence(); },problem('real-presence'))
        ];
      }
      render();
    }
  };
}
