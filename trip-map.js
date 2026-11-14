let library;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  library ??= new Promise((resolve,reject) => {
    const base = 'https://unpkg.com/leaflet@1.9.4/dist/';
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

export function createTripMap({listen,save,remove}) {
  const panel = document.getElementById('trip-map-panel');
  const canvas = document.getElementById('trip-map');
  const status = document.getElementById('map-status');
  const form = document.getElementById('pin-form');
  const directions = document.getElementById('map-directions');
  const clear = document.getElementById('remove-pin');
  const locate = document.getElementById('locate-map');
  let crewMarkers = [], crewPositions = [];
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
      directions.href = 'https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lng+'#map=16/'+lat+'/'+lng;
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
    for (const point of crewPositions) {
      const caption = document.createElement('span');
      caption.textContent = point.label+' · '+Math.round(point.accuracy)+' m accuracy';
      crewMarkers.push(window.L.circleMarker([point.lat,point.lng],{
        radius:10,color:'#fff',fillColor:'#0E8F63',fillOpacity:1,weight:2
      }).addTo(map).bindPopup(caption));
    }
  }
  document.addEventListener('trip-presence',event => { crewPositions = event.detail; renderCrew(); });
  async function open() {
    if (!trip || !panel.open) return;
    const active = generation;
    try {
      const L = await loadLeaflet();
      if (active !== generation || !panel.open) return;
      if (!map) {
        map = L.map(canvas,{scrollWheelZoom:false}).setView([32.244,77.189],12);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
          maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        map.on('click',event => { if (admin) choose(event.latlng.lat,event.latlng.wrap().lng); });
      }
      map.invalidateSize();
      renderCrew();
      render(true);
    } catch {
      if (active === generation) status.textContent = 'Could not load the map. Reopen this section to retry.';
    }
  }
  panel.addEventListener('toggle',open);
  locate.onclick = () => {
    const active = generation;
    if (!navigator.geolocation) { status.textContent = 'This browser does not provide your location.'; return; }
    status.textContent = 'Finding your location…';
    navigator.geolocation.getCurrentPosition(({coords}) => {
      if (active !== generation) return;
      map?.setView([coords.latitude,coords.longitude],15);
      if (admin) choose(coords.latitude,coords.longitude);
      else status.textContent = 'Map centered on your location. It was only used on this device.';
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
      render(true);
    },() => { status.textContent = 'Meeting point data is unavailable. Check the deployed Firestore rules.'; });
    open();
  };
}
