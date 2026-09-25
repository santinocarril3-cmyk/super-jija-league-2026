import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  import { getDatabase, ref, set, onValue, get }
                                    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
  import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
                                    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

  // Email de la cuenta de Comisionado que creaste en Firebase Auth → Usuarios.
  // Cambialo por el email real que usaste al crear ese usuario.
  const COMMISSIONER_EMAIL = "santinocarril3@gmail.com";

  const app      = initializeApp(firebaseConfig);
  const database = getDatabase(app);
  const auth     = getAuth(app);

  // ── EQUIPOS Y FIXTURES ───────────────────────────────────────────────────
  const TEAMS = ["All Stars", "Real Envido", "4to Régimen", "Dou FC"];

  // Plantillas por defecto — se usan UNA sola vez para "sembrar" Firebase la
  // primera vez que el Comisionado entra y todavía no hay datos guardados.
  // Una vez migrado, la fuente de verdad pasa a ser Firebase (state.jugadores),
  // no esta constante.
  const DEFAULT_PLAYERS_SEED = {
    "All Stars": [
      { nombre: "Lautaro Iansen",   numero: 1,  posicion: "Arquero" },
      { nombre: "Santino Carril",   numero: 8,  posicion: "Defensor" },
      { nombre: "Nahuel Coronel",   numero: null, posicion: "Defensor" },
      { nombre: "Facundo Rodolao",  numero: 67, posicion: "Mediocampista" },
      { nombre: "Gonzalo Zaldivar", numero: 10, posicion: "Delantero" },
      { nombre: "Tomás Sequeira",   numero: 7,  posicion: "Delantero" }
    ],
    "4to Régimen": [
      { nombre: "Ian Lisniksuk",   numero: 1,  posicion: "Arquero" },
      { nombre: "Ulises",         numero: null, posicion: "Defensor" },
      { nombre: "Lautaro Galgo",   numero: 8,  posicion: "Mediocampista" },
      { nombre: "Osiris",         numero: 10, posicion: "Mediocampista" },
      { nombre: "Bautista Bruno",  numero: 4,  posicion: "Mediocampista" },
      { nombre: "Leron Galli",     numero: 9,  posicion: "Delantero" }
    ],
    "Real Envido": [
      { nombre: "Martín",           numero: 1, posicion: "Arquero" },
      { nombre: "Pablo",            numero: 4, posicion: "Defensor" },
      { nombre: "Joaquín \"Porky\"", numero: 6, posicion: "Defensor" },
      { nombre: "Yair",             numero: 7, posicion: "Mediocampista" },
      { nombre: "Fran",             numero: 10, posicion: "Mediocampista" },
      { nombre: "Iván",             numero: 9, posicion: "Delantero" }
    ],
    "Dou FC": [
      { nombre: "Quichu",   numero: 1,  posicion: "Arquero" },
      { nombre: "Facundo 2", numero: 6, posicion: "Defensor" },
      { nombre: "Puma",     numero: 14, posicion: "Mediocampista" },
      { nombre: "Veizaga",  numero: 10, posicion: "Delantero" }
    ]
  };

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
    { fecha: "Fecha 2", home: "4to Régimen", away: "Real Envido" },
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

  // ── ESTADO LOCAL (espejo del snapshot de Firebase) ───────────────────────
  let state = { apertura: [], clausura: [], copas: [], goles: [], tarjetas: [], jugadores: {} };
  let isCommissioner = false;

  // ── HELPERS FIREBASE ─────────────────────────────────────────────────────

  // Guarda una clave del state en Firebase
  async function saveKey(key) {
    setStatus('syncing');
    await set(ref(database, `jija2026/${key}`), state[key]);
    setStatus('online');
  }

  // ── LISTENER EN TIEMPO REAL ──────────────────────────────────────────────
  // Cada vez que cualquier otro usuario guarda algo, todos ven la actualización
  function subscribeRealtime() {
    onValue(ref(database, 'jija2026'), (snapshot) => {
      const data = snapshot.val() || {};
      state.apertura  = data.apertura  ? Object.values(data.apertura)  : [];
      state.clausura  = data.clausura  ? Object.values(data.clausura)  : [];
      state.copas     = data.copas     ? Object.values(data.copas)     : [];
      state.goles     = data.goles     ? Object.values(data.goles)     : [];
      state.tarjetas  = data.tarjetas  ? Object.values(data.tarjetas)  : [];
      state.jugadores = data.jugadores || {};
      renderAll();
      setStatus('online');
    }, (error) => {
      console.error(error);
      setStatus('offline');
    });
  }

  // ── STATUS INDICATOR ─────────────────────────────────────────────────────
  function setStatus(s) {
    const el = document.getElementById('firebase-status');
    el.className = `${s}`;
    el.textContent = s === 'online'  ? '🟢 Firebase Online'
                   : s === 'offline' ? '🔴 Sin conexión'
                   :                   '⏳ Sincronizando...';
  }

  // ── INIT ─────────────────────────────────────────────────────────────────
  async function init() {
    document.getElementById('loading-bar').style.display = 'none';
    populateSelects();
    subscribeRealtime();       // activa listener en tiempo real

    // Reacciona a cambios reales de sesión (login/logout, o refresco de página
    // con sesión ya persistida por Firebase Auth)
    onAuthStateChanged(auth, (user) => {
      const isComm = !!user && user.email === COMMISSIONER_EMAIL;
      setCommissionerMode(isComm);
      if (isComm) migrarJugadoresSiHaceFalta();
    });

    document.getElementById('lock-overlay').classList.remove('hidden');
    document.getElementById('btn-spectator').classList.remove('hidden');
  }

  // ── OVERLAY / LOGIN ───────────────────────────────────────────────────────
  async function tryUnlock() {
    const pwd = document.getElementById('lock-pwd').value.trim();
    const err = document.getElementById('lock-error');

    if (!pwd) { err.textContent = '❌ Ingresá la contraseña'; return; }

    try {
      await signInWithEmailAndPassword(auth, COMMISSIONER_EMAIL, pwd);
      document.getElementById('lock-overlay').classList.add('hidden');
      document.getElementById('lock-pwd').value = '';
      showToast('✓ Bienvenido, Comisionado');
      // setCommissionerMode se dispara solo vía onAuthStateChanged
    } catch (e) {
      err.textContent = '❌ Contraseña incorrecta';
      document.getElementById('lock-pwd').value = '';
      document.getElementById('lock-pwd').focus();
    }
  }

  function enterSpectator() {
    document.getElementById('lock-overlay').classList.add('hidden');
    showToast('👁️ Modo Espectador Activo');
  }

  async function promptLogin() {
    if (isCommissioner) {
      await signOut(auth);
      showToast('🔒 Cerraste sesión');
      // setCommissionerMode(false) se dispara solo vía onAuthStateChanged
    } else {
      document.getElementById('lock-overlay').classList.remove('hidden');
      document.getElementById('lock-error').textContent = '';
      document.getElementById('lock-pwd').value = '';
      document.getElementById('lock-pwd').focus();
      document.getElementById('btn-spectator').classList.remove('hidden');
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
    t.textContent = text;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
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
    renderNoticias();
    renderPlantillas();
    populateJugadorSelect('gol-team',  'gol-jugador');
    populateJugadorSelect('disc-team', 'disc-jugador');
  }

  // ── TABLA DE POSICIONES ───────────────────────────────────────────────────
  function calculateTable(torneo) {
    let data = {};
    TEAMS.forEach(t => { data[t] = { p:0, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, dg:0 }; });

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

    let arr = Object.keys(data).map(name => ({ name, ...data[name] }));
    arr.sort((a,b) => b.p - a.p || b.dg - a.dg || b.gf - a.gf || a.name.localeCompare(b.name));
    return arr;
  }

  function renderStandings(torneo, tableId) {
    const list  = calculateTable(torneo);
    const table = document.getElementById(tableId);
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
          <td>${t.name}</td>
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
      state[torneo].push({ id: Date.now() + Math.random(), fecha, home, away, ghome, gaway });
      showToast('✓ Partido guardado');
    }

    await saveKey(torneo);
    triggerFlash(torneo === 'apertura' ? 'table-apertura' : 'table-clausura');
    document.getElementById(`${pfx}-ghome`).value = 0;
    document.getElementById(`${pfx}-gaway`).value = 0;
  }

  async function removeMatch(torneo, id) {
    if (!isCommissioner) return;
    state[torneo] = state[torneo].filter(m => m.id !== id);
    await saveKey(torneo);
    showToast('✓ Partido eliminado');
  }

  function renderMatchesList(torneo, containerId) {
    const container = document.getElementById(containerId);
    if (state[torneo].length === 0) {
      container.innerHTML = '<div class="empty-state">No hay partidos cargados</div>';
      return;
    }
    let html = '';
    state[torneo].forEach(m => {
      html += `
        <div class="match-item" onclick="window.abrirFicha('${torneo}', ${m.id})">
          <div class="teams"><strong>${m.home}</strong> vs <strong>${m.away}</strong></div>
          <div class="score-display">${m.ghome} — ${m.gaway}</div>
          <div class="round-label">${m.fecha}</div>
          <button class="btn-danger" onclick="event.stopPropagation(); window.removeMatch('${torneo}', ${m.id})">Borrar</button>
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
    if (state.copas.length === 0) {
      container.innerHTML = '<div class="empty-state">No hay cruces de copa cargados</div>';
      return;
    }
    let html = '';
    state.copas.forEach(c => {
      html += `
        <div class="match-item" style="border-left: 3px solid var(--azul);" onclick="window.abrirFicha('copas', ${c.id})">
          <div class="teams">
            <span style="font-size:11px;display:block;color:var(--azul);width:100%;font-weight:700;">${c.torneo}</span>
            <strong>${c.home}</strong> vs <strong>${c.away}</strong>
            ${c.nota ? `<span style="color:#666;font-size:12px;">(${c.nota})</span>` : ''}
          </div>
          <div class="score-display" style="color:var(--azul);">${c.ghome} — ${c.gaway}</div>
          <button class="btn-danger" onclick="event.stopPropagation(); window.removeCopa(${c.id})">Borrar</button>
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
    const arr   = calcularGoleadores().sort((a,b) => b.goles - a.goles);
    if (arr.length === 0) {
      table.innerHTML = '<tr><td class="empty-state">No hay goles registrados</td></tr>';
      return;
    }
    const maxGoles = arr[0].goles || 1;
    let html = '';
    arr.forEach((g, idx) => {
      const pct = (g.goles / maxGoles) * 100;
      // El botón de borrar solo aparece si ese total viene (al menos en parte)
      // de una carga manual en esta pestaña. Si viene 100% de fichas de
      // partido, se corrige editando la ficha correspondiente, no acá.
      const btnBorrar = g.manualId != null
        ? `<button class="btn-danger" style="margin-left:8px;" onclick="window.removeGol(${g.manualId})">X</button>`
        : '';
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
            ${btnBorrar}
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

  // ── FLASH ANIMATION ────────────────────────────────────────────────────────
  function triggerFlash(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('flash-updated'); setTimeout(() => el.classList.remove('flash-updated'), 1500); }
  }

  // ── SELECTS ────────────────────────────────────────────────────────────────
  function populateSelects() {
    ['ap-home','ap-away','cl-home','cl-away','copa-home','copa-away','gol-team','disc-team','nuevo-jugador-team'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '';
      TEAMS.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t; opt.textContent = t;
        sel.appendChild(opt);
      });
    });
    if (document.getElementById('ap-away'))   document.getElementById('ap-away').selectedIndex   = 1;
    if (document.getElementById('cl-away'))   document.getElementById('cl-away').selectedIndex   = 1;
    if (document.getElementById('copa-away')) document.getElementById('copa-away').selectedIndex = 1;

    // Llena los desplegables de jugador según el equipo elegido por defecto
    populateJugadorSelect('gol-team',  'gol-jugador');
    populateJugadorSelect('disc-team', 'disc-jugador');
  }

  // Llena un <select> de jugadores según el equipo actualmente elegido en
  // otro <select>. Se llama al cargar la página y cada vez que se cambia
  // de equipo (evento 'change'), y también cada vez que llega un snapshot
  // nuevo de Firebase (por si el Comisionado agregó un jugador).
  function populateJugadorSelect(teamSelectId, jugadorSelectId) {
    const teamSel    = document.getElementById(teamSelectId);
    const jugadorSel = document.getElementById(jugadorSelectId);
    if (!teamSel || !jugadorSel) return;

    const equipo    = teamSel.value;
    const plantilla = state.jugadores[equipo] || [];
    const previo    = jugadorSel.value; // intenta conservar la selección actual

    jugadorSel.innerHTML = '';
    plantilla.forEach(j => {
      const opt = document.createElement('option');
      opt.value = j.nombre;
      opt.textContent = j.numero ? `#${j.numero} ${j.nombre}` : j.nombre;
      jugadorSel.appendChild(opt);
    });
    if (plantilla.some(j => j.nombre === previo)) jugadorSel.value = previo;
  }

  // ── PLANTILLAS (guardadas en Firebase: jija2026/jugadores) ─────────────────

  // La primera vez que el Comisionado entra y Firebase todavía no tiene
  // ningún jugador guardado, copiamos ahí la plantilla de arranque. De ahí
  // en más, Firebase es la única fuente de verdad — esta semilla no se
  // vuelve a usar.
  async function migrarJugadoresSiHaceFalta() {
    const yaHayDatos = Object.keys(state.jugadores || {}).length > 0;
    if (yaHayDatos) return;

    const conIds = {};
    Object.keys(DEFAULT_PLAYERS_SEED).forEach(team => {
      conIds[team] = DEFAULT_PLAYERS_SEED[team].map((j, i) => ({
        id: Date.now() + i,
        ...j
      }));
    });
    state.jugadores = conIds;
    await saveKey('jugadores');
    showToast('✓ Plantillas migradas a Firebase');
  }

  function renderPlantillas() {
    const container = document.getElementById('plantillas-grid');
    if (!container) return;
    const ordenPos = { "Arquero": 0, "Defensor": 1, "Mediocampista": 2, "Delantero": 3 };

    let html = '';
    TEAMS.forEach(team => {
      const plantilla = [...(state.jugadores[team] || [])]
        .sort((a, b) => ordenPos[a.posicion] - ordenPos[b.posicion]);

      html += `<div class="plantilla-card">
        <h3>${team}</h3>
        <div class="plantilla-list">`;
      if (plantilla.length === 0) {
        html += `<div class="empty-state" style="padding:10px 0;">Sin jugadores cargados</div>`;
      }
      plantilla.forEach(j => {
        html += `
          <div class="plantilla-jugador">
            <span class="plantilla-num">${j.numero ?? '–'}</span>
            <span class="plantilla-nombre">${j.nombre}</span>
            <span class="plantilla-pos">${j.posicion}</span>
            <button class="btn-danger btn-del-jugador" data-team="${team}" data-id="${j.id}">✕</button>
          </div>`;
      });
      html += `</div></div>`;
    });
    container.innerHTML = html;

    // Los botones se recrean en cada render, así que hay que reengancharles
    // el evento cada vez (si no, el click no hace nada).
    container.querySelectorAll('.btn-del-jugador').forEach(btn => {
      btn.addEventListener('click', () => eliminarJugador(btn.dataset.team, Number(btn.dataset.id)));
    });
  }

  async function agregarJugador() {
    if (!isCommissioner) { showToast('🔒 Solo el Comisionado puede editar plantillas'); return; }

    const team     = document.getElementById('nuevo-jugador-team').value;
    const nombre   = document.getElementById('nuevo-jugador-nombre').value.trim();
    const numeroEl = document.getElementById('nuevo-jugador-numero').value;
    const numero   = numeroEl ? Number(numeroEl) : null;
    const posicion = document.getElementById('nuevo-jugador-posicion').value;

    if (!nombre) { showToast('❌ Ingresá el nombre del jugador'); return; }

    const plantillaActual = state.jugadores[team] || [];
    if (plantillaActual.length >= 7) {
      showToast('❌ Ese equipo ya tiene el máximo de 7 jugadores');
      return;
    }

    if (!state.jugadores[team]) state.jugadores[team] = [];
    state.jugadores[team].push({ id: Date.now(), nombre, numero, posicion });

    await saveKey('jugadores');
    document.getElementById('nuevo-jugador-nombre').value = '';
    document.getElementById('nuevo-jugador-numero').value = '';
    showToast(`✓ ${nombre} agregado a ${team}`);
  }

  async function eliminarJugador(team, id) {
    if (!isCommissioner) return;
    if (!confirm('¿Seguro que querés sacar a este jugador de la plantilla?')) return;

    state.jugadores[team] = (state.jugadores[team] || []).filter(j => j.id !== id);
    await saveKey('jugadores');
    showToast('🗑️ Jugador eliminado');
  }

  // ── NOTICIAS (generadas automáticamente a partir de los resultados) ────────
  // Título de ejemplo esperado: "🔥 4to Régimen goleó a Dou FC por 5-1 en Fecha 3"

  // Paso 1: junta partidos de Apertura, Clausura y Copas en una sola lista
  // "normalizada" -- o sea, con la misma forma {home, away, ghome, gaway, ...}
  // aunque vengan de fuentes distintas. Esto evita repetir código 3 veces.
  function recolectarPartidosJugados() {
    const apertura = state.apertura.map(m => ({ ...m, competencia: 'Apertura', _torneoKey: 'apertura' }));
    const clausura = state.clausura.map(m => ({ ...m, competencia: 'Clausura', _torneoKey: 'clausura' }));
    const copas    = state.copas.map(c => ({ ...c, competencia: c.torneo, fecha: c.torneo, _torneoKey: 'copas' }));
    return [...apertura, ...clausura, ...copas];
  }

  // Paso 2: arma el titular según la diferencia de gol. Este if/else es el
  // corazón de la "redacción" automática de la noticia.
  function generarTitular(m) {
    const dif = Math.abs(m.ghome - m.gaway);
    const [ganador, perdedor, gGanador, gPerdedor] = m.ghome > m.gaway
      ? [m.home, m.away, m.ghome, m.gaway]
      : [m.away, m.home, m.gaway, m.ghome];

    if (m.ghome === m.gaway) {
      return {
        tipo: 'empate',
        titular: `🤝 Empate entre ${m.home} y ${m.away}`,
        sub: `${m.ghome} - ${m.gaway} · ${m.competencia}${m.fecha && m.fecha !== m.competencia ? ' · ' + m.fecha : ''}`
      };
    }
    if (dif >= 3) {
      return {
        tipo: 'gol',
        titular: `🔥 Goleada de ${ganador} ante ${perdedor}`,
        sub: `${gGanador} - ${gPerdedor} · ${m.competencia}${m.fecha && m.fecha !== m.competencia ? ' · ' + m.fecha : ''}`
      };
    }
    if (dif === 1) {
      return {
        tipo: 'normal',
        titular: `😅 ${ganador} se impuso sobre la hora ante ${perdedor}`,
        sub: `${gGanador} - ${gPerdedor} · ${m.competencia}${m.fecha && m.fecha !== m.competencia ? ' · ' + m.fecha : ''}`
      };
    }
    return {
      tipo: 'normal',
      titular: `⚽ ${ganador} venció a ${perdedor}`,
      sub: `${gGanador} - ${gPerdedor} · ${m.competencia}${m.fecha && m.fecha !== m.competencia ? ' · ' + m.fecha : ''}`
    };
  }

  function renderNoticias() {
    const feed = document.getElementById('noticias-feed');
    if (!feed) return;

    const partidos = recolectarPartidosJugados()
      .sort((a, b) => b.id - a.id)   // más reciente primero (id = timestamp)
      .slice(0, 10);                  // últimas 10 noticias, no saturar la página

    const goleadores = calcularGoleadores();

    if (partidos.length === 0 && goleadores.length === 0 && state.tarjetas.length === 0) {
      feed.innerHTML = '<div class="empty-state">Todavía no hay resultados para generar noticias</div>';
      return;
    }

    let html = '';

    // Noticia destacada: goleador puntero (si hay goles cargados)
    if (goleadores.length > 0) {
      const puntero = [...goleadores].sort((a, b) => b.goles - a.goles)[0];
      html += `
        <div class="noticia-card gol">
          <span class="noticia-tag">Goleadores</span>
          <div class="noticia-titular">🥇 ${puntero.jugador} lidera la tabla de goleadores</div>
          <div class="noticia-sub">${puntero.goles} ${puntero.goles === 1 ? 'gol' : 'goles'} con ${puntero.team}</div>
        </div>`;
    }

    // Noticia destacada: última tarjeta roja
    const ultimaRoja = [...state.tarjetas].filter(t => t.tipo === 'ROJA').sort((a,b) => b.id - a.id)[0];
    if (ultimaRoja) {
      html += `
        <div class="noticia-card tarjeta">
          <span class="noticia-tag">Disciplina</span>
          <div class="noticia-titular">🟥 Expulsión para ${ultimaRoja.jugador}</div>
          <div class="noticia-sub">${ultimaRoja.team} jugará su próximo partido con una baja sensible</div>
        </div>`;
    }

    // Recap de los últimos partidos
    partidos.forEach(m => {
      const noticia = generarTitular(m);
      html += `
        <div class="noticia-card ${noticia.tipo} clickeable" onclick="window.abrirFicha('${m._torneoKey}', ${m.id})">
          <span class="noticia-tag">${m.competencia}</span>
          <div class="noticia-titular">${noticia.titular}</div>
          <div class="noticia-sub">${noticia.sub}</div>
        </div>`;
    });

    feed.innerHTML = html;
  }

  // ── FICHA DE PARTIDO ─────────────────────────────────────────────────────
  // Guarda qué partido está abierto en el modal ({torneo, id}) para poder
  // volver a buscarlo cada vez que se re-renderiza (ej: después de guardar).
  let fichaActual = null;

  function abrirFicha(torneo, id) {
    fichaActual = { torneo, id };
    renderFicha();
    document.getElementById('ficha-overlay').classList.remove('hidden');
  }

  function cerrarFicha() {
    document.getElementById('ficha-overlay').classList.add('hidden');
    fichaActual = null;
  }

  function renderFicha() {
    if (!fichaActual) return;
    const { torneo, id } = fichaActual;
    const m = (state[torneo] || []).find(x => x.id === id);
    if (!m) { cerrarFicha(); return; } // el partido fue borrado mientras estaba abierto

    const competencia = torneo === 'copas' ? m.torneo
                       : torneo === 'apertura' ? 'Torneo Apertura' : 'Torneo Clausura';
    const fechaLabel = torneo === 'copas' ? '' : m.fecha;
    const valoraciones  = m.valoraciones  || {};
    const golesPartido  = m.golesPartido  || {};

    // Lista de valoraciones de un equipo, en modo "solo lectura" (vista pública)
    function listaValoraciones(team) {
      const plantilla = state.jugadores[team] || [];
      if (plantilla.length === 0) return '<div class="empty-state" style="padding:6px 0;">Sin plantel cargado</div>';
      return plantilla.map(j => {
        const key   = `${team}|${j.nombre}`;
        const val   = valoraciones[key];
        const goles = golesPartido[key];
        const esMvp = m.mvp === key;
        return `
          <div class="ficha-jugador-row">
            <span class="ficha-jugador-nombre">${esMvp ? '⭐ ' : ''}${j.nombre}</span>
            <span>
              ${goles ? `<span class="ficha-gol-badge">⚽ ${goles}</span>` : ''}
              ${val != null ? `<span class="ficha-rating-badge">${val}</span>` : ''}
            </span>
          </div>`;
      }).join('');
    }

    document.getElementById('ficha-view').innerHTML = `
      <div class="ficha-competencia">${competencia}</div>
      <div class="ficha-scoreboard">
        <div class="ficha-team">${m.home}</div>
        <div class="ficha-score">${m.ghome} - ${m.gaway}</div>
        <div class="ficha-team">${m.away}</div>
      </div>
      <div class="ficha-meta">
        ${fechaLabel ? `<span>📅 ${fechaLabel}</span>` : ''}
        ${m.estadio ? `<span>📍 ${m.estadio}</span>` : ''}
        ${m.clima   ? `<span>${m.clima}</span>`       : ''}
      </div>
      ${m.mvp ? `<div class="ficha-mvp">⭐ Jugador del partido: <strong>${m.mvp.split('|')[1]}</strong> · ${m.mvp.split('|')[0]}</div>` : ''}
      <div class="ficha-plantillas">
        <div class="ficha-plantilla-col"><h4>${m.home}</h4>${listaValoraciones(m.home)}</div>
        <div class="ficha-plantilla-col"><h4>${m.away}</h4>${listaValoraciones(m.away)}</div>
      </div>
    `;

    // ── Panel de edición (el CSS lo oculta solo si no sos Comisionado) ──
    document.getElementById('ficha-estadio').value = m.estadio || '';
    document.getElementById('ficha-clima').value   = m.clima   || '';

    const mvpSel = document.getElementById('ficha-mvp');
    mvpSel.innerHTML = '<option value="">— Sin jugador del partido —</option>';
    [m.home, m.away].forEach(team => {
      (state.jugadores[team] || []).forEach(j => {
        const opt = document.createElement('option');
        opt.value = `${team}|${j.nombre}`;
        opt.textContent = `${j.nombre} (${team})`;
        mvpSel.appendChild(opt);
      });
    });
    mvpSel.value = m.mvp || '';

    // Por cada jugador de los 2 equipos: un input de goles y uno de nota (1-10).
    // Cargar los goles acá los suma solo a la tabla de Goleadores — no hace
    // falta ir a cargarlos de nuevo a mano en esa pestaña.
    function inputsDeEquipo(team) {
      const plantilla = state.jugadores[team] || [];
      if (plantilla.length === 0) return '';
      let h = `<div class="ficha-rating-team-title">${team}</div>`;
      plantilla.forEach(j => {
        const key       = `${team}|${j.nombre}`;
        const val       = valoraciones[key] ?? '';
        const golesVal  = golesPartido[key] ?? '';
        const nombreAtr = j.nombre.replace(/"/g, '&quot;');
        h += `
          <div class="ficha-rating-input-row">
            <span>${j.nombre}</span>
            <span class="ficha-input-pair">
              <input type="number" min="0" step="1" class="gol-input input-inline small"
                     data-team="${team}" data-nombre="${nombreAtr}" value="${golesVal}" title="Goles" placeholder="⚽">
              <input type="number" min="1" max="10" step="0.1" class="rating-input input-inline small"
                     data-team="${team}" data-nombre="${nombreAtr}" value="${val}" title="Nota (1-10)" placeholder="Nota">
            </span>
          </div>`;
      });
      return h;
    }
    document.getElementById('ficha-ratings').innerHTML = inputsDeEquipo(m.home) + inputsDeEquipo(m.away);
  }

  async function guardarFicha() {
    if (!isCommissioner || !fichaActual) return;
    const { torneo, id } = fichaActual;
    const idx = state[torneo].findIndex(x => x.id === id);
    if (idx === -1) return;

    const estadio = document.getElementById('ficha-estadio').value.trim();
    const clima   = document.getElementById('ficha-clima').value.trim();
    const mvp     = document.getElementById('ficha-mvp').value;

    const valoraciones = {};
    document.querySelectorAll('#ficha-ratings .rating-input').forEach(inp => {
      const v = inp.value.trim();
      if (v === '') return;
      valoraciones[`${inp.dataset.team}|${inp.dataset.nombre}`] = Number(v);
    });

    const golesPartido = {};
    document.querySelectorAll('#ficha-ratings .gol-input').forEach(inp => {
      const v = Number(inp.value.trim() || 0);
      if (v <= 0) return; // 0 goles = no hace falta guardarlo
      golesPartido[`${inp.dataset.team}|${inp.dataset.nombre}`] = v;
    });

    state[torneo][idx] = { ...state[torneo][idx], estadio, clima, mvp, valoraciones, golesPartido };
    await saveKey(torneo);       // guarda el partido (con sus goles adentro)
    renderFicha();
    renderPichichi();            // la tabla de Goleadores se actualiza sola, al toque
    showToast('✓ Ficha guardada — Goleadores actualizado');
  }

  // Junta los goles "de siempre" (cargados a mano en la pestaña Goleadores)
  // con los que ahora se cargan desde la ficha de cada partido, y devuelve
  // el total combinado por jugador. Así no se pierde nada de lo ya cargado.
  function calcularGoleadores() {
    const mapa = {}; // "Equipo|Nombre" -> { team, jugador, goles, manualId }

    state.goles.forEach(g => {
      mapa[`${g.team}|${g.jugador}`] = { team: g.team, jugador: g.jugador, goles: g.goles, manualId: g.id };
    });

    ['apertura', 'clausura', 'copas'].forEach(torneo => {
      (state[torneo] || []).forEach(m => {
        Object.entries(m.golesPartido || {}).forEach(([key, cantidad]) => {
          if (!cantidad) return;
          if (!mapa[key]) {
            const [team, jugador] = key.split('|');
            mapa[key] = { team, jugador, goles: 0, manualId: null };
          }
          mapa[key].goles += cantidad;
        });
      });
    });

    return Object.values(mapa).filter(g => g.goles > 0);
  }

  // ── TABS ───────────────────────────────────────────────────────────────────
  function showTab(tabName, btnEl) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    if (btnEl) btnEl.classList.add('active');
  }

  // ── EXPONER AL DOM ─────────────────────────────────────────────────────────
  window.showTab        = showTab;
  window.removeMatch    = removeMatch;
  window.removeCopa     = removeCopa;
  window.removeGol      = removeGol;
  window.removeTarjeta  = removeTarjeta;
  window.abrirFicha     = abrirFicha;
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
  document.getElementById('btn-tab-noticias').addEventListener('click',  e => showTab('noticias',  e.target));
  document.getElementById('btn-tab-plantillas').addEventListener('click',e => showTab('plantillas',e.target));

  // Cuando cambia el equipo elegido, actualiza la lista de jugadores de ese equipo
  document.getElementById('gol-team').addEventListener('change',  () => populateJugadorSelect('gol-team',  'gol-jugador'));
  document.getElementById('disc-team').addEventListener('change', () => populateJugadorSelect('disc-team', 'disc-jugador'));

  document.getElementById('btn-toggle-mode').addEventListener('click',  promptLogin);
  document.getElementById('btn-add-apertura').addEventListener('click', () => addMatch('apertura'));
  document.getElementById('btn-add-clausura').addEventListener('click', () => addMatch('clausura'));
  document.getElementById('btn-add-copa').addEventListener('click',     addCopasMatch);
  document.getElementById('btn-add-gol').addEventListener('click',      addGol);
  document.getElementById('btn-add-tarjeta').addEventListener('click',  addTarjeta);
  document.getElementById('btn-add-jugador').addEventListener('click',  agregarJugador);
  document.getElementById('btn-ficha-close').addEventListener('click',   cerrarFicha);
  document.getElementById('btn-ficha-guardar').addEventListener('click', guardarFicha);
  document.getElementById('btn-unlock').addEventListener('click',       tryUnlock);
  document.getElementById('btn-spectator').addEventListener('click',    enterSpectator);
  document.getElementById('lock-pwd').addEventListener('keydown',  e => { if (e.key === 'Enter') tryUnlock(); });

  // ── ARRANCAR ───────────────────────────────────────────────────────────────
  init();
