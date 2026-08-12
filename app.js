import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get }
                                  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ── CONFIG FIREBASE ──────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAfFOesu6vXGTcATvtBH8IdAbgm6AqfJBY",
  authDomain:        "superjije.firebaseapp.com",
  databaseURL:       "https://superjije-default-rtdb.firebaseio.com",
  projectId:         "superjije",
  storageBucket:     "superjije.firebasestorage.app",
  messagingSenderId: "428893538374",
  appId:             "1:428893538374:web:2ad3d312c409f6e775e247"
};

const app      = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ── EQUIPOS Y FIXTURES ───────────────────────────────────────────────────
const TEAMS = ["All Stars", "Real Envido", "4to Régimen", "Dou FC"];

const FIXTURE_APERTURA = [
  { fecha: "Fecha 1", home: "All Stars",   away: "Real Envido" },
  { fecha: "Fecha 1", home: "4to Régimen", away: "Dou FC" },
  { fecha: "Fecha 2", home: "4to Régimen", away: "Real Envido" },
  { fecha: "Fecha 2", home: "Dou FC",      away: "All Stars" },
  { fecha: "Fecha 3", home: "Dou FC",      away: "Real Envido" },
  { fecha: "Fecha 3", home: "All Stars",   away: "4to Régimen" },
  { fecha: "Fecha 4", home: "Real Envido", away: "All Stars" },
  { fecha: "Fecha 4", home: "Dou FC",      away: "4to Régimen" },
  { fecha: "Fecha 5", home: "Real Envido", away: "4to Régimen" },
  { fecha: "Fecha 5", home: "All Stars",   away: "Dou FC" },
  { fecha: "Fecha 6", home: "Real Envido", away: "Dou FC" },
  { fecha: "Fecha 6", home: "4to Régimen", away: "All Stars" }
];

const FIXTURE_CLAUSURA = [
  { fecha: "Fecha 1", home: "Real Envido", away: "All Stars" },
  { fecha: "Fecha 1", home: "Dou FC",      away: "4to Régimen" },
  { fecha: "Fecha 2", home: "Real Envido", away: "Dou FC" },
  { fecha: "Fecha 2", home: "All Stars",   away: "Dou FC" },
  { fecha: "Fecha 3", home: "Real Envido", away: "Dou FC" },
  { fecha: "Fecha 3", home: "All Stars",   away: "4to Régimen" },
  { fecha: "Fecha 4", home: "All Stars",   away: "Real Envido" },
  { fecha: "Fecha 4", home: "4to Régimen", away: "Dou FC" },
  { fecha: "Fecha 5", home: "4to Régimen", away: "Real Envido" },
  { fecha: "Fecha 5", home: "Dou FC",      away: "All Stars" },
  { fecha: "Fecha 6", home: "Dou FC",      away: "Real Envido" },
  { fecha: "Fecha 6", home: "All Stars",   away: "4to Régimen" }
];

// Jugadores de ejemplo (solo se cargan si Firebase no tiene jugadores)
const SEED_PLAYERS = [
  { name: "Gonza",  team: "All Stars",    position: "Delantero" },
  { name: "Fran",   team: "Real Envido",  position: "Mediocampista" },
  { name: "Lucho",  team: "4to Régimen",  position: "Defensor" },
  { name: "Tomi",   team: "Dou FC",       position: "Arquero" },
  { name: "Mati",   team: "All Stars",    position: "Mediocampista" },
  { name: "Nacho",  team: "Real Envido",  position: "Delantero" },
  { name: "Fede",   team: "4to Régimen",  position: "Mediocampista" },
  { name: "Santi",  team: "Dou FC",       position: "Defensor" }
];

// ── ESTADO LOCAL ─────────────────────────────────────────────────────────
let state = { apertura: [], clausura: [], copas: [], goles: [], tarjetas: [], players: [] };
let isCommissioner = false;
let seedDone = false; // evita seedear múltiples veces

// ── HELPERS FIREBASE ─────────────────────────────────────────────────────
async function saveKey(key) {
  setStatus('syncing');
  await set(ref(database, `jija2026/${key}`), state[key]);
  setStatus('online');
}

async function savePassword(hash) {
  await set(ref(database, 'jija2026/config/comm_pwd'), hash);
}

async function getPassword() {
  const snap = await get(ref(database, 'jija2026/config/comm_pwd'));
  return snap.exists() ? snap.val() : null;
}

// ── LISTENER EN TIEMPO REAL ──────────────────────────────────────────────
function subscribeRealtime() {
  onValue(ref(database, 'jija2026'), (snapshot) => {
    const data = snapshot.val() || {};
    state.apertura  = data.apertura  ? Object.values(data.apertura)  : [];
    state.clausura  = data.clausura  ? Object.values(data.clausura)  : [];
    state.copas     = data.copas     ? Object.values(data.copas)     : [];
    state.goles     = data.goles     ? Object.values(data.goles)     : [];
    state.tarjetas  = data.tarjetas  ? Object.values(data.tarjetas)  : [];
    state.players   = data.players   ? Object.values(data.players)   : [];

    // Seed solo si está completamente vacío y todavía no se intentó
    if (state.players.length === 0 && !seedDone) {
      seedDone = true;
      seedPlayers();
      return;
    }

    renderAll();
    setStatus('online');
  }, (error) => {
    console.error(error);
    setStatus('offline');
  });
}

