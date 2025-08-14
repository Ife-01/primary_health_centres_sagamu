
// Data holders
let PHCS = [];
let SETTINGS = {};
let CLINICS = {};

const orderDays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const map = L.map('map', { scrollWheelZoom: true });
const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let markers = [];
let markerLayer = L.layerGroup().addTo(map);

const listEl = document.getElementById('list');
const searchInput = document.getElementById('searchInput');
const wardFilter = document.getElementById('wardFilter');
const dayFilter = document.getElementById('dayFilter');

async function loadData(){
  const [phcRes, setRes, clinRes] = await Promise.all([
    fetch('data/phcs.json'), fetch('data/settings.json'), fetch('data/clinics_by_ward.json')
  ]);
  PHCS = await phcRes.json();
  SETTINGS = await setRes.json();
  CLINICS = await clinRes.json();

  initWardFilter();
  initMapBounds();
  render();
  setupSearch();
}

function initWardFilter(){
  const wards = Array.from(new Set(PHCS.map(x => (x.ward || '').trim()).filter(Boolean))).sort();
  wards.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = w;
    wardFilter.appendChild(opt);
  });
}

function initMapBounds(){
  const coords = PHCS.map(x => [x.lat, x.lng]).filter(a => a[0] && a[1]);
  if (coords.length){
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds.pad(0.2));
  }else{
    // Fallback to Sagamu approximate center
    map.setView([6.848, 3.646], 12);
  }
}

function facilitiesForDay(f, selectedDay){
  if(!selectedDay) return true;

  // Opening hours logic (global)
  const hours = SETTINGS.opening_hours_global || {};
  const openToday = !!hours[selectedDay];

  // Clinic-by-ward logic
  const wardDays = CLINICS[f.ward] || {immunization:[], antenatal:[]};
  const hasClinic = (wardDays.immunization || []).includes(selectedDay) || (wardDays.antenatal || []).includes(selectedDay);

  return openToday || hasClinic;
}

function render(){
  const q = (searchInput.value || '').trim();
  const wVal = (wardFilter.value || '').trim();
  const dVal = (dayFilter.value || '').trim();

  let rows = [...PHCS];
  // ward filter
  if (wVal) rows = rows.filter(x => (x.ward||'').trim() === wVal);
  // day filter
  rows = rows.filter(x => facilitiesForDay(x, dVal));

  // search via Fuse if query
  if(q){
    const fuse = new Fuse(rows, {
      keys: [
        { name: 'name', weight: 0.5 },
        { name: 'address', weight: 0.3 },
        { name: 'ward', weight: 0.2 },
        { name: 'directions', weight: 0.4 }
      ],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2
    });
    rows = fuse.search(q).map(r => r.item);
  }

  renderList(rows);
  renderMap(rows);
}

function renderList(rows){
  listEl.innerHTML = '';
  rows.forEach(f => {
    const card = document.createElement('div');
    card.className = 'card';

    const phoneLink = f.phone ? `<a href="tel:${f.phone}">Call</a>` : '';
    const mapsLink = (f.lat && f.lng) ? `<a href="https://www.google.com/maps?q=${f.lat},${f.lng}" target="_blank" rel="noopener">Open in Maps</a>` : '';

    const wardDays = CLINICS[f.ward] || {immunization:[], antenatal:[]};

    const servicesBadges = (SETTINGS.services_global || []).map(s => `<span class="badge">${s}</span>`).join(' ');

    const clinicBadges = [];
    if (wardDays.immunization?.length){
      clinicBadges.push(`<span class="badge">Immunization: ${wardDays.immunization.join(' · ')}</span>`);
    }
    if (wardDays.antenatal?.length){
      clinicBadges.push(`<span class="badge">Antenatal: ${wardDays.antenatal.join(' · ')}</span>`);
    }

    const oh = SETTINGS.opening_hours_global || {};
    const ohText = orderDays.map(d => `${d}: ${oh[d] || '—'}`).join(' | ');

    card.innerHTML = `
      <h3>${f.name || 'Unknown facility'}</h3>
      <div class="meta"><strong>Ward:</strong> ${f.ward || '—'}</div>
      <div class="meta"><strong>Address:</strong> ${f.address || '—'}</div>
      <div class="meta"><strong>Directions:</strong> ${f.directions || '—'}</div>

      <div class="badges">${servicesBadges}</div>
      <div class="badges">${clinicBadges.join(' ')}</div>

      <div class="meta"><strong>Opening hours:</strong> ${ohText}</div>

      <div class="actions">
        ${phoneLink}
        ${mapsLink}
      </div>
    `;
    listEl.appendChild(card);
  });
}

function renderMap(rows){
  markerLayer.clearLayers();
  markers = [];

  rows.forEach(f => {
    if(!(f.lat && f.lng)) return;
    const wardDays = CLINICS[f.ward] || {immunization:[], antenatal:[]};
    const clinicLines = [];
    if (wardDays.immunization?.length){
      clinicLines.push(`Immunization: ${wardDays.immunization.join(' · ')}`);
    }
    if (wardDays.antenatal?.length){
      clinicLines.push(`Antenatal: ${wardDays.antenatal.join(' · ')}`);
    }

    const popup = `
      <div><strong>${f.name || 'Unknown facility'}</strong></div>
      <div><em>Ward:</em> ${f.ward || '—'}</div>
      <div><em>Address:</em> ${f.address || '—'}</div>
      <div><em>Directions:</em> ${f.directions || '—'}</div>
      <div style="margin-top:4px;">
        <a href="https://www.google.com/maps?q=${f.lat},${f.lng}" target="_blank" rel="noopener">Open in Maps</a>
      </div>
    `;
    const m = L.marker([f.lat, f.lng]).bindPopup(popup);
    markers.push(m);
    markerLayer.addLayer(m);
  });

  // Adjust bounds to filtered markers if any
  const coords = rows.map(x => [x.lat, x.lng]).filter(a => a[0] && a[1]);
  if (coords.length){
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds.pad(0.2));
  }
}

function setupSearch(){
  searchInput.addEventListener('input', render);
  wardFilter.addEventListener('change', render);
  dayFilter.addEventListener('change', render);
}

loadData();
