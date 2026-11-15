import {mapConfig} from './map-config.js';

let library;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  library ??= new Promise((resolve,reject) => {
    const base = mapConfig.leaflet;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = base+'leaflet.css';
    const script = document.createElement('script');
    script.src = base+'leaflet.js';
    script.onload = () => resolve(window.L);
    script.onerror = () => { css.remove(); script.remove(); library = undefined; reject(new Error('Map unavailable')); };
    document.head.append(css,script);
  });
  return library;
}

export function createTripMap({listen,save,remove,viewer}) {
  const panel = document.getElementById('trip-map-panel');
  const canvas = document.getElementById('trip-map');
  const status = document.getElementById('map-status');
  const form = document.getElementById('pin-form');
  const directions = document.getElementById('map-directions');
  const clear = document.getElementById('remove-pin');
  const locate = document.getElementById('locate-map');
  const crewList = document.getElementById('map-crew-list');
  let crewMarkers = [], crewPositions = [], ownMarker, fitted = false, localPosition;
  const directionsUrl = (lat,lng) => {
    const url = new URL(mapConfig.directions);
    url.searchParams.set('api','1');
    url.searchParams.set('destination',lat+','+lng);
    return url.href;
  };
  let trip, admin, map, marker, stop, saved, draft, generation = 0;
  const valid = (lat,lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  function render(center = false) {
    marker?.remove();
    const point = draft || saved;
    if (point && map) {
      const caption = document.createElement('span');
      caption.textContent = draft ? 'Unsaved meeting point' : saved.name;
      marker = window.L.marker([point.lat,point.lng]).addTo(map).bindPopup(caption);
      if (center) map.setView([point.lat,point.lng],15);
    }
    directions.hidden = !saved;
    if (saved) {
      const {lat,lng} = saved;
      directions.href = directionsUrl(lat,lng);
    }
    clear.hidden = !admin || !saved;
    document.getElementById('saved-pin').textContent = saved ? saved.name+' · '+saved.lat.toFixed(5)+', '+saved.lng.toFixed(5) : 'No meeting point saved yet.';
  }
  function choose(lat,lng) {
    if (!valid(lat,lng)) return;
    draft = {lat,lng};
    form.elements.lat.value = lat.toFixed(6);
    form.elements.lng.value = lng.toFixed(6);
    render();
    status.textContent = 'Pin selected. Give it a name and save it for the crew.';
  }
  function renderCrew() {
    crewMarkers.forEach(marker => marker.remove());
    crewMarkers = [];
    if (!map) return;
    crewList.replaceChildren();
    for (const point of crewPositions) {
      if (!valid(point.lat,point.lng)) continue;
      const own = point.id === viewer();
      const name = own ? 'You' : point.label;
      const badge = document.createElement('span');
      badge.className = own ? 'crew-map-you' : 'crew-map-friend';
      badge.textContent = name.slice(0,1).toUpperCase();
      const label = document.createElement('span');
      label.textContent = name;
      const caption = document.createElement('p');
      const age = Math.max(0,Math.floor((Date.now()-(point.updatedAt?.toMillis() || Date.now()))/60000));
      caption.textContent = name+' · '+(age ? age+' min ago' : 'Just now')+' · ±'+Math.round(point.accuracy)+' m accuracy';
      const memberMarker = window.L.marker([point.lat,point.lng],{
        icon:window.L.divIcon({className:'crew-map-marker',html:badge,iconSize:[32,32],iconAnchor:[16,16]}),
        title:name,alt:name
      }).addTo(map).bindTooltip(label,{permanent:true,direction:'top',offset:[0,-13]}).bindPopup(caption);
      crewMarkers.push(memberMarker);
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'outline';
      button.textContent = name+' · '+(age ? age+' min ago' : 'Just now');
      button.onclick = () => { map.setView(memberMarker.getLatLng(),16); memberMarker.openPopup(); };
      item.append(button);
      crewList.append(item);
    }
    if (!crewList.children.length) {
      const item = document.createElement('li');
      item.textContent = 'No crew members are sharing a recent location.';
      crewList.append(item);
    }
    if (!fitted && crewMarkers.length && panel.open && !panel.closest('[hidden]')) {
      const bounds = window.L.featureGroup(crewMarkers).getBounds();
      if (saved) bounds.extend([saved.lat,saved.lng]);
      map.fitBounds(bounds,{padding:[40,40],maxZoom:16});
      fitted = true;
    }
  }
  document.addEventListener('trip-presence',event => { crewPositions = event.detail; renderCrew(); });
  async function open() {
    if (!trip || !panel.open || panel.closest('[hidden]')) return;
    const active = generation;
    try {
      const L = await loadLeaflet();
      if (active !== generation || !panel.open || panel.closest('[hidden]')) return;
      if (!map) {
        map = L.map(canvas,{scrollWheelZoom:false}).setView(mapConfig.fallbackView,5);
        L.tileLayer(mapConfig.tiles,{
          maxZoom:19,attribution:'&copy; <a href="'+mapConfig.attribution+'">OpenStreetMap</a> contributors'
        }).addTo(map);
        map.on('click',event => { if (admin) choose(event.latlng.lat,event.latlng.wrap().lng); });
      }
      map.invalidateSize();
      render(!fitted && !crewPositions.length);
      renderCrew();
    } catch {
      if (active === generation) status.textContent = 'Could not load the map. Reopen this section to retry.';
    }
  }
  panel.addEventListener('toggle',open);
  document.addEventListener('trip-map-open',() => {
    if (!panel.open) panel.open = true;
    else open();
  });
  locate.onclick = () => {
    const active = generation;
    if (!navigator.geolocation) { status.textContent = 'This browser does not provide your location.'; return; }
    status.textContent = 'Finding your location…';
    navigator.geolocation.getCurrentPosition(({coords}) => {
      if (active !== generation) return;
      localPosition = [coords.latitude,coords.longitude];
      if (map) {
        ownMarker?.remove();
        ownMarker = window.L.circleMarker(localPosition,{radius:8,color:'#fff',fillColor:'#1F3A93',fillOpacity:1}).addTo(map).bindTooltip('You · only on this device',{permanent:true});
        map.setView(localPosition,16);
      }
      status.textContent = 'You are shown in blue. This check does not share your location.';
    },() => {
      if (active === generation) status.textContent = 'Location unavailable. Check your browser’s location permission or pan the map manually.';
    },{timeout:10000});
  };
  form.addEventListener('submit',async event => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    const lat = Number(form.elements.lat.value), lng = Number(form.elements.lng.value);
    if (!trip || !admin || !name || !valid(lat,lng)) { status.textContent = 'Enter a name and valid coordinates.'; return; }
    const active = generation;
    const button = event.submitter;
    button.disabled = true;
    try {
      await save(trip,{name,lat,lng});
      if (active === generation) {
        draft = undefined;
        render(true);
        status.textContent = 'Meeting point shared with the crew.';
      }
    } catch { if (active === generation) status.textContent = 'Could not save. Ask the project owner to publish the updated Firestore rules.'; }
    finally { button.disabled = false; }
  });
  clear.onclick = async () => {
    if (!trip || !admin) return;
    const active = generation;
    clear.disabled = true;
    try {
      await remove(trip);
      if (active === generation) { draft = undefined; form.reset(); render(); status.textContent = 'Meeting point removed.'; }
    } catch { if (active === generation) status.textContent = 'Could not remove the meeting point.'; }
    finally { clear.disabled = false; }
  };
  return (id, isAdmin = false) => {
    if (trip === id && admin === isAdmin) return;
    generation++;
    stop?.();
    trip = id;
    admin = isAdmin;
    saved = draft = undefined;
    fitted = false; localPosition = undefined; ownMarker?.remove(); crewPositions = [];
    renderCrew();
    form.reset();
    form.hidden = !admin;
    status.textContent = '';
    render();
    if (!trip) return;
    stop = listen(trip,point => {
      saved = point;
      if (saved && !draft && admin) {
        form.elements.name.value = saved.name;
        form.elements.lat.value = saved.lat;
        form.elements.lng.value = saved.lng;
      }
      render(!fitted && !localPosition);
    },() => { status.textContent = 'Meeting point data is unavailable. Check the deployed Firestore rules.'; });
    open();
  };
}