async function seedPlayers() {
  state.players = SEED_PLAYERS.map((p, i) => ({
    id: Date.now() + i + Math.random(),
    name: p.name,
    team: p.team,
    position: p.position || "",
    value: 1000,
    lastPuntaje: null,
    lastMVT: false,
    golesTemp: 0
  }));
  await saveKey('players');
  showToast('✓ Jugadores de prueba cargados (todos en $1.000)');
}

// ── HASH ─────────────────────────────────────────────────────────────────
function hashStr(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

// ── STATUS ───────────────────────────────────────────────────────────────
function setStatus(s) {
  const el = document.getElementById('firebase-status');
  if (!el) return;
  el.className = `${s}`;
  el.textContent = s === 'online'  ? '🟢 Firebase Online'
                 : s === 'offline' ? '🔴 Sin conexión'
                 :                   '⏳ Sincronizando...';
}

// ── INIT ─────────────────────────────────────────────────────────────────
async function init() {
  const bar = document.getElementById('loading-bar');
  if (bar) bar.style.display = 'none';
  populateSelects();
  subscribeRealtime();
  await checkInitialOverlay();
}

// ── OVERLAY / LOGIN ───────────────────────────────────────────────────────
async function checkInitialOverlay() {
  const stored = await getPassword();
  const overlay = document.getElementById('lock-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');

  if (!stored) {
    document.getElementById('lock-title').textContent   = 'Crear Contraseña';
    document.getElementById('lock-sub').textContent     = 'Definí la clave de Comisionado';
    document.getElementById('btn-unlock').textContent   = 'ESTABLECER CLAVE';
    document.getElementById('btn-spectator').classList.add('hidden');
  } else {
    document.getElementById('btn-spectator').classList.remove('hidden');
  }
}

async function tryUnlock() {
  const input = document.getElementById('lock-pwd').value;
  const err   = document.getElementById('lock-error');
  const stored = await getPassword();

  if (!stored) {
    if (input.length < 4) { err.textContent = '❌ Mínimo 4 caracteres'; return; }
    await savePassword(hashStr(input));
    document.getElementById('lock-overlay').classList.add('hidden');
    setCommissionerMode(true);
    showToast('✓ Contraseña creada. Sos el Comisionado!');
  } else if (hashStr(input) === stored) {
    document.getElementById('lock-overlay').classList.add('hidden');
    setCommissionerMode(true);
    showToast('✓ Bienvenido, Comisionado');
  } else {
    err.textContent = '❌ Contraseña incorrecta';
    document.getElementById('lock-pwd').value = '';
    document.getElementById('lock-pwd').focus();
  }
}

function enterSpectator() {
  document.getElementById('lock-overlay').classList.add('hidden');
  setCommissionerMode(false);
  showToast('👁️ Modo Espectador Activo');
}

async function promptLogin() {
  if (isCommissioner) {
    setCommissionerMode(false);
    showToast('🔒 Cerraste sesión');
  } else {
    document.getElementById('lock-overlay').classList.remove('hidden');
    document.getElementById('lock-error').textContent = '';
    document.getElementById('lock-pwd').value = '';
    document.getElementById('lock-pwd').focus();
    const stored = await getPassword();
    if (stored) document.getElementById('btn-spectator').classList.remove('hidden');
  }
}

function setCommissionerMode(bool) {
  isCommissioner = bool;
  const badge     = document.getElementById('mode-pill');
  const toggleBtn = document.getElementById('btn-toggle-mode');
  if (bool) {
    document.body.classList.remove('spectator-mode');
    badge.textContent = "COMISIONADO";
    badge.className   = "mode-pill commissioner";
    toggleBtn.textContent = "🔒 Salir";
  } else {
    document.body.classList.add('spectator-mode');
    badge.textContent = "ESPECTADOR";
    badge.className   = "mode-pill spectator";
    toggleBtn.textContent = "🔑 Comisionado";
  }
}

// ── TOAST ─────────────────────────────────────────────────────────────────
function showToast(text) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = text;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ── RENDER ALL ────────────────────────────────────────────────────────────
function renderAll() {
  renderStandings('apertura', 'table-apertura');
  renderStandings('clausura', 'table-clausura');
  renderTablaAnual();
  renderFixture('apertura', FIXTURE_APERTURA, 'fixture-apertura');
  renderFixture('clausura', FIXTURE_CLAUSURA, 'fixture-clausura');
  renderMatchesList('apertura', 'matches-apertura');
  renderMatchesList('clausura', 'matches-clausura');
  renderMatchesCopas();
  renderPichichi();
  renderDisciplina();
  renderMercado();
  populatePlayerSelects();
  // Mostrar planilla con los equipos actuales (no esperar al change)
  renderPlanilla('apertura');
  renderPlanilla('clausura');
}

// ── TABLA DE POSICIONES ───────────────────────────────────────────────────
function calculateTable(torneo) {
  let data = {};
  TEAMS.forEach(t => { data[t] = { p:0, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, dg:0, bonus:0 }; });

  state[torneo].forEach(m => {
    if (!data[m.home] || !data[m.away]) return;
    data[m.home].pj++; data[m.away].pj++;
    data[m.home].gf += m.ghome; data[m.home].gc += m.gaway;
    data[m.away].gf += m.gaway; data[m.away].gc += m.ghome;

    if (m.ghome > m.gaway) {
      data[m.home].pg++; data[m.home].p += 3; data[m.away].pp++;
    } else if (m.ghome < m.gaway) {
      data[m.away].pg++; data[m.away].p += 3; data[m.home].pp++;
    } else {
      data[m.home].pe++; data[m.away].pe++;
      data[m.home].p += 1; data[m.away].p += 1;
    }
  });

  TEAMS.forEach(t => { data[t].dg = data[t].gf - data[t].gc; });

  const totalFechas = torneo === 'apertura' ? FIXTURE_APERTURA.length : FIXTURE_CLAUSURA.length;
  if (state[torneo].length === totalFechas) applyBonus(data);

  let arr = Object.keys(data).map(name => ({ name, ...data[name] }));
  arr.sort((a,b) => b.p - a.p || b.dg - a.dg || b.gf - a.gf || a.name.localeCompare(b.name));
  return arr;
}

function applyBonus(tableData) {
  let sorted = Object.keys(tableData).map(n => ({ name: n, ...tableData[n] }));
  sorted.sort((a,b) => b.p - a.p || b.dg - a.dg || b.gf - a.gf);
  if (sorted[0] && sorted[0].pj > 0) {
    tableData[sorted[0].name].p += 1;
    tableData[sorted[0].name].bonus = 1;
  }
}

function renderStandings(torneo, tableId) {
  const list  = calculateTable(torneo);
  const table = document.getElementById(tableId);
  if (!table) return;
  let html = `
    <thead><tr>
      <th style="width:40px;">Pos</th><th>Equipo</th>
      <th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th>
      <th style="width:60px;">Pts</th>
    </tr></thead><tbody>`;
  list.forEach((t, i) => {
    const dgClass = t.dg > 0 ? 'dg-pos' : (t.dg < 0 ? 'dg-neg' : '');
    const dgSign  = t.dg > 0 ? `+${t.dg}` : t.dg;
    html += `
      <tr class="pos-${i+1}">
        <td><span class="pos-badge">${i+1}</span></td>
        <td>${t.name} ${t.bonus ? '<span class="bonus-badge">+1 BONUS</span>' : ''}</td>
        <td>${t.pj}</td><td>${t.pg}</td><td>${t.pe}</td><td>${t.pp}</td>
        <td>${t.gf}</td><td>${t.gc}</td><td class="${dgClass}">${dgSign}</td>
        <td class="pts-cell">${t.p}</td>
      </tr>`;
  });
  html += '</tbody>';
  table.innerHTML = html;
}

function renderTablaAnual() {
  let annual = {};
  TEAMS.forEach(t => { annual[t] = { p:0, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, dg:0 }; });
  ['apertura', 'clausura'].forEach(torneo => {
    calculateTable(torneo).forEach(t => {
      annual[t.name].p  += t.p;  annual[t.name].pj += t.pj;
      annual[t.name].pg += t.pg; annual[t.name].pe += t.pe;
      annual[t.name].pp += t.pp; annual[t.name].gf += t.gf;
      annual[t.name].gc += t.gc; annual[t.name].dg += t.dg;
    });
  });
  let arr = Object.keys(annual).map(name => ({ name, ...annual[name] }));
  arr.sort((a,b) => b.p - a.p || b.dg - a.dg || b.gf - a.gf || a.name.localeCompare(b.name));

  const table = document.getElementById('table-anual');
  if (!table) return;
  let html = `
    <thead><tr>
      <th style="width:40px;">Pos</th><th>Equipo</th>
      <th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th>
      <th style="width:60px;">Pts Totales</th>
    </tr></thead><tbody>`;
  arr.forEach((t, i) => {
    const dgClass = t.dg > 0 ? 'dg-pos' : (t.dg < 0 ? 'dg-neg' : '');
    const dgSign  = t.dg > 0 ? `+${t.dg}` : t.dg;
    html += `
      <tr class="pos-${i+1}">
        <td><span class="pos-badge">${i+1}</span></td>
        <td><strong>${t.name}</strong></td>
        <td>${t.pj}</td><td>${t.pg}</td><td>${t.pe}</td><td>${t.pp}</td>
        <td>${t.gf}</td><td>${t.gc}</td><td class="${dgClass}">${dgSign}</td>
        <td class="pts-cell" style="color:var(--oro);">${t.p}</td>
      </tr>`;
  });
  html += '</tbody>';
  table.innerHTML = html;
}

// ── FIXTURE ────────────────────────────────────────────────────────────────
function renderFixture(torneo, fixtureArr, gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  let html = '';
  fixtureArr.forEach((f, idx) => {
    const played = state[torneo].find(m =>
      m.fecha.trim().toLowerCase() === f.fecha.trim().toLowerCase() &&
      m.home.trim().toLowerCase()  === f.home.trim().toLowerCase()  &&
      m.away.trim().toLowerCase()  === f.away.trim().toLowerCase()
    );
    const statusHtml = played
      ? `<div class="fixture-status played">JUGADO (${played.ghome} - ${played.gaway})</div>`
      : `<div class="fixture-status">PENDIENTE</div>`;
    html += `
      <div class="fixture-item" onclick="window.selectFixture('${torneo}', ${idx})">
        <div class="fixture-date">${f.fecha}</div>
        <div class="fixture-teams">
          <span>${f.home}</span>
          <span style="color:var(--verde);font-weight:700;">vs</span>
          <span>${f.away}</span>
        </div>
        ${statusHtml}
      </div>`;
  });
  grid.innerHTML = html;
}

window.selectFixture = function(torneo, idx) {
  if (!isCommissioner) { showToast('🔒 Debes ingresar como Comisionado'); return; }
  const fix = torneo === 'apertura' ? FIXTURE_APERTURA[idx] : FIXTURE_CLAUSURA[idx];
  if (torneo === 'apertura') {
    document.getElementById('ap-home').value  = fix.home;
    document.getElementById('ap-away').value  = fix.away;
    document.getElementById('ap-fecha').value = fix.fecha;
    document.getElementById('ap-ghome').focus();
  } else {
    document.getElementById('cl-home').value  = fix.home;
    document.getElementById('cl-away').value  = fix.away;
    document.getElementById('cl-fecha').value = fix.fecha;
    document.getElementById('cl-ghome').focus();
  }
  showToast(`✓ Cargado: ${fix.home} vs ${fix.away}`);
  updateBonusHint(torneo);
  renderPlanilla(torneo);
};

// ── PARTIDOS ───────────────────────────────────────────────────────────────
async function addMatch(torneo) {
  if (!isCommissioner) { showToast('🔒 Solo el Comisionado puede cargar partidos'); return; }
  const pfx   = torneo === 'apertura' ? 'ap' : 'cl';
  const home  = document.getElementById(`${pfx}-home`).value;
  const away  = document.getElementById(`${pfx}-away`).value;
  const ghome = parseInt(document.getElementById(`${pfx}-ghome`).value) || 0;
  const gaway = parseInt(document.getElementById(`${pfx}-gaway`).value) || 0;
  let fecha   = document.getElementById(`${pfx}-fecha`).value.trim();

  if (home === away) { showToast('❌ Un equipo no puede jugar contra sí mismo'); return; }
  if (!fecha) fecha = "Manual";

  const dupIdx = state[torneo].findIndex(m => m.fecha === fecha && m.home === home && m.away === away);
  if (dupIdx !== -1) {
    state[torneo][dupIdx] = { ...state[torneo][dupIdx], ghome, gaway };
    showToast('✓ Partido actualizado');
  } else {
    const matchId = Date.now() + Math.random();
    state[torneo].push({ id: matchId, fecha, home, away, ghome, gaway, planilla: [] });
    showToast('✓ Partido guardado');
  }

  await saveKey(torneo);

  // Procesar planilla de jugadores (Prueba 2)
  const planilla = collectPlanilla(torneo);
  let ratingsApplied = 0;
  if (planilla.length > 0) {
    ratingsApplied = await applyPlanillaRatings(planilla);

    // Guardar resumen de la planilla en el partido (para historial)
    const matchObj = state[torneo].find(m => m.fecha === fecha && m.home === home && m.away === away);
    if (matchObj) {
      matchObj.planilla = planilla.map(e => {
        const p = state.players.find(pl => String(pl.id) === String(e.id));
        return {
          playerId: e.id,
          name: p ? p.name : '?',
          team: p ? p.team : '?',
          goles: e.goles,
          asist: e.asist,
          vl: e.vl,
          mvt: e.esMVT
        };
      });
      await saveKey(torneo);
    }
  }

  triggerFlash(torneo === 'apertura' ? 'table-apertura' : 'table-clausura');
  document.getElementById(`${pfx}-ghome`).value = 0;
  document.getElementById(`${pfx}-gaway`).value = 0;

  // Limpiar y refrescar planilla
  renderPlanilla(torneo);

  if (ratingsApplied > 0) {
    showToast(`✓ Partido + ${ratingsApplied} valoraciones aplicadas`);
    renderMercado();
    renderPichichi();
    populatePlayerSelects();
  }
}

async function removeMatch(torneo, id) {
  if (!isCommissioner) return;
  state[torneo] = state[torneo].filter(m => m.id !== id);
  await saveKey(torneo);
  showToast('✓ Partido eliminado');
}

function renderMatchesList(torneo, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (state[torneo].length === 0) {
    container.innerHTML = '<div class="empty-state">No hay partidos cargados</div>';
    return;
  }
  let html = '';
  state[torneo].forEach(m => {
    let planillaInfo = '';
    if (m.planilla && m.planilla.length > 0) {
      const scorers = m.planilla.filter(p => p.goles > 0).map(p => `${p.name} ${p.goles}`).join(', ');
      const mvt = m.planilla.find(p => p.mvt);
      planillaInfo = '<div style="font-size:11px;color:#888;width:100%;margin-top:2px;">';
      if (scorers) planillaInfo += '⚽ ' + scorers + ' ';
      if (mvt) planillaInfo += '⭐ ' + mvt.name;
      planillaInfo += '</div>';
    }
    html += `
      <div class="match-item" style="flex-wrap:wrap;">
        <div class="teams"><strong>${m.home}</strong> vs <strong>${m.away}</strong>${planillaInfo}</div>
        <div class="score-display">${m.ghome} — ${m.gaway}</div>
        <div class="round-label">${m.fecha}</div>
        <button class="btn-danger" onclick="window.removeMatch('${torneo}', ${m.id})">Borrar</button>
      </div>`;
  });
  container.innerHTML = html;
}

// ── COPAS ──────────────────────────────────────────────────────────────────
async function addCopasMatch() {
  if (!isCommissioner) { showToast('🔒 Solo el Comisionado puede cargar partidos'); return; }
  const torneo = document.getElementById('copa-torneo').value;
  const home   = document.getElementById('copa-home').value;
  const away   = document.getElementById('copa-away').value;
  const ghome  = parseInt(document.getElementById('copa-ghome').value) || 0;
  const gaway  = parseInt(document.getElementById('copa-gaway').value) || 0;
  const nota   = document.getElementById('copa-nota').value.trim();

  if (home === away) { showToast('❌ Cruce inválido'); return; }

  state.copas.push({ id: Date.now(), torneo, home, away, ghome, gaway, nota });
  await saveKey('copas');
  showToast('✓ Copa Actualizada');
}

async function removeCopa(id) {
  if (!isCommissioner) return;
  state.copas = state.copas.filter(c => c.id !== id);
  await saveKey('copas');
  showToast('✓ Registro eliminado');
}

function renderMatchesCopas() {
  const container = document.getElementById('matches-copas');
  if (!container) return;
  if (state.copas.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay cruces de copa cargados</div>';
    return;
  }
  let html = '';
  state.copas.forEach(c => {
    html += `
      <div class="match-item" style="border-left: 3px solid var(--azul);">
        <div class="teams">
          <span style="font-size:11px;display:block;color:var(--azul);width:100%;font-weight:700;">${c.torneo}</span>
          <strong>${c.home}</strong> vs <strong>${c.away}</strong>
          ${c.nota ? `<span style="color:#666;font-size:12px;">(${c.nota})</span>` : ''}
        </div>
        <div class="score-display" style="color:var(--azul);">${c.ghome} — ${c.gaway}</div>
        <button class="btn-danger" onclick="window.removeCopa(${c.id})">Borrar</button>
      </div>`;
  });
  container.innerHTML = html;
}

// ── GOLEADORES ─────────────────────────────────────────────────────────────
async function addGol() {
  if (!isCommissioner) { showToast('🔒 Solo el Comisionado puede registrar goles'); return; }
  const team     = document.getElementById('gol-team').value;
  const jugador  = document.getElementById('gol-jugador').value.trim();
  const cantidad = parseInt(document.getElementById('gol-cantidad').value) || 1;

  if (!jugador) { showToast('❌ Nombre del goleador requerido'); return; }

  const match = state.goles.find(g => g.team === team && g.jugador.toLowerCase() === jugador.toLowerCase());
  if (match) {
    match.goles += cantidad;
  } else {
    state.goles.push({ id: Date.now(), team, jugador, goles: cantidad });
  }

  await saveKey('goles');
  document.getElementById('gol-jugador').value  = '';
  document.getElementById('gol-cantidad').value = 1;
  showToast('✓ Gol anotado');
}

async function removeGol(id) {
  if (!isCommissioner) return;
  state.goles = state.goles.filter(g => g.id !== id);
  await saveKey('goles');
  showToast('✓ Registro eliminado');
}

function renderPichichi() {
  const table = document.getElementById('table-pichichi');
  if (!table) return;
  const arr   = [...state.goles].sort((a,b) => b.goles - a.goles);
  if (arr.length === 0) {
    table.innerHTML = '<tr><td class="empty-state">No hay goles registrados</td></tr>';
    return;
  }
  const maxGoles = arr[0].goles || 1;
  let html = '';
  arr.forEach((g, idx) => {
    const pct = (g.goles / maxGoles) * 100;
    html += `
      <tr>
        <td>#${idx+1}</td>
        <td>
          <div style="font-weight:600;font-size:16px;">${g.jugador}</div>
          <div class="bar-wrap">
            <span style="color:#666;font-size:12px;min-width:80px;">${g.team}</span>
            <div class="bar" style="width:${pct}%;min-width:4px;"></div>
          </div>
        </td>
        <td style="width:120px;text-align:right;">
          <span>${g.goles} ${g.goles === 1 ? 'Gol' : 'Goles'}</span>
          <button class="btn-danger" style="margin-left:8px;" onclick="window.removeGol(${g.id})">X</button>
        </td>
      </tr>`;
  });
  table.innerHTML = html;
}

// ── DISCIPLINA ─────────────────────────────────────────────────────────────
async function addTarjeta() {
  if (!isCommissioner) { showToast('🔒 Solo el Comisionado puede registrar tarjetas'); return; }
  const team    = document.getElementById('disc-team').value;
  const jugador = document.getElementById('disc-jugador').value.trim();
  const tipo    = document.getElementById('disc-tipo').value;

  if (!jugador) { showToast('❌ Nombre del jugador requerido'); return; }

  state.tarjetas.push({ id: Date.now(), team, jugador, tipo });
  await saveKey('tarjetas');
  document.getElementById('disc-jugador').value = '';
  showToast('✓ Tarjeta Registrada');
}

async function removeTarjeta(id) {
  if (!isCommissioner) return;
  state.tarjetas = state.tarjetas.filter(t => t.id !== id);
  await saveKey('tarjetas');
  showToast('✓ Tarjeta Removida');
}

function renderDisciplina() {
  const tbody = document.getElementById('table-disciplina');
  if (!tbody) return;
  if (state.tarjetas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Limpio · Sin amonestaciones</td></tr>';
    return;
  }
  let html = '';
  state.tarjetas.forEach(t => {
    const badge = t.tipo === 'AMARILLA'
      ? '<span class="card-amarilla">🟨 AMARILLA</span>'
      : '<span class="card-roja">🟥 ROJA DIRECTA</span>';
    html += `
      <tr>
        <td style="font-weight:600;">${t.team}</td>
        <td>${t.jugador}</td>
        <td>${badge}</td>
        <td><button class="btn-danger" onclick="window.removeTarjeta(${t.id})">Quitar</button></td>
      </tr>`;
  });
  tbody.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── MERCADO DE PASES (PRUEBA 1.1) ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function formatAlfajores(coins) {
  if (coins < 1000) return "Menos de 1 Alfajor";
  const simples = Math.floor(coins / 1000);
  const resto = coins % 1000;
  let txt = `${simples} Alfajor${simples !== 1 ? 'es' : ''} Simple`;
  if (resto >= 500) txt += " + medio";
  return txt;
}

function formatCoins(n) {
  return "$" + Number(n).toLocaleString("es-AR");
}

// Calcula goles totales del jugador desde la tabla de goleadores
function getPlayerGoals(name, team) {
  const entry = state.goles.find(g =>
    g.jugador.toLowerCase() === name.toLowerCase() && g.team === team
  );
  return entry ? entry.goles : 0;
}

async function addPlayer() {
  if (!isCommissioner) { showToast('🔒 Solo el Comisionado puede agregar jugadores'); return; }

  const nameEl = document.getElementById('player-name');
  const teamEl = document.getElementById('player-team');
  const posEl  = document.getElementById('player-pos');

  const name = (nameEl.value || "").trim();
  const team = teamEl.value;
  const pos  = (posEl.value || "").trim();

  if (!name) { showToast('❌ Nombre requerido'); return; }

  // Evitar duplicados
  if (state.players.some(p => p.name.toLowerCase() === name.toLowerCase() && p.team === team)) {
    showToast('❌ Ese jugador ya existe en ese equipo'); return;
  }

  const newPlayer = {
    id: Date.now() + Math.random(),
    name,
    team,
    position: pos,
    value: 1000,
    lastPuntaje: null,
    lastMVT: false
  };

  state.players.push(newPlayer);
  await saveKey('players');

  // Actualización inmediata de UI (no esperar solo al listener)
  populatePlayerSelects();
  renderMercado();

  nameEl.value = '';
  posEl.value = '';
  showToast(`✓ ${name} agregado · Valor inicial $1.000`);
}

async function addRating() {
  if (!isCommissioner) { showToast('🔒 Solo el Comisionado puede cargar rendimientos'); return; }

  const playerId = document.getElementById('rating-player').value;
  const puntaje  = parseFloat(document.getElementById('rating-puntaje').value);
  const goles    = parseInt(document.getElementById('rating-goles').value) || 0;
  const asist    = parseInt(document.getElementById('rating-asist').value) || 0;
  const esMVT    = document.getElementById('rating-mvt').checked;

  if (!playerId) { showToast('❌ Elegí un jugador'); return; }
  if (isNaN(puntaje) || puntaje < 0 || puntaje > 10) {
    showToast('❌ Puntaje debe ser entre 0 y 10'); return;
  }

  const player = state.players.find(p => String(p.id) === String(playerId));
  if (!player) { showToast('❌ Jugador no encontrado'); return; }

  // ── Cálculo de cotización ──
  const delta = Math.round((Number(puntaje) - 6) * 1000);
  const bonus = esMVT ? 500 : 0;
  const oldValue = Number(player.value) || 1000;

  player.value = Math.max(1000, oldValue + delta + bonus);
  player.lastPuntaje = Number(puntaje);
  player.lastMVT = !!esMVT;

  // ── Actualizar tabla de Goleadores si hubo goles ──
  if (goles > 0) {
    const existing = state.goles.find(g =>
      g.team === player.team && g.jugador.toLowerCase() === player.name.toLowerCase()
    );
    if (existing) {
      existing.goles += goles;
    } else {
      state.goles.push({
        id: Date.now(),
        team: player.team,
        jugador: player.name,
        goles: goles
      });
    }
    await saveKey('goles');
  }

  await saveKey('players');

  // UI inmediata
  populatePlayerSelects();
  renderMercado();
  renderPichichi();

  const change = player.value - oldValue;
  const sign = change >= 0 ? '+' : '';
  let msg = `✓ ${player.name}: ${formatCoins(oldValue)} → ${formatCoins(player.value)} (${sign}${formatCoins(change)})`;
  if (goles > 0) msg += ` · ${goles} gol${goles > 1 ? 'es' : ''}`;
  if (esMVT) msg += ' · MVT';
  showToast(msg);

  // Reset form
  document.getElementById('rating-puntaje').value = 6;
  document.getElementById('rating-goles').value = 0;
  document.getElementById('rating-asist').value = 0;
  document.getElementById('rating-mvt').checked = false;
}

function renderMercado() {
  const tbody = document.getElementById('tbody-mercado');
  if (!tbody) return;

  if (!state.players || state.players.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay jugadores cargados</td></tr>';
    return;
  }

  const sorted = [...state.players].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  let html = '';
  sorted.forEach((p, i) => {
    let ratingClass = 'mid';
    if (p.lastPuntaje !== null && p.lastPuntaje !== undefined) {
      if (p.lastPuntaje >= 7.5) ratingClass = 'high';
      else if (p.lastPuntaje < 5) ratingClass = 'low';
    }

    const lastTxt = (p.lastPuntaje !== null && p.lastPuntaje !== undefined)
      ? `<span class="last-rating ${ratingClass}">${Number(p.lastPuntaje).toFixed(2)}</span>${p.lastMVT ? '<span class="mvt-badge">MVT</span>' : ''}`
      : '<span style="color:#555;">—</span>';

    const golesJugador = getPlayerGoals(p.name, p.team);

    html += `
      <tr class="pos-${i+1}">
        <td><span class="pos-badge">${i+1}</span></td>
        <td>
          <strong>${p.name}</strong>
          ${p.position ? `<div style="font-size:11px;color:#666;">${p.position}</div>` : ''}
        </td>
        <td style="font-size:13px;color:#aaa;">${p.team}</td>
        <td>${lastTxt}</td>
        <td style="font-family:'Bebas Neue',sans-serif;font-size:16px;color:var(--verde);">${golesJugador || '—'}</td>
        <td class="value-coins">${formatCoins(p.value)}</td>
        <td class="value-alfajor">${formatAlfajores(p.value)}</td>
      </tr>`;
  });
  tbody.innerHTML = html;
}

function populatePlayerSelects() {
  const sel = document.getElementById('rating-player');
  if (!sel) return;

  const current = sel.value;
  sel.innerHTML = '<option value="">— Elegir jugador —</option>';

  if (!state.players || state.players.length === 0) return;

  const sorted = [...state.players].sort((a, b) => a.name.localeCompare(b.name));
  sorted.forEach(p => {
    const opt = document.createElement('option');
    opt.value = String(p.id);
    opt.textContent = `${p.name} (${p.team}) · ${formatCoins(p.value)}`;
    sel.appendChild(opt);
  });

  // Intentar mantener la selección anterior si sigue existiendo
  if (current) {
    const stillExists = sorted.some(p => String(p.id) === String(current));
    if (stillExists) sel.value = current;
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// ── PLANILLA POST-PARTIDO (PRUEBA 2) ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function renderPlanilla(torneo) {
  const pfx = torneo === 'apertura' ? 'ap' : 'cl';
  const home = document.getElementById(`${pfx}-home`)?.value;
  const away = document.getElementById(`${pfx}-away`)?.value;
  const section = document.getElementById(`planilla-${torneo}`);
  const body = document.getElementById(`planilla-${torneo}-body`);
  if (!section || !body) return;

  if (!home || !away || home === away) {
    section.classList.add('hidden');
    body.innerHTML = '';
    return;
  }

  section.classList.remove('hidden');

  const homePlayers = state.players.filter(p => p.team === home);
  const awayPlayers = state.players.filter(p => p.team === away);

  let html = '';

  // Header
  html += `<div class="planilla-row planilla-header">
    <div>Jugador</div><div>G</div><div>A</div><div>VL</div><div>MVT</div>
  </div>`;

  function rowsFor(players, teamLabel) {
    let h = `<div class="planilla-team-title">${teamLabel}</div>`;
    if (players.length === 0) {
      h += `<div class="planilla-empty">No hay jugadores cargados en este equipo. Agregalos en Mercado.</div>`;
      return h;
    }
    players.forEach(p => {
      h += `<div class="planilla-row" data-player-id="${p.id}">
        <div>
          <div class="planilla-player-name">${p.name}</div>
          ${p.position ? `<div class="planilla-player-pos">${p.position}</div>` : ''}
        </div>
        <input type="number" class="pl-goles" min="0" value="0" data-id="${p.id}">
        <input type="number" class="pl-asist" min="0" value="0" data-id="${p.id}">
        <input type="number" class="pl-vl" min="0" max="10" step="0.25" placeholder="—" data-id="${p.id}">
        <input type="radio" name="mvt-${torneo}" class="pl-mvt" value="${p.id}">
      </div>`;
    });
    return h;
  }

  html += rowsFor(homePlayers, `🏠 ${home}`);
  html += rowsFor(awayPlayers, `✈️ ${away}`);

  body.innerHTML = html;
}


function collectPlanilla(torneo) {
  const body = document.getElementById(`planilla-${torneo}-body`);
  if (!body) {
    console.warn('No planilla body for', torneo);
    return [];
  }

  const rows = body.querySelectorAll('.planilla-row[data-player-id]');
  const mvtRadio = body.querySelector(`input[name="mvt-${torneo}"]:checked`);
  const mvtId = mvtRadio ? String(mvtRadio.value) : null;

  const results = [];
  rows.forEach(row => {
    const id = String(row.getAttribute('data-player-id'));
    const golesInput = row.querySelector('.pl-goles');
    const asistInput = row.querySelector('.pl-asist');
    const vlInput = row.querySelector('.pl-vl');

    const goles = parseInt(golesInput?.value, 10) || 0;
    const asist = parseInt(asistInput?.value, 10) || 0;
    const vlStr = (vlInput?.value || '').trim();
    const vl = vlStr === '' ? null : parseFloat(vlStr);
    const esMVT = (mvtId !== null && id === mvtId);

    if (vl !== null || goles > 0 || asist > 0 || esMVT) {
      results.push({ id, goles, asist, vl, esMVT });
    }
  });

  console.log('Planilla recolectada:', results);
  return results;
}

async function applyPlanillaRatings(entries) {
  if (!entries || entries.length === 0) return 0;

  let changed = 0;
  let golesChanged = false;
  const log = [];

  for (const e of entries) {
    const player = state.players.find(p => String(p.id) === String(e.id));
    if (!player) {
      console.warn('No se encontró jugador id=', e.id, 'players=', state.players.map(p => p.id));
      continue;
    }

    // Cotización
    if (e.vl !== null && !isNaN(e.vl)) {
      const delta = Math.round((Number(e.vl) - 6) * 1000);
      const bonus = e.esMVT ? 500 : 0;
      const oldVal = Number(player.value) || 1000;
      const newVal = Math.max(1000, oldVal + delta + bonus);
      player.value = newVal;
      player.lastPuntaje = Number(e.vl);
      player.lastMVT = !!e.esMVT;
      changed++;
      log.push(`${player.name}: $${oldVal} → $${newVal} (VL ${e.vl}${e.esMVT ? ' +MVT' : ''})`);
    } else if (e.esMVT) {
      const oldVal = Number(player.value) || 1000;
      player.value = Math.max(1000, oldVal + 500);
      player.lastMVT = true;
      changed++;
      log.push(`${player.name}: +$500 MVT`);
    }

    // Goles → tabla de goleadores
    if (e.goles > 0) {
      const existing = state.goles.find(g =>
        g.team === player.team &&
        String(g.jugador).toLowerCase() === String(player.name).toLowerCase()
      );
      if (existing) {
        existing.goles = (Number(existing.goles) || 0) + e.goles;
      } else {
        state.goles.push({
          id: Date.now() + Math.random(),
          team: player.team,
          jugador: player.name,
          goles: e.goles
        });
      }
      golesChanged = true;
      log.push(`${player.name}: +${e.goles} gol(es)`);
    }
  }

  // Guardar SIEMPRE si hubo cambios
  if (changed > 0) {
    await saveKey('players');
  }
  if (golesChanged) {
    await saveKey('goles');
  }

  console.log('Aplicado:', log);
  if (log.length) {
    showToast('✓ ' + log.slice(0, 2).join(' · ') + (log.length > 2 ? '...' : ''));
  }
  return changed + (golesChanged ? 1 : 0);
}

// ── BONUS HINT ─────────────────────────────────────────────────────────────
function updateBonusHint(torneo) {
  const hint = document.getElementById(torneo === 'apertura' ? 'bonus-hint' : 'cl-bonus-hint');
  if (!hint) return;
  const count = state[torneo].length;
  const total = torneo === 'apertura' ? FIXTURE_APERTURA.length : FIXTURE_CLAUSURA.length;
  hint.textContent = count === total - 1 ? '¡Próximo partido define +1 Punto Bonus al puntero!'
                   : count === total     ? 'Torneo finalizado (Bonus ya inyectado)'
                   :                       'No aplica (se activa en la última fecha)';
}

// ── FLASH ──────────────────────────────────────────────────────────────────
function triggerFlash(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('flash-updated');
    setTimeout(() => el.classList.remove('flash-updated'), 1500);
  }
}

// ── SELECTS ────────────────────────────────────────────────────────────────
function populateSelects() {
  ['ap-home','ap-away','cl-home','cl-away','copa-home','copa-away','gol-team','disc-team','player-team'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    TEAMS.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      sel.appendChild(opt);
    });
  });
  if (document.getElementById('ap-away'))   document.getElementById('ap-away').selectedIndex   = 1;
  if (document.getElementById('cl-away'))   document.getElementById('cl-away').selectedIndex   = 1;
  if (document.getElementById('copa-away')) document.getElementById('copa-away').selectedIndex = 1;
}

// ── TABS ───────────────────────────────────────────────────────────────────
function showTab(tabName, btnEl) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));
  const tab = document.getElementById(`tab-${tabName}`);
  if (tab) tab.classList.add('active');
  if (btnEl) btnEl.classList.add('active');
  // Al entrar a Apertura/Clausura, refrescar planilla
  if (tabName === 'apertura' || tabName === 'clausura') {
    renderPlanilla(tabName);
  }
}

// ── EXPONER AL DOM ─────────────────────────────────────────────────────────
window.showTab        = showTab;
window.removeMatch    = removeMatch;
window.removeCopa     = removeCopa;
window.removeGol      = removeGol;
window.removeTarjeta  = removeTarjeta;
window.tryUnlock      = tryUnlock;
window.enterSpectator = enterSpectator;
window.promptLogin    = promptLogin;

// ── EVENT LISTENERS ────────────────────────────────────────────────────────
document.getElementById('btn-tab-apertura').addEventListener('click',  e => showTab('apertura',  e.target));
document.getElementById('btn-tab-clausura').addEventListener('click',  e => showTab('clausura',  e.target));
document.getElementById('btn-tab-anual').addEventListener('click',     e => showTab('anual',     e.target));
document.getElementById('btn-tab-copas').addEventListener('click',     e => showTab('copas',     e.target));
document.getElementById('btn-tab-pichichi').addEventListener('click',  e => showTab('pichichi',  e.target));
document.getElementById('btn-tab-disciplina').addEventListener('click',e => showTab('disciplina',e.target));
document.getElementById('btn-tab-mercado').addEventListener('click',   e => showTab('mercado',   e.target));

document.getElementById('btn-toggle-mode').addEventListener('click',  promptLogin);
document.getElementById('btn-add-apertura').addEventListener('click', () => addMatch('apertura'));
document.getElementById('btn-add-clausura').addEventListener('click', () => addMatch('clausura'));

// Planilla: actualizar cuando cambian los equipos
['ap-home','ap-away'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', () => renderPlanilla('apertura'));
});
['cl-home','cl-away'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', () => renderPlanilla('clausura'));
});
document.getElementById('btn-add-copa').addEventListener('click',     addCopasMatch);
document.getElementById('btn-add-gol').addEventListener('click',      addGol);
document.getElementById('btn-add-tarjeta').addEventListener('click',  addTarjeta);
document.getElementById('btn-unlock').addEventListener('click',       tryUnlock);
document.getElementById('btn-spectator').addEventListener('click',    enterSpectator);
document.getElementById('lock-pwd').addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });

// Mercado
document.getElementById('btn-add-player').addEventListener('click', addPlayer);
// btn-add-rating removed (planilla replaces it)

// ── ARRANCAR ───────────────────────────────────────────────────────────────
init();
