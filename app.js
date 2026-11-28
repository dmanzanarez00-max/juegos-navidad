(() => {
'use strict';
const D = window.DATA;
const Q = new URLSearchParams(location.search);
const LOCAL = Q.has('local');
const SALA = (Q.get('sala') || '').toUpperCase();
const ROLE = Q.get('rol') || (SALA ? 'jugador' : 'tv');
const KEY = Q.get('k') || '';
const BASE = location.href.split('#')[0].split('?')[0];
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const A = n => 'assets/' + n + '.webp';
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const pl = (V, id) => V.players.find(p => p.id === id);
const nm = (V, id) => { const p = pl(V, id); return p ? p.name : '—'; };
const orn = (V, id) => { const p = pl(V, id); return A(p ? p.orn : 'esfera-cara'); };
const fmt = n => '$' + Number(n).toLocaleString('es-MX');
let offset = 0;
const left = dl => dl ? Math.max(0, Math.ceil((dl - (Date.now() + offset)) / 1000)) : 0;
function toast(t) { let e = $('.toast'); if (!e) { e = document.createElement('div'); e.className = 'toast'; document.body.appendChild(e); } e.textContent = t; e.style.display = 'block'; clearTimeout(e._t); e._t = setTimeout(() => e.style.display = 'none', 2600); }
const seen = new Set(); const once = k => { if (seen.has(k)) return false; seen.add(k); return true; };

// ---------- sonidos ----------
let actx = null;
function tone(f, d, type, when, vol) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.type = type || 'sine'; o.frequency.value = f; const t = actx.currentTime + (when || 0); g.gain.setValueAtTime(vol || .18, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d); } catch (e) {} }
const SND = {
  ding() { tone(880, .25, 'triangle'); tone(1320, .5, 'triangle', .12); },
  strike() { tone(140, .7, 'sawtooth', 0, .25); tone(110, .7, 'sawtooth', .05, .2); },
  buzz() { tone(660, .12, 'square'); tone(990, .3, 'square', .1); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .35, 'triangle', i * .12)); },
  banner() { [392, 523, 659].forEach((f, i) => tone(f, .3, 'triangle', i * .1)); },
  tick() { tone(1200, .05, 'square', 0, .06); },
  join() { tone(784, .15, 'sine'); tone(1046, .25, 'sine', .1); },
  basta() { tone(330, .15, 'square'); tone(330, .15, 'square', .2); tone(330, .4, 'square', .4); },
  dice() { for (let i = 0; i < 6; i++) tone(300 + i * 60, .05, 'square', i * .06, .08); },
  lock() { tone(220, .6, 'sine'); }
};

// =================================================================
// PANTALLA GRANDE
// =================================================================
function bootTV() {
  document.body.innerHTML = '<div id="tvwrap"><div id="tv"><div class="garl"></div><div id="main"></div><div id="strip"></div><div id="ovl"></div><div id="ui"></div><div class="corner" id="corner"></div></div></div>';
  const fit = () => { const s = Math.min(innerWidth / 1920, innerHeight / 1080); const tv = $('#tv'); tv.style.transform = `scale(${s})`; tv.style.left = (innerWidth - 1920 * s) / 2 + 'px'; tv.style.top = (innerHeight - 1080 * s) / 2 + 'px'; };
  addEventListener('resize', fit); fit();
  let V = null, sched = null, lastEv = 0, ui = { settings: false, howto: false }, nCtl = 0, netOk = false;
  const conns = new Map();
  const eng = makeEngine(D, () => { clearTimeout(sched); sched = setTimeout(publish, 40); });
  lastEv = eng.S.evId; window.__eng = eng;
  const hostURL = () => `${BASE}?rol=host&sala=${eng.S.code}&k=${eng.S.key}${LOCAL ? '&local=1' : ''}`;
  const playURL = () => `${BASE}?sala=${eng.S.code}${LOCAL ? '&local=1' : ''}`;
  const net = makeNet(LOCAL).host(eng.S.code, {
    onReady() { netOk = true; render(); },
    onError(e) { netOk = false; render(); if (e && e.type === 'unavailable-id') toastTV('Reconectando la sala… (si está abierta en otra pestaña, ciérrala)'); },
    onOpen(id) { conns.set(id, { role: 'jugador', pid: null }); },
    onClose(id) { conns.delete(id); countCtl(); },
    onData(id, m) {
      if (!m || typeof m !== 'object') return;
      const c = conns.get(id) || { role: 'jugador', pid: null };
      if (m.t === 'hello') { c.pid = String(m.pid || '').slice(0, 40); c.role = (m.role === 'host' && eng.isKey(m.key)) ? 'host' : 'jugador'; conns.set(id, c); countCtl(); net.send(id, { t: 'v', V: eng.view(), role: c.role }); return; }
      if (!c.pid) return;
      const err = eng.handle(c.pid, c.role, m);
      if (err) net.send(id, { t: 'err', msg: err });
    }
  });
  function countCtl() { nCtl = [...conns.values()].filter(c => c.role === 'host').length; render(); }
  function publish() { V = eng.view(); net.broadcast({ t: 'v', V }); render(); }
  setInterval(() => { if (eng.tick()) eng.touch(); updClocks(); }, 250);
  setInterval(() => net.broadcast({ t: 'v', V: eng.view() }), 5000);
  const act = (c, a) => { const e = eng.cmd(c, a); if (e) toast(e); };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return; tone(1, .01);
    const a = b.dataset.act;
    if (a === 'next') return act('next');
    if (a === 'settings') { ui.settings = !ui.settings; return render(); }
    if (a === 'howto') { ui.howto = !ui.howto; return render(); }
    if (a === 'set') { const [k, v] = b.dataset.v.split(':'); act('settings', { [k]: isNaN(+v) ? (v === 'true' ? true : v === 'false' ? false : v) : +v }); return; }
    if (a === 'game') { const g = b.dataset.v; const gs = eng.S.settings.games; const nx = gs.includes(g) ? gs.filter(x => x !== g) : ['feu', 'jeo', 'pre', 'bas', 'mil'].filter(x => gs.includes(x) || x === g); if (nx.length) act('settings', { games: nx }); return; }
    if (a === 'reset') { if (b.dataset.sure) { act('reset', { keepPlayers: b.dataset.v === 'keep' }); ui.settings = false; render(); } else { b.dataset.sure = 1; b.textContent = '¿Seguro? Toca otra vez'; } return; }
    if (a === 'pause') return act('pause');
  });
  addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); act('next'); } if (e.key === 'p') act('pause'); });

  function updClocks() { document.querySelectorAll('[data-dl]').forEach(el => { const s = left(+el.dataset.dl); if (el.textContent !== String(s)) { el.textContent = s; if (s > 0 && s <= 5 && V && !V.paused) SND.tick(); } }); }
  function qrs() { document.querySelectorAll('[data-qr]').forEach(el => { if (el.dataset.done === el.dataset.qr) return; el.innerHTML = ''; el.dataset.done = el.dataset.qr; if (window.QRCode) { try { new QRCode(el, { text: el.dataset.qr, width: 400, height: 400, colorDark: '#4A2422', colorLight: '#F6E8CF' }); return; } catch (e) {} } el.innerHTML = `<div class="qrfallback">${esc(el.dataset.qr)}</div>`; }); }
  let mainHTML = '', stripHTML = '';
  function render() {
    if (!V) V = eng.view();
    const S = eng.S;
    const h = mainView(V, S);
    if (h !== mainHTML) { $('#main').innerHTML = h; mainHTML = h; qrs(); }
    const st = stripView(V); if (st !== stripHTML) { $('#strip').innerHTML = st; stripHTML = st; }
    $('#corner').textContent = `Sala ${S.code} · ${netOk ? (nCtl ? 'host conectado' : 'esperando al host') : 'conectando…'}`;
    $('#ui').innerHTML = (ui.settings ? settingsView(S) : '') + (ui.howto ? howtoView() : '') + (V.paused ? '<div class="ov pause"><div class="card"><div class="h1">Pausa</div><p class="lead">Ahorita seguimos</p></div></div>' : '');
    events(V); updClocks();
  }
  function events(V) {
    const nev = (V.ev || []).filter(e => e.id > lastEv); if (!nev.length) return; lastEv = Math.max(...nev.map(e => e.id));
    const e = nev[nev.length - 1]; const o = $('#ovl'); const k = 'e' + e.id;
    if (eng.S.settings.sound && SND[e.type === 'open' ? 'banner' : e.type]) SND[e.type === 'open' ? 'banner' : e.type]();
    let h = '';
    if (e.type === 'banner' || e.type === 'win' || e.type === 'basta') h = `<div class="ov evbanner"><div style="text-align:center"><div class="banner">${esc(e.text)}</div>${e.sub ? `<div class="card" style="display:inline-block;padding:18px 40px;margin-top:-10px"><p class="lead">${esc(e.sub)}</p></div>` : ''}</div></div>`;
    if (e.type === 'buzz') h = `<div class="ov"><div class="buzzname"><img src="${orn(V, e.pid)}" alt=""><b>${esc(e.text)}</b></div></div>`;
    if (e.type === 'strike') h = `<div class="ov"><div class="bigx">✕</div></div>`;
    if (e.type === 'dice' && e.n) h = `<div class="ov evbanner"><div style="text-align:center"><div class="rolling">${die(e.n)}</div><div class="banner" style="margin-top:20px">${esc(e.text)}</div></div></div>`;
    if (e.type === 'ding' || e.type === 'win') h += sparks();
    if (e.type === 'info' || e.type === 'join') { toastTV(e.text); }
    if (h) { o.innerHTML = h; clearTimeout(o._t); o._t = setTimeout(() => { o.innerHTML = ''; }, 2700); }
  }
  function toastTV(t) { const d = document.createElement('div'); d.className = 'ov'; d.style.alignItems = 'start'; d.style.paddingTop = '120px'; d.innerHTML = `<div class="pill" style="font-size:34px;padding:14px 36px">${esc(t)}</div>`; $('#tv').appendChild(d); setTimeout(() => d.remove(), 2600); }
  function sparks() { let s = '<div class="ov">'; for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, r = 300 + Math.random() * 400; s += `<i class="spark" style="left:930px;top:500px;--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r}px;animation-delay:${Math.random() * .2}s"></i>`; } return s + '</div>'; }

  function settingsView(S) {
    const st = S.settings; const seg = (k, opts, lab) => `<div class="srow"><span>${lab}</span><div class="seg">${opts.map(([v, t]) => `<button data-act="set" data-v="${k}:${v}" class="${String(st[k]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
    const G = { feu: '100 Mexicanos', jeo: 'Jeopardy', pre: 'Atínale', bas: 'Basta', mil: 'Millonario (final)' };
    return `<div class="settings"><div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><div class="h2">Ajustes</div><button class="mbtn" style="width:260px;height:90px;font-size:34px" data-act="settings">Listo</button></div>
    <div class="srow"><span>Juegos de esta noche</span><div class="seg">${Object.keys(G).map(g => `<button data-act="game" data-v="${g}" class="${st.games.includes(g) ? 'on' : ''}">${G[g]}</button>`).join('')}</div></div>
    ${seg('feuPasses', [[2, '2 veces'], [3, '3 veces'], [4, '4 veces']], '100 Mexicanos: cuántas veces pasa al frente cada quien')}
    ${seg('jeoTeams', [[2, '2'], [3, '3'], [4, '4 (parejas)']], 'Jeopardy: número de equipos')}
    ${seg('jeoRounds', [[1, '1 tablero'], [2, '2 tableros']], 'Jeopardy: tableros')}
    ${seg('bastaRounds', [[2, '2'], [3, '3'], [4, '4']], 'Basta: rondas')}
    ${seg('finalists', [[2, 'Los 2 primeros'], [3, 'Los 3 primeros']], 'Millonario: finalistas')}
    ${seg('robLaps', [[1, '1 vuelta'], [2, '2 vueltas']], 'Ronda de robo')}
    ${seg('sound', [[true, 'Con sonido'], [false, 'Sin sonido']], 'Sonido')}
    <div class="srow"><span>Empezar de nuevo</span><div class="seg"><button data-act="reset" data-v="keep">Conservar jugadores</button><button data-act="reset" data-v="all">Borrar todo</button></div></div>
    </div></div>`;
  }
  function howtoView() {
    return `<div class="settings"><div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><div class="h2">Cómo se juega</div><button class="mbtn" style="width:260px;height:90px;font-size:34px" data-act="howto">Listo</button></div>
    <p>1. Quien conduce escanea el código de «¿Quién conduce?» con su celular. Desde ahí controla todo y también puede jugar.</p>
    <p>2. Al iniciar, todos escanean el código de la sala, escriben su nombre y escogen su esfera.</p>
    <p>3. Se juegan varios concursos. En cada uno ganan puntos para el marcador general.</p>
    <p>4. Las respuestas se escriben en el celular y el juego las califica solo. Nadie ve las respuestas antes de tiempo, ni el host.</p>
    <p>5. Al final, el que tenga más puntos escoge regalo primero y sigue la ronda de robo con el dado.</p></div></div>`;
  }
}

// ---------- vistas de la pantalla ----------
const RULES = {
  feu: ['Dos equipos sorteados al azar.', 'En cada pregunta pasa al frente uno de cada equipo. El primero en tocar el timbre contesta desde su celular.', 'Tres errores y el otro equipo puede robar. Equipo ganador: +5 a cada quien; el otro: +2.'],
  jeo: ['Equipos que arma el host. El equipo que escoge contesta primero y, si acierta, sigue escogiendo.', 'Si falla, se le resta y se abre el timbre para que otro equipo robe. Contesten «¿Qué es…?» o «¿Quién es…?» y ganan bonus.', 'Hay casillas dobles con apuesta y una pregunta final para todos. Lugares: +5, +3, +2, +1 a cada integrante.'],
  pre: ['Cada quien juega solo.', 'Sale un producto y tienen 10 segundos para mandar su precio desde el celular.', 'Gana el que más se acerque sin pasarse: +1 por producto.'],
  bas: ['Gira la ruleta y a uno de ustedes le toca detenerla.', 'Llenen todas las categorías con esa letra. El primero que acabe aprieta ¡Basta!', 'Luego todos revisan en su celular y votan las respuestas que no valen; con mayoría se anulan. Única 100, repetida 50. Por ronda: +3, +2, +1.'],
  mil: ['La gran final: juegan los primeros lugares.', 'Cinco preguntas de cultura general, cada vez más difíciles. La segunda es tu seguro.', 'Comodines: 50:50, público y llamada a un amigo. Ganas 1, 2, 3, 5 u 8 puntos.']
};
const POINTS = [['100 Mexicanos', 'Equipo ganador +5 cada uno · perdedor +2'], ['Jeopardy', 'Por lugar: +5, +3, +2, +1 cada integrante'], ['Atínale al precio', '+1 por cada producto que ganes'], ['Basta', 'Por ronda: +3, +2, +1'], ['Millonario', 'Hasta +8 para los finalistas']];
const TREEPOS = [[50, 30], [38, 44], [62, 44], [30, 58], [50, 55], [70, 58], [24, 72], [42, 70], [58, 70], [76, 72], [36, 84], [64, 84]];

function mainView(V, S) {
  const P = V.phase;
  if (P === 'menu') return `<div class="menu">
    <div class="hostqr"><div class="h2" style="font-size:46px;margin-bottom:16px">¿Quién conduce?</div><div class="qrbox" style="width:360px"><div data-qr="${esc(`${BASE}?rol=host&sala=${S.code}&k=${S.key}${LOCAL ? '&local=1' : ''}`)}"></div></div><p class="lead" style="font-size:26px;margin-top:14px">Escanéalo con tu celular para controlar el juego y también jugar.</p></div>
    <div class="menubtns"><button class="mbtn main" data-act="next">Iniciar juego</button><button class="mbtn" data-act="howto">Cómo se juega</button><button class="mbtn" data-act="settings">Ajustes</button>
      <p class="lead muted" style="font-size:24px;margin-top:10px">${V.players.length ? V.players.length + ' jugadores guardados' : ''}</p></div>
    <img class="tree" src="${A('arbol')}" alt=""></div>`;
  if (P === 'lobby') {
    const ps = V.players.filter(p => !p.removed);
    return `<div class="lobby"><div><div class="h1" style="font-size:80px">¡Saquen el celular!</div>
      <ol class="steps"><li><b>1</b>Escaneen el código con la cámara</li><li><b>2</b>Escriban su nombre y escojan su esfera</li><li><b>3</b>Su esfera aparece en el árbol: ¡ya están dentro!</li></ol>
      <p class="lead" style="margin-top:30px"><span class="pill">${ps.length} ${ps.length === 1 ? 'jugador' : 'jugadores'}</span></p></div>
      <div class="treebox"><img class="t" src="${A('arbol')}" alt="">${ps.slice(0, 12).map((p, i) => `<div class="hang" style="left:${TREEPOS[i][0]}%;top:${TREEPOS[i][1]}%;${once('h' + p.id) ? '' : 'animation:none'}"><img src="${A(p.orn)}" alt=""><span>${esc(p.name)}</span></div>`).join('')}</div>
      <div class="center"><div class="qrbox" style="width:470px"><div data-qr="${esc(`${BASE}?sala=${S.code}${LOCAL ? '&local=1' : ''}`)}"></div></div><p class="lead" style="font-size:26px;margin-top:14px">Sala <b>${S.code}</b></p>
      <button class="mbtn" style="margin-top:20px" data-act="next">Ya estamos todos</button></div></div>`;
  }
  if (P === 'night') return `<div class="scr center" style="padding-top:150px"><div><div class="banner">Esta noche</div>
    <div style="display:grid;grid-template-columns:repeat(${V.games.length},1fr);gap:24px;width:1700px;margin:40px auto 0">${V.games.map((g, i) => `<div class="card" style="padding:26px 16px;animation:pop .5s ${i * .25}s both"><div class="h2" style="font-size:64px">${i + 1}</div><div class="h3" style="font-size:34px">${esc(g)}</div></div>`).join('')}</div>
    <div class="card" style="width:1300px;margin:40px auto 0;padding:24px 50px;text-align:left">${POINTS.filter(p => V.games.some(g => g.startsWith(p[0].slice(0, 6)))).map(p => `<div style="display:flex;justify-content:space-between;font:500 28px/1.7 Lora"><b>${p[0]}</b><span>${p[1]}</span></div>`).join('')}</div>
    <p class="lead" style="margin-top:26px">El que junte más puntos escoge regalo primero.</p></div></div>`;
  if (P === 'intro') return `<div class="scr center" style="padding-top:160px"><div><p class="lead muted">Juego ${V.gi + 1} de ${V.games.length}</p><div class="banner" style="margin-top:10px">${esc(V.gameName)}</div>
    <div class="card" style="width:1300px;margin:30px auto 0;padding:30px 60px;text-align:left">${RULES[V.game].map((r, i) => `<div style="display:grid;grid-template-columns:70px 1fr;gap:16px;align-items:center;margin:12px 0"><img src="${A(['medalla-estrella-dorada', 'medalla-corazon', 'medalla-estrella-roja'][i])}" style="width:64px" alt=""><span class="lead">${esc(r)}</span></div>`).join('')}</div></div></div>`;
  if (P === 'results') { const r = V.results || { title: '', lines: [] }; return `<div class="scr center" style="padding-top:180px"><div><div class="banner">${esc(r.title)}</div><div class="card" style="width:1100px;margin:30px auto 0;padding:30px 50px">${r.lines.map(l => `<p class="lead">${esc(l)}</p>`).join('')}</div></div></div>`; }
  if (P === 'standings') { const top = V.rank; const max = Math.max(1, ...top.map(id => pl(V, id).pts)); return `<div class="scr" style="padding-top:130px"><div class="center"><div class="banner">Así van</div></div><div class="race">${top.map((id, i) => { const p = pl(V, id); return `<div class="rrow"><span style="text-align:right">${i + 1}.º</span><img src="${A(p.orn)}" alt=""><span>${esc(p.name)}</span><div class="rbar"><i style="width:${Math.max(3, p.pts / max * 100)}%"></i></div><span style="color:var(--vino)">${p.pts}</span></div>`; }).join('')}</div></div>`; }
  if (P === 'final') {
    const r = V.rank, R = V.rob || {}; const cur = R.cur;
    const pod = [1, 0, 2].filter(i => r[i]).map(i => { const p = pl(V, r[i]); return `<div class="pod"><img class="o" src="${A(p.orn)}" alt=""><div class="nm">${esc(p.name)}</div><div class="h3" style="color:var(--vino)">${p.pts} punto${p.pts === 1 ? '' : 's'}</div><div class="blk" style="height:${[220, 160, 120][i]}px">${i + 1}</div></div>`; }).join('');
    const gifts = `<div class="gifts">${r.map((id, i) => { const g = (R.hold || {})[id]; const st = (R.steals || {})[g] || 0; const lk = st >= (R.max || 2); return `<div class="gft ${id === cur ? 'on' : ''} ${id === R.target && R.step !== 'choose' ? 'tg' : ''}"><img src="${orn(V, id)}" alt=""><span>${esc(nm(V, id))}</span><b>Regalo ${g || i + 1}</b><em>${lk ? '🔒' : '●'.repeat(st) + '○'.repeat((R.max || 2) - st)}</em></div>`; }).join('')}</div>`;
    let main = '';
    if (R.step === 'pick') main = `<div class="h2">Escojan su regalo en este orden</div><p class="lead">El 1.º lugar escoge primero. Luego empieza la ronda de robo.</p>`;
    else if (R.step === 'end') main = `<div class="h1">¡Se acabaron los robos!</div><p class="lead">Cada quien se queda con el regalo que tiene. ¡Feliz Navidad!</p>`;
    else {
      main = `<p class="lead muted">Ronda de robo · vuelta ${R.lap} de ${R.laps}</p><div style="display:flex;align-items:center;gap:20px"><img src="${orn(V, cur)}" style="height:110px" alt=""><div class="h1" style="font-size:80px">${esc(nm(V, cur))}</div></div>`;
      if (R.step === 'choose') main += `<p class="h3">¿Roba o se queda con su regalo?</p><p class="lead muted">Para robar hay que tirar el dado y cumplir lo que salga.</p>`;
      if (R.step === 'target') main += `<p class="h3">Está escogiendo a quién robarle…</p>`;
      if (R.step === 'roll') main += `<p class="h3">Quiere el regalo de <span style="color:var(--vino)">${esc(nm(V, R.target))}</span>. ¡Tira el dado!</p>`;
      if (R.step === 'reto' || (R.step === 'done' && R.die)) main += `<div style="display:flex;gap:34px;align-items:center;margin-top:10px">${die(R.die)}<div><div class="h2" style="color:var(--vino)">${esc(R.kind)}</div>${R.step === 'reto' ? `<p class="h3" style="font-size:40px">${esc(R.reto)}</p>${R.math ? `<p class="lead">Contesta en su celular · <span data-dl="${R.math.deadline}"></span> s</p>` : `<p class="lead muted">${esc(nm(V, R.target))} decide si lo cumplió</p>`}` : ''}</div></div>`;
      if (R.step === 'done') main += `<p class="h3" style="margin-top:14px">${esc(R.msg)}</p>`;
    }
    return `<div class="scr" style="display:grid;grid-template-columns:640px 1fr;gap:40px;padding-top:110px"><div><div class="center"><div class="banner" style="min-width:520px;font-size:60px">¡Ganadores!</div></div><div class="podium" style="transform:scale(.8);transform-origin:top center">${pod}</div></div>
      <div><div class="card" style="padding:30px 44px">${main}</div>${gifts}<p class="note center" style="margin-top:8px">● robos de cada regalo · con 2 robos queda con candado 🔒</p></div></div>`;
  }
  if (P === 'play') return ({ feu: feuView, jeo: jeoView, pre: preView, bas: basView, mil: milView })[V.game](V);
  return '';
}
function die(n) { const P = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }; return `<div class="die" style="width:150px;height:150px;padding:24px;margin-top:10px">${Array.from({ length: 9 }, (_, i) => `<i class="${P[n].includes(i) ? 'v' : ''}"></i>`).join('')}</div>`; }
function stripView(V) {
  if (!['play', 'intro', 'night'].includes(V.phase)) return '';
  let hot = null, team = {};
  if (V.phase === 'play') {
    if (V.feu) { if (V.feu.round) hot = V.feu.round.answerer; V.feu.teams.forEach((t, i) => t.members.forEach(m => team[m] = i)); }
    if (V.jeo && V.jeo.clue && V.jeo.clue.answering) hot = V.jeo.clue.answering.p;
    if (V.mil && V.mil.cur) hot = V.mil.cur;
    if (V.bas && V.bas.step === 'spin') hot = V.bas.spinner;
  }
  return `<div class="strip">${V.players.filter(p => !p.removed).map(p => `<div class="sp ${p.id === hot ? 'hot' : ''} ${team[p.id] !== undefined ? 'team' + team[p.id] : ''}"><img src="${A(p.orn)}" alt=""><div class="n">${esc(p.name)}</div><div class="s">${p.pts}</div></div>`).join('')}</div>`;
}
function feuView(V) {
  const F = V.feu;
  if (F.step === 'draw') return `<div class="scr center" style="padding-top:140px"><div><div class="banner">Sorteo de equipos</div><div class="teams2">${F.teams.map((t, i) => `<div class="tcol card"><h3>${esc(t.name)}</h3>${t.members.map((m, k) => `<div class="tm" style="animation-delay:${(k * 2 + i) * .45}s"><img src="${orn(V, m)}" alt="">${esc(nm(V, m))}</div>`).join('')}</div>`).join('')}</div></div></div>`;
  if (F.step === 'names') return `<div class="scr center" style="padding-top:150px"><div><div class="h1">Pónganle nombre a su equipo</div><p class="lead">Cualquiera del equipo lo escribe en su celular</p><div class="teams2">${F.teams.map(t => `<div class="tcol card"><h3>${esc(t.name)}</h3>${t.members.map(m => `<div class="tm" style="animation:none"><img src="${orn(V, m)}" alt="">${esc(nm(V, m))}</div>`).join('')}</div>`).join('')}</div></div></div>`;
  const R = F.round; if (!R) return '';
  const tags = F.teams.map((t, i) => `<div class="ftag ${R.control === i && R.mode !== 'done' ? 'on' : ''}" style="${i ? 'right' : 'left'}:40px;background-image:url(${A(i ? 'etiqueta-verde' : 'etiqueta-roja')})"><span>${esc(t.name)}</span><b>${F.scores[i]}</b></div>`).join('');
  const rows = Math.ceil(R.tiles.length / 2);
  const tiles = R.tiles.map((t, k) => t.o === 1 ? `<div class="tile open" style="${once('ft' + F.r + '-' + k) ? '' : 'animation:none'}"><span>${esc(t.x)}</span><b>${t.p}</b></div>` : t.o === 2 ? `<div class="tile ghost"><span>${esc(t.x)}</span><b>${t.p}</b></div>` : `<div class="tile hid"><i>${k + 1}</i></div>`).join('');
  let status = '';
  if (R.mode === 'faceoff' && R.buzzOpen) status = `<div class="who" style="padding:14px 34px"><img src="${orn(V, F.front[0])}" alt="">${esc(nm(V, F.front[0]))} <span class="muted">contra</span> ${esc(nm(V, F.front[1]))}<img src="${orn(V, F.front[1])}" alt=""></div><p class="fsub">¡Al timbre en su celular!</p>`;
  else if (R.answerer) status = `<div class="who"><img src="${orn(V, R.answerer)}" alt="">Contesta ${esc(nm(V, R.answerer))}<span class="clock" data-dl="${R.deadline}"></span></div><p class="fsub">${R.mode === 'steal' ? 'Una sola respuesta para robar' : R.mode === 'play' ? 'Turno de ' + esc(F.teams[R.control].name) : 'Cara a cara'}</p>`;
  else if (R.mode === 'done') status = `<p class="fsub" style="font-size:40px">¡${R.pot} puntos para ${esc(F.teams[R.winner].name)}!</p>`;
  const last = R.last ? `<div class="lastans">${esc(nm(V, R.last.p))} dijo «${esc(R.last.text)}» ${R.last.ok ? '✓' : '✕'}</div>` : '';
  return `${tags}<div class="scr" style="padding:110px 300px 170px"><p class="fsub" style="margin:0">Pregunta ${F.r + 1} de ${F.rounds} · ${F.left === 0 ? 'última pregunta' : 'quedan ' + F.left}</p><div class="fq">${esc(F.q)}</div>
    <div class="board" style="--rows:${rows}">${tiles}</div>
    <div style="display:grid;grid-template-columns:240px 1fr 240px;align-items:center;margin-top:18px"><div class="seal"><div><span>En la bolsa</span><b>${R.pot}</b></div></div><div class="turn" style="position:static">${status}${last}</div><div style="font:700 96px Lora;color:var(--vino);text-align:center">${'✕'.repeat(R.strikes)}</div></div></div>`;
}
function jTeamsBar(V, J, hi) { return `<div class="jteams">${J.teams.map((t, i) => `<div class="jtb ${hi === i ? 'pick' : ''} ${J.clue && J.clue.out.includes(i) ? 'out' : ''}"><div class="tg" style="background-image:url(${A(t.tag)})"></div><div><div class="nm">${esc(t.name)}</div><div class="sc">${t.score}</div><div class="note" style="margin:0">${t.members.map(m => esc(nm(V, m))).join(', ')}</div></div></div>`).join('')}</div>`; }
function jeoView(V) {
  const J = V.jeo;
  if (J.step === 'teams') return `<div class="scr center" style="padding-top:150px"><div><div class="banner">Equipos de Jeopardy</div><div style="display:grid;grid-template-columns:repeat(${J.teams.length},1fr);gap:30px;width:1700px;margin:30px auto 0">${J.teams.map(t => `<div class="card" style="padding:24px"><div style="height:130px;background:url(${A(t.tag)}) center/contain no-repeat"></div><div class="h3" style="color:var(--vino)">${esc(t.name)}</div>${t.members.map(m => `<div class="tm" style="animation:none;font-size:30px"><img src="${orn(V, m)}" style="height:50px" alt="">${esc(nm(V, m))}</div>`).join('')}</div>`).join('')}</div><p class="lead" style="margin-top:20px">El host acomoda los equipos desde su celular</p></div></div>`;
  if (J.step === 'board') return `<div class="scr" style="padding:120px 110px 230px"><div class="center" style="margin-bottom:16px"><span class="pill">Ronda ${J.round + 1} · Escoge ${esc(J.teams[J.picker].name)}</span></div><div class="jb" style="grid-template-columns:repeat(${J.cats.length},1fr)">${J.cats.map(c => `<div class="jh">${esc(c)}</div>`).join('')}${[0, 1, 2, 3, 4].map(v => J.cats.map((c, ci) => `<div class="jc ${J.used[ci + '-' + v] ? 'used' : ''}">${(v + 1) * 100 * J.mult}</div>`).join('')).join('')}</div></div>${jTeamsBar(V, J, J.picker)}`;
  if (J.step === 'dd' || J.step === 'clue') {
    const C = J.clue; let st = '';
    if (J.step === 'dd') st = `<div class="h2" style="font-size:80px">¡Casilla doble!</div><p class="lead">${esc(J.teams[J.picker].name)} apuesta desde su celular (hasta ${C.max})</p>`;
    else {
      if (C.buzzOpen) st = '<span class="pill" style="font-size:36px">¡Al timbre!</span>';
      else if (C.answering) st = `<span class="pill" style="font-size:34px">Contesta ${C.answering.p ? esc(nm(V, C.answering.p)) : esc(J.teams[C.answering.t].name)} · <span data-dl="${C.deadline}"></span></span>`;
      if (C.last) st += `<p class="lead" style="margin-top:10px">«${esc(C.last.text)}» ${C.last.ok ? '✓' : '✕'}${C.last.bonus ? ` · bonus +${C.last.bonus} por preguntar` : ''}</p>`;
      else if (C.answering && !C.dd) st += `<p class="lead" style="margin-top:10px;font-size:26px">Bonus si contestan «¿Qué es…?» o «¿Quién es…?»</p>`;
    }
    return `<div class="clue"><div><div class="cat">${esc(C.cat)} · ${C.dd ? 'Doble: ' + (C.wager || '?') : C.value}</div>${C.q ? `<div class="q">${esc(C.q)}</div>` : ''}${C.a ? `<div class="a">${esc(C.a)}</div>` : ''}<div style="margin-top:20px">${st}</div></div></div>${jTeamsBar(V, J, C.answering ? C.answering.t : -1)}`;
  }
  if (J.fj) { const F = J.fj;
    if (J.step === 'fjw') return `<div class="scr center" style="padding-top:150px"><div><div class="banner">Final Jeopardy</div><p class="h2" style="margin-top:20px">Categoría: ${esc(F.cat)}</p><p class="lead">Cada equipo apuesta desde su celular (hasta lo que tiene)</p><div style="display:flex;gap:20px;justify-content:center;margin-top:20px">${J.teams.map((t, i) => `<span class="pill" style="${F.wagered.includes(i) ? '' : 'opacity:.4'}">${esc(t.name)} ${F.wagered.includes(i) ? '✓' : '…'}</span>`).join('')}</div></div></div>${jTeamsBar(V, J, -1)}`;
    if (J.step === 'fjq') return `<div class="clue"><div><div class="cat">Final Jeopardy · ${esc(F.cat)}</div><div class="q">${esc(F.q)}</div><div style="margin-top:20px"><span class="pill" style="font-size:40px" data-dl="${F.deadline}"></span></div><div style="display:flex;gap:16px;justify-content:center;margin-top:16px">${J.teams.map((t, i) => `<span class="pill" style="${F.answered.includes(i) ? '' : 'opacity:.4'}">${esc(t.name)} ${F.answered.includes(i) ? '✓' : '…'}</span>`).join('')}</div></div></div>${jTeamsBar(V, J, -1)}`;
    if (J.step === 'fjr') return `<div class="clue"><div><div class="cat">Respuesta: <b>${esc(F.a)}</b></div><div style="display:grid;gap:12px;margin-top:20px;font:600 34px Lora">${J.teams.map((t, i) => `<div>${esc(t.name)}: «${esc((F.answers && F.answers[i]) || '—')}» ${F.judged[i] ? '✓' : '✕'} · apostó ${(F.wagers && F.wagers[i]) || 0}</div>`).join('')}</div></div></div>${jTeamsBar(V, J, -1)}`;
  }
  return '';
}
function preView(V) {
  const P = V.pre;
  const img = `<div class="prodimg"><img src="productos/producto-${esc(P.id)}.webp" onerror="this.onerror=null;this.src='${A('regalo')}'" alt=""></div>`;
  let right = `<p class="lead muted">Producto ${P.i + 1} de ${P.n}</p><div class="h2" style="font-size:66px;margin:8px 0">${esc(P.name)}</div><div class="where">${esc(P.where)}</div>`;
  if (P.step === 'ready') right += `<p class="lead" style="margin-top:30px">¿Listos? Tienen 10 segundos para mandar su precio.</p>`;
  if (P.step === 'guess') right += `<div class="bigclock" data-dl="${P.deadline}" style="margin-top:20px"></div><p class="lead">Ya mandaron ${P.sent.length} de ${V.players.filter(p => !p.removed).length}</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">${P.sent.map(id => `<img src="${orn(V, id)}" style="height:56px" alt="">`).join('')}</div>`;
  if (P.step === 'reveal') { const gs = Object.entries(P.guesses || {}).sort((a, b) => b[1] - a[1]); right += `<div style="display:flex;gap:30px;align-items:center;margin-top:16px"><div class="pricetag">${fmt(P.price)}</div><div style="flex:1"><div class="glist">${gs.map(([id, v]) => `<div class="${P.winners.includes(id) ? 'w' : ''} ${v > P.price && !P.winners.includes(id) ? 'o' : ''}"><span>${esc(nm(V, id))}</span><span>${fmt(v)}</span></div>`).join('') || '<p class="lead">Nadie mandó precio</p>'}</div></div></div>`; }
  return `<div class="pre">${img}<div>${right}</div></div>`;
}
function basView(V) {
  const B = V.bas;
  if (B.step === 'ready') return `<div class="scr center" style="padding-top:200px"><div><div class="banner">Basta</div><p class="lead" style="margin-top:20px">Categorías: ${B.cats.map(esc).join(' · ')}</p></div></div>`;
  if (B.step === 'spin') return `<div class="scr center" style="padding-top:140px"><div><p class="lead muted">Ronda ${B.round + 1} de ${B.rounds}</p><div class="wheel spin"><b id="spinL">A</b></div><p class="h2" style="margin-top:24px">${esc(nm(V, B.spinner))}, ¡para la ruleta desde tu celular!</p></div></div>`;
  if (B.step === 'write' || B.step === 'lock') return `<div class="scr" style="display:grid;grid-template-columns:600px 1fr;gap:50px;align-items:center;padding-top:130px"><div class="wheel"><b>${esc(B.letter)}</b></div><div>${B.step === 'lock' ? `<div class="h1">¡BASTA!</div><p class="h3">${B.bastaBy ? 'Lo picó ' + esc(nm(V, B.bastaBy)) + ' · ' : ''}se cierra en <span data-dl="${B.lockAt}"></span></p>` : `<div class="h2">Con la letra ${esc(B.letter)}…</div>`}
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:24px">${B.cats.map(c => `<span class="pill">${esc(c)}</span>`).join('')}</div><p class="lead" style="margin-top:24px">Escribiendo: ${B.sent.length} de ${V.players.filter(p => !p.removed).length}</p></div></div>`;
  const ps = Object.keys(B.answers || {});
  return `<div class="scr" style="padding:120px 70px 180px"><div class="center" style="margin-bottom:14px"><span class="pill" style="font-size:34px">Letra ${esc(B.letter)} · ${B.step === 'review' ? 'revisando' : 'resultados'}</span></div>
    <table class="btable"><thead><tr><th style="width:180px">Categoría</th>${ps.map(p => `<th>${esc(nm(V, p))}</th>`).join('')}</tr></thead><tbody>${B.cats.map((c, ci) => `<tr><td style="background:var(--crema2);font-weight:700">${esc(c)}</td>${ps.map(p => { const pts = B.cell[p + '|' + ci]; const x = B.invalid[p + '|' + ci]; const nv = ((B.votes || {})[p + '|' + ci] || []).length; return `<td class="${x ? 'x' : pts ? '' : 'z'}">${esc(B.answers[p][ci] || '—')}<small>${pts || 0}${nv ? ` · ✗${nv}` : ''}</small></td>`; }).join('')}</tr>`).join('')}</tbody><tfoot><tr><td>Total</td>${ps.map(p => `<td>${B.roundPts[p] || 0}</td>`).join('')}</tr></tfoot></table>
    ${B.step === 'review' ? `<p class="lead center" style="margin-top:14px;font-size:26px">¿Alguien hizo trampa? Voten en su celular las que no valen (con ${B.need} votos se anula) · Ya revisaron ${B.voted.length} de ${ps.length}</p>` : ''}
    ${B.step === 'scored' ? `<p class="lead center" style="margin-top:14px">${B.awarded.map(([p, a]) => `${esc(nm(V, p))} +${a}`).join(' · ')}</p>` : ''}</div>`;
}
function milView(V) {
  const M = V.mil;
  if (M.step === 'ready') return `<div class="scr center" style="padding-top:160px"><div><div class="banner">La gran final</div><div style="display:flex;gap:60px;justify-content:center;margin-top:40px">${M.finalists.map(id => `<div><img src="${orn(V, id)}" style="height:180px" alt=""><div class="h3">${esc(nm(V, id))}</div></div>`).join('')}</div></div></div>`;
  const opts = M.opts.map((o, k) => { let c = ''; if (M.gone.includes(k)) c = 'gone'; else if (M.correct === k && M.ok !== null) c = 'ok'; else if (M.ok === false && M.pick === k) c = 'bad'; else if (M.pick === k) c = 'pick'; return `<div class="mo ${c}"><i>${'ABCD'[k]}</i>${esc(o)}</div>`; }).join('');
  const lad = M.ladder.map((v, i) => `<div class="${i === M.l && M.step === 'q' ? 'cur' : ''} ${i < M.l ? 'done' : ''}"><img src="${A(i === 1 ? 'medalla-estrella-dorada' : i === 4 ? 'medalla-corazon' : 'medalla-estrella-roja')}" alt="">${i + 1}. ${v} pt${v === 1 ? '' : 's'}${i === 1 ? ' · seguro' : ''}</div>`).join('');
  const votes = M.votes ? `<div class="votes">${M.votes.map((n, k) => { const t = M.votes.reduce((a, b) => a + b, 0) || 1; return `<div style="height:${Math.max(8, n / t * 160)}px"><span>${Math.round(n / t * 100)}%</span>${'ABCD'[k]}</div>`; }).join('')}</div>` : '';
  return `<div class="mil"><div><div style="display:flex;align-items:center;gap:20px;justify-content:center"><img src="${orn(V, M.cur)}" style="height:90px" alt=""><span class="h3">${esc(nm(V, M.cur))} · pregunta ${M.qn} de 5</span></div>
    <div class="card mq" style="margin-top:16px">${esc(M.q)}</div><div class="mopts">${opts}</div>
    <p class="h3 center" style="margin-top:20px;color:var(--vino);display:block">${esc(M.msg || (M.locked && M.ok === null ? 'Respuesta final…' : ''))}${M.callUntil && left(M.callUntil) ? ` · Llamada: <span data-dl="${M.callUntil}"></span>` : ''}</p>${votes}</div>
    <div><div class="ladder">${lad}</div><div style="display:flex;gap:10px;justify-content:center;margin-top:20px">${[['f', '50:50'], ['p', 'Público'], ['a', 'Amigo']].map(([k, t]) => `<span class="pill" style="font-size:22px;${M.life[k] ? 'opacity:.3;text-decoration:line-through' : ''}">${t}</span>`).join('')}</div></div></div>`;
}

// =================================================================
// CELULARES
// =================================================================
function bootPhone() {
  const isHost = ROLE === 'host';
  if (!SALA) { document.body.innerHTML = '<div class="app"><div class="pc"><h2>Falta el código de la sala</h2><p>Escanea el código de la pantalla grande.</p></div></div>'; return; }
  let pid = store.get('xmas-pid', null); if (!pid) { pid = 'p' + Math.random().toString(36).slice(2, 12); store.set('xmas-pid', pid); }
  let V = null, live = false, tab = isHost ? 'ctl' : 'play', draft = store.get('xmas-draft-' + SALA, { name: '', orn: '' }), basDraft = {}, basKey = '', editing = false, soloHost = store.get('xmas-solohost', false);
  const net = makeNet(LOCAL).join(SALA, {
    onStatus(v) { live = v; if (v) net.send({ t: 'hello', pid, role: isHost ? 'host' : 'jugador', key: KEY }); render(); },
    onData(m) { if (!m) return; if (m.t === 'v') { V = m.V; offset = V.now - Date.now(); if (isHost) { const n = !!needs(); if (n && !wasNeed && tab === 'ctl') { tab = 'play'; toast('¡Te toca jugar!'); } wasNeed = n; } render(); } if (m.t === 'err') toast(m.msg); }
  });
  const send = m => { if (!live) { toast('Sin conexión con la pantalla. Reintentando…'); return; } net.send(m); };
  const cmd = (c, a) => send({ t: 'cmd', c, a: a || {} });
  setInterval(() => document.querySelectorAll('[data-dl]').forEach(el => { const s = left(+el.dataset.dl); if (el.textContent !== String(s)) el.textContent = s; }), 300);
  const me = () => V && pl(V, pid);
  let wasNeed = false;
  let renderT = null;
  let lastKey = '', lastTouch = 0;
  ['pointerdown', 'touchstart', 'mousedown'].forEach(t => document.addEventListener(t, () => { lastTouch = Date.now(); }, { capture: true, passive: true }));
  function screenKey() {
    if (!V) return 'none'; const F = V.feu, J = V.jeo, P = V.pre, B = V.bas, M = V.mil;
    let k = tab + '|' + V.phase + '|' + (V.game || '') + '|' + editing;
    if (V.phase === 'final' && V.rob) k += V.rob.step + V.rob.turn;
    if (V.phase === 'play') {
      if (F) k += F.step + (F.round ? F.r + F.round.mode + F.round.answerer + F.round.strikes : '');
      if (J) k += J.step + (J.clue ? J.clue.key + JSON.stringify(J.clue.answering) + J.clue.buzzOpen : '');
      if (P) k += P.step + P.i; if (B) k += B.step + B.round; if (M) k += M.step + M.cur + M.qn + M.locked;
    }
    return k;
  }
  function render(force) {
    const ae = document.activeElement; const key = screenKey();
    const typing = ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && key === lastKey;
    if (!force && (typing || (Date.now() - lastTouch < 600 && key === lastKey))) { clearTimeout(renderT); renderT = setTimeout(render, 500); return; }
    // guarda lo escrito para no perderlo al redibujar
    const kept = {}; if (key === lastKey) document.querySelectorAll('input[id],textarea[id],select[id]').forEach(el => { if (el.type !== 'file') kept[el.id] = el.value; });
    lastKey = key;
    let h = `<div class="app"><div class="top"><span class="ph">${isHost ? (tab === 'ctl' ? 'Control del juego' : 'Mi juego') : 'Jugador'}</span><span class="note"><span class="dot ${live ? 'on' : ''}"></span>${live ? 'Conectado' : 'Conectando…'} · Sala ${esc(SALA)}</span></div>`;
    if (!V) h += `<div class="pc wait"><img src="${A('esfera-campana')}" alt=""><h2>Buscando la pantalla…</h2><p>Asegúrate de que la pantalla grande esté abierta.</p></div>`;
    else if (isHost && tab === 'ctl') h += hostView();
    else h += playerView();
    h += '</div>';
    if (isHost) h += `<div class="tabs"><button data-tab="ctl" class="${tab === 'ctl' ? 'on' : ''}">Controlar</button><button data-tab="play" class="${tab === 'play' ? 'on' : ''}">Jugar${V && needs() ? '<span class="badge">¡Te toca!</span>' : ''}</button></div>`;
    document.body.innerHTML = h;
    Object.entries(kept).forEach(([id, v]) => { const el = document.getElementById(id); if (el && v !== '' && el.tagName !== 'SELECT') el.value = v; });
  }
  // ¿El jugador tiene algo que hacer ahora?
  function needs() {
    if (V && me() && V.phase === 'final' && V.rob) { const R = V.rob; return (R.cur === pid && (['choose', 'target', 'roll'].includes(R.step) || (R.step === 'reto' && !!R.math))) || (R.target === pid && R.step === 'reto' && !R.math); }
    if (!V || !me() || V.phase !== 'play') return false;
    const F = V.feu, J = V.jeo, P = V.pre, B = V.bas, M = V.mil;
    if (F && F.round) { const R = F.round; if (R.answerer === pid) return true; if (R.mode === 'faceoff' && R.buzzOpen && F.front.includes(pid)) return true; }
    if (F && F.step === 'names') return true;
    if (J) { const t = J.teams.findIndex(x => x.members.includes(pid)); if (J.clue && J.clue.buzzOpen && !J.clue.out.includes(t)) return true; if (J.clue && J.clue.answering && J.clue.answering.t === t && (!J.clue.answering.p || J.clue.answering.p === pid)) return true; if (J.step === 'board' && J.picker === t) return true; if (J.step === 'dd' && J.picker === t) return true; if (J.fj && (J.step === 'fjw' || J.step === 'fjq')) return true; }
    if (P && P.step === 'guess' && !P.sent.includes(pid)) return true;
    if (B && ((B.step === 'spin' && B.spinner === pid) || B.step === 'write' || (B.step === 'review' && !B.voted.includes(pid)))) return true;
    if (M && M.cur === pid && M.step === 'q' && !M.locked) return true;
    if (M && M.votes && M.cur !== pid && !(M.voters || []).includes(pid)) return true;
    return false;
  }
  // ---------- vista del jugador ----------
  function joinView() {
    const taken = new Set(V.players.filter(p => p.id !== pid && !p.removed).map(p => p.orn));
    return `<div class="pc keep"><h2>${me() ? 'Cambia tu nombre o tu esfera' : '¡Bienvenido! ¿Quién eres?'}</h2><label class="big" for="jn">Tu nombre</label><input class="in" id="jn" maxlength="16" autocomplete="off" value="${esc(draft.name)}" placeholder="Ana">
      <p class="big" style="margin-top:14px">Escoge tu esfera</p><div class="ornpick">${D.ornaments.map(o => `<button data-orn="${o}" class="${draft.orn === o ? 'on' : ''}" ${taken.has(o) ? 'disabled' : ''} aria-label="${o}"><img src="${A(o)}" alt=""></button>`).join('')}</div>
      <button class="b pri" data-act="join">Entrar al juego</button>${isHost && !me() ? '<button class="b" data-act="solohost">Solo voy a conducir</button>' : ''}</div>`;
  }
  function wait(t, sub) { return `<div class="pc wait"><img src="${A(me() ? me().orn : 'esfera-campana')}" alt=""><h2>${t}</h2>${sub ? `<p>${sub}</p>` : ''}</div>`; }
  function meCard() { const m = me(); if (!m) return ''; const r = V.rank.indexOf(pid) + 1; return `<div class="pc mecard"><img src="${A(m.orn)}" alt=""><div style="flex:1"><div class="nm">${esc(m.name)}</div><div class="note">Vas en ${r}.º lugar</div></div><div class="pt">${m.pts}</div></div>`; }
  function playerView() {
    if (isHost && soloHost && !me()) return wait('Estás solo conduciendo', 'Si quieres jugar también, toca abajo.') + '<button class="b" data-act="unsolo">Quiero jugar</button>';
    if (!me() || editing) return joinView();
    let h = meCard();
    const P = V.phase;
    if (P === 'menu' || P === 'lobby') return h + wait('¡Ya estás dentro!', 'Busca tu esfera en el árbol de la tele. Cuando estén todos, empezamos.') + '<button class="b" data-act="edit">Cambiar nombre o esfera</button>';
    if (P === 'night' || P === 'intro') return h + wait('Mira la tele', P === 'intro' ? 'Están explicando las reglas de ' + esc(V.gameName) : 'Así va a estar la noche');
    if (P === 'results' || P === 'standings') return h + wait('Mira la tele', 'Así van los puntos');
    if (P === 'final') return h + pRob();
    if (P !== 'play') return h;
    return h + ({ feu: pFeu, jeo: pJeo, pre: pPre, bas: pBas, mil: pMil })[V.game]();
  }
  function pRob() {
    const R = V.rob, cur = R.cur, mine = (R.hold || {})[pid];
    if (R.step === 'pick') return wait('¡Escoge tu regalo!', `Te toca escoger en el lugar ${V.rank.indexOf(pid) + 1}. Ese es tu «Regalo ${mine}».`);
    if (R.step === 'end') return wait('¡Se acabaron los robos!', `Te quedas con el Regalo ${mine}. ¡Feliz Navidad!`);
    if (cur === pid) {
      if (R.step === 'choose') return `<div class="pc"><h2>¡Te toca!</h2><p>Tienes el Regalo ${mine}. ¿Quieres robar otro?</p><p class="note">Si robas, tiras el dado y tienes que cumplir lo que salga: confesar algo, un reto, unas cuentas rápidas o traer algo. Si no cumples, no robas.</p><button class="b pri" data-robw="1">Sí, quiero robar</button><button class="b" data-robw="0">Me quedo con el mío</button></div>`;
      if (R.step === 'target') return `<div class="pc"><h2>¿A quién le robas?</h2>${V.rank.filter(q => q !== pid).map(q => { const g = R.hold[q], st = (R.steals || {})[g] || 0, lk = st >= R.max; return `<button class="b" data-robt="${q}" ${lk ? 'disabled' : ''}>${esc(nm(V, q))} · Regalo ${g}${lk ? ' 🔒' : st ? ' · robado ' + st + ' vez' : ''}</button>`; }).join('')}<button class="b" data-robw="0">Mejor me quedo con el mío</button></div>`;
      if (R.step === 'roll') return `<div class="pc"><h2>Vas por el regalo de ${esc(nm(V, R.target))}</h2><p>Tira el dado para ver qué tienes que hacer.</p><button class="b pri" data-act="roll">🎲 Tirar el dado</button></div>`;
      if (R.step === 'reto' && R.math) return `<div class="pc keep"><h2>${esc(R.kind)}</h2><p class="big">¿Cuánto es ${esc(R.math.q)}?</p><p class="say">Te quedan <span data-dl="${R.math.deadline}"></span> s</p><input class="in" id="rmath" type="number" inputmode="numeric" autocomplete="off"><button class="b pri" data-act="robmath">Mandar</button></div>`;
      if (R.step === 'reto') return wait(esc(R.kind), esc(R.reto) + '<br><br>' + esc(nm(V, R.target)) + ' decide si lo cumpliste.');
      return wait('Mira la tele', esc(R.msg || ''));
    }
    if (R.target === pid && R.step === 'reto' && !R.math) return `<div class="pc"><h2>${esc(nm(V, cur))} quiere tu regalo</h2><p class="big">${esc(R.reto)}</p><p>Tú decides: ¿lo cumplió?</p><div class="row"><button class="b ok" data-robj="1">✅ Sí, que se lo lleve</button><button class="b" data-robj="0">❌ No cumplió</button></div></div>`;
    if (R.target === pid && R.step === 'roll') return wait(esc(nm(V, cur)) + ' va por tu regalo', 'Está tirando el dado…');
    return wait('Turno de ' + esc(nm(V, cur)), R.step === 'reto' ? esc(R.reto) : R.step === 'done' ? esc(R.msg) : `Tú tienes el Regalo ${mine}`);
  }
  const answerBox = (lab, act, jeo) => `<div class="pc keep"><h2>${lab}</h2><input class="in" id="ans" maxlength="60" autocomplete="off" autocapitalize="sentences" placeholder="${jeo ? '¿Qué es…? / ¿Quién es…?' : 'Escribe tu respuesta'}"><button class="b pri" data-act="${act}">Mandar respuesta</button><p class="note">${jeo ? 'Si contestas en forma de pregunta («¿Quién es Freud?») ganan bonus. Los errores de dedo no importan.' : 'No importa si tiene errores de dedo: el juego la entiende.'}</p></div>`;
  function pFeu() {
    const F = V.feu; const t = F.teams.findIndex(x => x.members.includes(pid)); const tn = t >= 0 ? F.teams[t].name : '';
    if (F.step === 'draw') return wait(t >= 0 ? 'Te tocó: ' + esc(tn) : 'Mira la tele', 'Busca a tu equipo en la pantalla');
    if (F.step === 'names') return `<div class="pc keep"><h2>Nombre de tu equipo</h2><p>Ahora se llama <b>${esc(tn)}</b>. Cualquiera del equipo puede cambiarlo.</p><input class="in" id="tname" maxlength="22" placeholder="Los Romeritos"><button class="b pri" data-act="tname">Ponerle este nombre</button></div>`;
    const R = F.round; if (!R) return '';
    if (R.answerer === pid) return `<div class="pc"><p class="say">¡Te toca contestar! <span data-dl="${R.deadline}"></span></p></div>` + answerBox(esc(F.q), 'answer');
    if (R.mode === 'faceoff' && R.buzzOpen && F.front.includes(pid)) return `<div class="pc"><p class="say">¡Estás al frente!</p><p style="text-align:center">${esc(F.q)}</p><button class="buzz" data-act="buzz" aria-label="Timbre"></button><p class="say">¡Toca el timbre!</p></div>`;
    if (R.mode === 'done') return wait(`¡${R.pot} puntos para ${esc(F.teams[R.winner].name)}!`, 'Mira la tele');
    const who = R.answerer ? 'Contesta ' + esc(nm(V, R.answerer)) : (R.mode === 'faceoff' ? `Pasan al frente ${esc(nm(V, F.front[0]))} y ${esc(nm(V, F.front[1]))}` : 'Mira la tele');
    return wait(who, `Tú estás en ${esc(tn)}. ${F.nextFront.includes(pid) ? '¡En la siguiente pasas al frente!' : ''}`);
  }
  function pJeo() {
    const J = V.jeo; const t = J.teams.findIndex(x => x.members.includes(pid)); const tn = t >= 0 ? J.teams[t].name : '';
    if (J.step === 'teams') return wait(t >= 0 ? 'Estás en ' + esc(tn) : 'Mira la tele', 'El host está armando los equipos');
    if (J.step === 'board') { if (J.picker !== t) return wait('Escoge ' + esc(J.teams[J.picker].name), 'Mira el tablero en la tele');
      return `<div class="pc"><h2>¡Escoge tu equipo!</h2><p>Pónganse de acuerdo y toquen categoría y valor.</p><div class="jgrid" style="grid-template-columns:repeat(${J.cats.length},1fr)">${J.cats.map(c => `<div class="h">${esc(c)}</div>`).join('')}${[0, 1, 2, 3, 4].map(v => J.cats.map((c, ci) => `<button data-pick="${ci}-${v}" ${J.used[ci + '-' + v] ? 'disabled' : ''}>${(v + 1) * 100 * J.mult}</button>`).join('')).join('')}</div></div>`; }
    const C = J.clue;
    if (J.step === 'dd') { const mine = J.teams[t] ? J.teams[t].score : 0; return J.picker === t ? `<div class="pc keep"><h2>¡Casilla doble!</h2><p>Encontraron una casilla escondida. Apuesten antes de ver la pregunta: si aciertan ganan lo que apostaron y si fallan lo pierden.</p><div class="row"><button class="b gold" data-wq="${C.value * 2}">Doble o nada (${C.value * 2})</button><button class="b gold" data-wq="${C.max}">Todo o nada (${C.max})</button></div><p class="note">O escriban otra cantidad, hasta ${C.max}:</p><input class="in" id="wager" type="number" inputmode="numeric" min="0" max="${C.max}"><button class="b pri" data-act="wager">Apostar</button></div>` : wait('Casilla doble de ' + esc(J.teams[J.picker].name), 'Están apostando'); }
    if (J.step === 'clue') {
      if (C.answering && C.answering.t === t && (!C.answering.p || C.answering.p === pid)) return `<div class="pc"><p class="say">${C.out.length || C.dd ? '¡Contesta tu equipo!' : '¡Escogieron ustedes: contestan primero!'} <span data-dl="${C.deadline}"></span></p><p class="note" style="text-align:center">Pónganse de acuerdo; cualquiera del equipo lo escribe.</p></div>` + answerBox(esc(C.q), 'janswer', true);
      if (C.buzzOpen && !C.out.includes(t)) return `<div class="pc"><p style="text-align:center">${esc(C.q)}</p><button class="buzz" data-act="buzz" aria-label="Timbre"></button><p class="say">¡Toca el timbre!</p></div>`;
      return wait(C.answering ? 'Contesta ' + esc(J.teams[C.answering.t].name) : (C.a ? 'Respuesta: ' + esc(C.a) : 'Mira la tele'), esc(C.q));
    }
    if (J.step === 'fjw') return J.fj.wagered.includes(t) ? wait('Apuesta lista', 'Esperando a los demás equipos') : `<div class="pc keep"><h2>Final Jeopardy</h2><p>Categoría: <b>${esc(J.fj.cat)}</b>. ¿Cuánto apuesta ${esc(tn)}? Hasta ${Math.max(0, J.teams[t] ? J.teams[t].score : 0)}.</p><input class="in" id="wager" type="number" inputmode="numeric" min="0"><button class="b pri" data-act="fjwager">Apostar</button></div>`;
    if (J.step === 'fjq') return J.fj.answered.includes(t) ? wait('Respuesta enviada', 'Puedes cambiarla mientras corre el tiempo') + answerBox(esc(J.fj.q), 'fj', true) : answerBox(esc(J.fj.q), 'fj', true);
    return wait('Mira la tele');
  }
  function pPre() {
    const P = V.pre;
    if (P.step === 'ready') return wait('¡Prepárate!', 'Vas a tener 10 segundos para mandar tu precio');
    if (P.step === 'guess') return `<div class="pc keep"><p class="say"><span data-dl="${P.deadline}"></span></p><h2>${esc(P.name)}</h2><p>${esc(P.where)}</p><input class="in" id="price" type="number" inputmode="numeric" placeholder="$" style="font-size:28px"><button class="b pri" data-act="price">${P.sent.includes(pid) ? 'Cambiar mi precio' : 'Mandar mi precio'}</button>${P.sent.includes(pid) ? '<p class="note">Ya mandaste tu precio.</p>' : ''}</div>`;
    const mine = P.guesses && P.guesses[pid];
    return wait(P.winners.includes(pid) ? '¡Le atinaste! +1' : 'Costaba ' + fmt(P.price), mine !== undefined ? 'Tú dijiste ' + fmt(mine) + (mine > P.price ? ' · te pasaste' : '') : 'No mandaste precio');
  }
  function pBas() {
    const B = V.bas;
    if (B.step === 'ready') return wait('Basta', 'Categorías: ' + B.cats.map(esc).join(', '));
    if (B.step === 'spin') return B.spinner === pid ? `<div class="pc"><h2>¡Te toca!</h2><p>Detén la ruleta cuando quieras.</p><button class="buzz" data-act="stop" aria-label="Parar la ruleta"></button><p class="say">¡Para la ruleta!</p></div>` : wait('Está girando la ruleta…', esc(nm(V, B.spinner)) + ' la va a detener');
    const k = B.round + B.letter; if (basKey !== k) { basKey = k; basDraft = store.get('xmas-bas-' + SALA + k, {}); }
    if (B.step === 'write' || B.step === 'lock') {
      const full = B.cats.every((c, i) => (basDraft[i] || '').trim());
      return `<div class="pc keep"><h2>Letra ${esc(B.letter)}</h2>${B.step === 'lock' ? `<p class="say">¡Basta! Se cierra en <span data-dl="${B.lockAt}"></span></p>` : ''}${B.cats.map((c, i) => `<label class="note" for="bc${i}" style="display:block;margin-top:8px">${esc(c)}</label><input class="in" id="bc${i}" data-bas="${i}" maxlength="40" autocomplete="off" value="${esc(basDraft[i] || '')}" style="margin-top:2px">`).join('')}
        ${B.step === 'write' ? `<button class="b pri" data-act="basta" ${full ? '' : 'disabled'}>¡BASTA!</button><p class="note">${full ? '¡Ya puedes picar Basta!' : 'Llena todas para poder picar Basta.'}</p>` : ''}</div>`;
    }
    const pts = B.roundPts ? (B.roundPts[pid] || 0) : 0;
    if (B.step === 'review' && B.answers) {
      const others = Object.keys(B.answers).filter(p => p !== pid); const done = B.voted.includes(pid);
      return `<div class="pc"><h2>¿Alguien hizo trampa?</h2><p class="note">Toca las respuestas que NO valen (inventadas, que no existen o que no son de esa categoría). Con ${B.need} votos se anulan. Llevas ${pts} puntos.</p>
        ${B.cats.map((c, ci) => { const items = others.filter(p => (B.answers[p][ci] || '').trim()); if (!items.length) return ''; return `<p class="big" style="margin:14px 0 4px">${esc(c)}</p>${items.map(p => { const k = p + '|' + ci; const vs = (B.votes || {})[k] || []; const mineV = vs.includes(pid); const x = (B.invalid || {})[k]; return `<button class="b ${mineV ? 'open' : ''}" style="font-size:15px;text-align:left;min-height:44px;margin:4px 0" data-bvote="${k}">${mineV ? '✗ ' : ''}${esc(B.answers[p][ci])} <span class="note">· ${esc(nm(V, p))}${vs.length ? ' · ✗' + vs.length : ''}${x ? ' · anulada' : ''}</span></button>`; }).join('')}`; }).join('')}
        <button class="b ${done ? '' : 'pri'}" data-act="bdone" style="margin-top:14px">${done ? '✓ Ya revisé (puedes seguir cambiando)' : 'Ya revisé'}</button></div>`;
    }
    return wait('Hiciste ' + pts + ' puntos', 'Mira la tabla en la tele');
  }
  function pMil() {
    const M = V.mil;
    if (M.step === 'ready') return wait(M.finalists.includes(pid) ? '¡Estás en la final!' : 'La gran final', 'Juegan: ' + M.finalists.map(id => esc(nm(V, id))).join(', '));
    if (M.cur === pid && M.step === 'q') {
      return `<div class="pc"><h2>${esc(M.q)}</h2>${M.opts.map((o, k) => M.gone.includes(k) ? '' : `<button class="b ${M.correct === k && M.ok !== null ? 'ok' : M.pick === k ? 'gold' : ''}" data-mk="${k}" ${M.locked ? 'disabled' : ''}>${'ABCD'[k]}: ${esc(o)}</button>`).join('')}
        ${M.locked ? `<p class="say">${M.ok === null ? 'Respuesta final…' : esc(M.msg)}</p>` : `<button class="b pri" data-act="mfinal" ${M.pick === null ? 'disabled' : ''}>Respuesta final</button><div class="row" style="--c:3">${[['f', '50:50'], ['p', 'Público'], ['a', 'Amigo']].map(([k, t]) => `<button class="b" data-life="${k}" ${M.life[k] ? 'disabled' : ''}>${t}</button>`).join('')}</div><button class="b" data-act="mquit">Me retiro con lo que llevo</button>`}</div>`;
    }
    if (M.votes && M.cur !== pid) return (M.voters || []).includes(pid) ? wait('Voto enviado') : `<div class="pc"><h2>¡Ayuda a ${esc(nm(V, M.cur))}!</h2><p>${esc(M.q)}</p>${M.opts.map((o, k) => M.gone.includes(k) ? '' : `<button class="b" data-vote="${k}">${'ABCD'[k]}: ${esc(o)}</button>`).join('')}</div>`;
    return wait(M.cur ? 'Juega ' + esc(nm(V, M.cur)) : 'Mira la tele', M.msg ? esc(M.msg) : '');
  }

  // ---------- vista del host ----------
  const NEXT = {
    menu: 'Abrir la sala', lobby: 'Ya estamos todos', night: 'Empezar el primer juego', intro: '¡A jugar!', results: 'Ver cómo van', standings: 'Siguiente juego', final: 'Siguiente turno'
  };
  function nextLabel() {
    if (V.phase === 'standings' && V.gi + 1 >= V.games.length) return 'Ir al final';
    if (V.phase === 'final' && V.rob) return { pick: 'Empezar los robos', end: null, done: 'Siguiente turno' }[V.rob.step] !== undefined ? { pick: 'Empezar los robos', end: null, done: 'Siguiente turno' }[V.rob.step] : 'Saltar este turno';
    if (V.phase !== 'play') return NEXT[V.phase] || 'Siguiente';
    const F = V.feu, J = V.jeo, P = V.pre, B = V.bas, M = V.mil;
    if (F) { if (F.step === 'draw') return 'Así quedan, siguiente'; if (F.step === 'names') return 'Empezar las preguntas'; const R = F.round; if (R && R.mode !== 'done') return null; if (R && !F.round.tiles.every(t => t.o)) return 'Ver todas las respuestas'; return F.left > 0 ? 'Siguiente pregunta' : 'Terminar el juego'; }
    if (J) { if (J.step === 'teams') return 'Equipos listos'; if (J.step === 'board') return 'Saltar a la final'; if (J.step === 'dd') return null; if (J.step === 'clue') return J.clue.a || J.clue.result ? 'Volver al tablero' : 'Nadie sabe: revelar'; if (J.step === 'fjw') return 'Mostrar la pregunta final'; if (J.step === 'fjq') return 'Revelar respuestas'; if (J.step === 'fjr') return 'Terminar Jeopardy'; }
    if (P) return P.step === 'ready' ? 'Empezar (10 s)' : P.step === 'guess' ? 'Cerrar y revelar' : (P.i + 1 < P.n ? 'Siguiente producto' : 'Terminar el juego');
    if (B) return { ready: 'Girar la ruleta', spin: 'Parar la ruleta yo', write: 'Picar Basta por todos', lock: 'Calificar ya', review: 'Dar los puntos', scored: B.round + 1 < B.rounds ? 'Siguiente ronda' : 'Terminar el juego' }[B.step];
    if (M) { if (M.step === 'ready') return 'Empezar la final'; if (M.step === 'q') return M.locked && M.ok === null ? 'Revelar ya' : M.ok ? 'Siguiente pregunta' : null; if (M.step === 'out') return 'Siguiente finalista'; }
    return 'Siguiente';
  }
  const PH = { menu: 'Menú', lobby: 'Sala de espera', night: 'Presentación', intro: 'Reglas', play: 'Jugando', results: 'Resultado', standings: 'Así van', final: 'Final' };
  function hostView() {
    if (!V) return '';
    let h = `<div class="pc"><p class="note" style="margin:0">${esc(PH[V.phase] || '')}${V.phase !== 'menu' && V.phase !== 'lobby' ? ' · ' + esc(V.gameName) : ''}</p>`;
    const nl = nextLabel(); if (nl) h += `<button class="b pri" data-cmd="next" style="min-height:70px;font-size:22px">${esc(nl)}</button>`;
    h += `<div class="row"><button class="b" data-cmd="pause">${V.paused ? '▶ Seguir' : '⏸ Pausar'}</button><button class="b" data-cmd="back">↩ Atrás</button></div>${V.phase === 'play' ? '<button class="b" data-act="endnow">⏭ Terminar este juego ya</button>' : ''}</div>`;
    h += hostContext();
    h += `<details class="pc"><summary>Marcador y jugadores</summary><div class="plist">${V.players.map(p => `<div class="prow ${p.removed ? 'rm' : ''}"><img src="${A(p.orn)}" alt=""><div><b>${esc(p.name)}</b> · ${p.pts} pts</div><div class="ctr"><button data-pts="${p.id}" data-d="-1" aria-label="Quitar un punto">−</button><button data-pts="${p.id}" data-d="1" aria-label="Dar un punto">+</button><button data-rm="${p.id}" aria-label="${p.removed ? 'Regresar' : 'Sacar'} a ${esc(p.name)}">${p.removed ? '↺' : '✕'}</button></div></div>`).join('')}</div><p class="note">✕ saca a un jugador del juego; ↺ lo regresa.</p></details>`;
    h += `<details class="pc"><summary>Cuánto vale cada cosa</summary><div class="ref">${POINTS.map(p => `<p><b>${p[0]}:</b> ${p[1]}</p>`).join('')}<p><b>Millonario:</b> 1, 2, 3, 5 u 8 puntos según la pregunta; si falla después de la 2.ª se queda con 2.</p></div></details>`;
    h += `<details class="pc"><summary>Ajustes</summary>${hostSettings()}</details>`;
    h += `<details class="pc"><summary>🔄 Reiniciar el juego</summary><p class="note">Regresa todo al menú principal y los puntos a cero. Toca dos veces para confirmar.</p><button class="b" data-reset="keep">Reiniciar con los mismos jugadores</button><button class="b" data-reset="all">Reiniciar y borrar a todos</button></details>`;
    return h;
  }
  const pbtns = (ids, attr, extra) => `<div class="row" style="--c:2">${ids.map(id => `<button class="b" ${attr}="${id}" ${extra || ''}>${esc(nm(V, id))}</button>`).join('')}</div>`;
  const sayBox = (act, lab) => `<div class="keep"><input class="in" id="say" maxlength="60" placeholder="${lab}"><button class="b" data-act="${act}">Mandar lo que dijo</button></div>`;
  function hostContext() {
    const P = V.phase;
    if (P === 'menu') return `<div class="pc"><h2>Hola, host</h2><p>Abre la sala para que entren los jugadores. Tú también puedes jugar: ve a la pestaña «Jugar» y escoge tu esfera.</p></div>`;
    if (P === 'lobby') return `<div class="pc"><h2>${V.players.filter(p => !p.removed).length} jugadores dentro</h2><p>${V.players.filter(p => !p.removed).map(p => esc(p.name)).join(', ') || 'Todavía nadie'}</p><p class="note">Cuando estén todos, toca «Ya estamos todos».</p></div>`;
    if (P === 'final' && V.rob) {
      const R = V.rob; if (R.step === 'pick' || R.step === 'end') return `<div class="pc"><h2>${R.step === 'pick' ? 'Que escojan regalo en orden' : 'Se acabaron los robos'}</h2><p>${V.rank.map((id, i) => `${i + 1}. ${esc(nm(V, id))}`).join('<br>')}</p></div>`;
      let h = `<div class="pc"><h2>Robo · turno de ${esc(nm(V, R.cur))}</h2><p class="note">Vuelta ${R.lap} de ${R.laps}. Todo se hace desde el celular de cada quien; aquí puedes ayudar si alguien se traba.</p>`;
      if (R.step === 'choose') h += `<div class="row"><button class="b" data-hrobw="1">Va a robar</button><button class="b" data-hrobw="0">Se queda</button></div>`;
      if (R.step === 'target') h += `<p>¿A quién le roba?</p><div class="row" style="--c:2">${V.rank.filter(q => q !== R.cur).map(q => { const lk = ((R.steals || {})[R.hold[q]] || 0) >= R.max; return `<button class="b" data-hrobt="${q}" ${lk ? 'disabled' : ''}>${esc(nm(V, q))}${lk ? ' 🔒' : ''}</button>`; }).join('')}</div>`;
      if (R.step === 'roll') h += `<button class="b" data-cmd="roll">🎲 Tirar el dado por ${esc(nm(V, R.cur))}</button>`;
      if (R.step === 'reto') h += `<p class="big">${esc(R.kind)}</p><p>${esc(R.reto)}</p><div class="row"><button class="b ok" data-hrobj="1">✅ Cumplió: roba</button><button class="b" data-hrobj="0">❌ No cumplió</button></div>`;
      if (R.step === 'done') h += `<p class="big">${esc(R.msg)}</p><p class="note">Pasa solo al siguiente turno en unos segundos.</p>`;
      return h + '</div>';
    }
    if (P !== 'play') return '';
    const F = V.feu, J = V.jeo, Pr = V.pre, B = V.bas, M = V.mil;
    if (F) {
      if (F.step === 'draw') return `<div class="pc"><h2>Equipos</h2>${V.players.filter(p => !p.removed).map(p => { const t = F.teams[0].members.includes(p.id) ? 0 : 1; return `<div class="prow"><img src="${A(p.orn)}" alt=""><b>${esc(p.name)}</b><button class="b" style="margin:0;min-height:40px;font-size:15px" data-feuteam="${p.id}" data-t="${1 - t}">${esc(F.teams[t].name)} ⇄</button></div>`; }).join('')}<button class="b" data-cmd="feuReshuffle">Volver a sortear</button></div>`;
      if (F.step === 'names') return `<div class="pc"><h2>Nombres</h2><p>${F.teams.map(t => esc(t.name)).join(' contra ')}</p><p class="note">Los equipos los escriben en sus celulares.</p></div>`;
      const R = F.round; let h = `<div class="pc"><h2>${esc(F.q)}</h2><p>Pregunta ${F.r + 1} de ${F.rounds} · En la bolsa ${R.pot} · Strikes ${R.strikes}</p><p>${esc(F.teams[0].name)} ${F.scores[0]} · ${esc(F.teams[1].name)} ${F.scores[1]}</p>`;
      if (R.mode === 'faceoff' && R.buzzOpen) h += `<p class="big">Al frente: ${esc(nm(V, F.front[0]))} y ${esc(nm(V, F.front[1]))}</p><p class="note">Si alguien no tiene celular, toca quién ganó el timbre:</p>${pbtns(F.front, 'data-feubuzz')}`;
      else if (R.answerer) h += `<p class="big">Contesta ${esc(nm(V, R.answerer))} · <span data-dl="${R.deadline}"></span> s</p><p class="note">Su respuesta se califica sola. Si no tiene celular, escribe lo que dijo:</p>${sayBox('feusay', 'Lo que dijo')}
        <details style="margin-top:10px"><summary class="note">Corregir a mano (sin ver respuestas)</summary><p class="note">Si el juego no la reconoció pero sí valía, destapa la casilla que crean que es:</p><div class="tiles">${R.tiles.map((t, k) => t.o ? '' : `<button class="b" data-feutile="${k}">Destapar ${k + 1}</button>`).join('')}</div><button class="b" data-cmd="feuMiss">Fue error ✕</button></details>`;
      else if (R.mode === 'done') h += `<p class="big">¡${R.pot} para ${esc(F.teams[R.winner].name)}!</p>`;
      if (R.canUndo) h += `<button class="b" data-cmd="feuUndo">Deshacer la última jugada</button>`;
      h += `</div><details class="pc keep"><summary>Agregar una pregunta</summary><input class="in" id="fq" maxlength="120" placeholder="Algo que se pierde en diciembre"><textarea class="in" id="fa" placeholder="La cartera | 35&#10;Las llaves | 25&#10;La dieta"></textarea><button class="b" data-act="feuadd">Agregar como siguiente pregunta</button><p class="note">Ojo: al escribirla ya sabes las respuestas.</p></details>`;
      return h;
    }
    if (J) {
      if (J.step === 'teams') return `<div class="pc"><h2>Arma los equipos</h2><div class="row" style="--c:3"><button class="b" data-jtc="2">2 equipos</button><button class="b" data-jtc="3">3 equipos</button><button class="b" data-jtc="4">4 (parejas)</button></div>${V.players.filter(p => !p.removed).map(p => { const t = J.teams.findIndex(x => x.members.includes(p.id)); return `<div class="prow" style="grid-template-columns:36px 1fr"><img src="${A(p.orn)}" alt=""><div><b>${esc(p.name)}</b><div class="row" style="--c:${J.teams.length}">${J.teams.map((tm, i) => `<button class="b ${i === t ? 'pri' : ''}" style="min-height:38px;font-size:14px;margin-top:4px" data-jteam="${p.id}" data-t="${i}">${esc(tm.name.replace('Equipo ', ''))}</button>`).join('')}</div></div></div>`; }).join('')}</div>`;
      let h = `<div class="pc"><p>${J.teams.map(t => `${esc(t.name)} ${t.score}`).join(' · ')}</p>`;
      if (J.step === 'board') h += `<h2>Escoge ${esc(J.teams[J.picker].name)}</h2><p class="note">Lo escogen en su celular, o tócalo tú aquí:</p><div class="jgrid" style="grid-template-columns:repeat(${J.cats.length},1fr)">${J.cats.map(c => `<div class="h">${esc(c)}</div>`).join('')}${[0, 1, 2, 3, 4].map(v => J.cats.map((c, ci) => `<button data-jpick="${ci}-${v}" ${J.used[ci + '-' + v] ? 'disabled' : ''}>${(v + 1) * 100 * J.mult}</button>`).join('')).join('')}</div>`;
      if (J.step === 'dd') h += `<h2>Casilla doble</h2><p>Apuesta ${esc(J.teams[J.picker].name)} (hasta ${J.clue.max}). Si no tienen celular, escríbela tú:</p><div class="keep"><input class="in" id="hw" type="number" inputmode="numeric"><button class="b" data-act="hwager">Apostar por ellos</button></div>`;
      if (J.step === 'clue') { const C = J.clue; h += `<h2>${esc(C.cat)} · ${C.value}</h2><p>${esc(C.q)}</p>`;
        if (C.buzzOpen) h += `<p class="note">Si alguien levantó la mano sin celular, toca quién fue:</p>${pbtns(V.players.filter(p => !p.removed && !C.out.includes(J.teams.findIndex(t => t.members.includes(p.id)))).map(p => p.id), 'data-jbuzz')}`;
        if (C.answering) h += `<p class="big">Contesta ${C.answering.p ? esc(nm(V, C.answering.p)) : esc(J.teams[C.answering.t].name)} · <span data-dl="${C.deadline}"></span> s</p>${sayBox('jsay', 'Lo que dijo')}`;
        if (C.last) h += `<p>Última: «${esc(C.last.text)}» ${C.last.ok ? '✓' : '✕'}</p><button class="b" data-cmd="jFlip">${C.last.ok ? 'Corregir: no contaba' : 'Corregir: sí contaba'}</button>`; }
      if (J.step === 'fjr') h += `<h2>Respuestas finales</h2><p>Correcta: <b>${esc(J.fj.a)}</b></p>${J.teams.map((t, i) => `<div class="prow" style="grid-template-columns:1fr auto"><div><b>${esc(t.name)}</b>: «${esc((J.fj.answers && J.fj.answers[i]) || '—')}»</div><button class="b" style="margin:0;min-height:40px" data-fjflip="${i}">${J.fj.judged[i] ? '✓' : '✕'}</button></div>`).join('')}`;
      if (J.step === 'fjw' || J.step === 'fjq') h += `<p>Faltan: ${J.teams.filter((t, i) => !(J.step === 'fjw' ? J.fj.wagered : J.fj.answered).includes(i)).map(t => esc(t.name)).join(', ') || 'nadie'}</p>`;
      return h + '</div>';
    }
    if (Pr) {
      let h = `<div class="pc"><h2>${esc(Pr.name)}</h2><p>Producto ${Pr.i + 1} de ${Pr.n}${Pr.step === 'guess' ? ` · <span data-dl="${Pr.deadline}"></span> s` : ''}</p>`;
      if (Pr.step === 'guess') { const miss = V.players.filter(p => !p.removed && !Pr.sent.includes(p.id)); h += `<p class="note">Faltan: ${miss.map(p => esc(p.name)).join(', ') || 'nadie'}</p>${miss.length ? `<div class="keep"><select class="in" id="pfor">${miss.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><input class="in" id="pval" type="number" inputmode="numeric" placeholder="$"><button class="b" data-act="prefor">Poner su precio</button></div>` : ''}`; }
      if (Pr.step === 'reveal') h += `<p class="big">Costaba ${fmt(Pr.price)} · ganó ${Pr.winners.map(id => esc(nm(V, id))).join(' y ') || 'nadie'}</p>`;
      return h + '</div>';
    }
    if (B) {
      let h = `<div class="pc"><h2>Basta · ronda ${B.round + 1} de ${B.rounds}${B.letter ? ' · letra ' + esc(B.letter) : ''}</h2>`;
      if (B.step === 'spin') h += `<p>La detiene ${esc(nm(V, B.spinner))} desde su celular.</p>`;
      if (B.step === 'write') h += `<p>Escribiendo: ${B.sent.length} de ${V.players.filter(p => !p.removed).length}</p>`;
      if (B.step === 'review') h += `<p class="note">Los jugadores votan desde su celular las que no valen (con ${B.need} votos se anula; ya revisaron ${B.voted.length}). Si hace falta, toca una respuesta para anularla o darla por buena tú.</p>${Object.keys(B.answers).map(p => `<p class="big" style="margin-top:12px">${esc(nm(V, p))} · ${B.roundPts[p] || 0}</p><div class="tiles">${B.cats.map((c, ci) => `<button class="b ${B.invalid[p + '|' + ci] ? 'open' : ''}" style="font-size:14px;text-align:left" data-btog="${p}" data-c="${ci}">${esc(c)}: ${esc(B.answers[p][ci] || '—')} (${B.cell[p + '|' + ci] || 0})</button>`).join('')}</div>`).join('')}`;
      return h + '</div>';
    }
    if (M) {
      let h = `<div class="pc"><h2>La gran final</h2><p>Finalistas: ${M.finalists.map(id => esc(nm(V, id))).join(', ')}</p>`;
      if (M.step === 'q') { h += `<p class="big">Juega ${esc(nm(V, M.cur))} · pregunta ${M.qn}</p><p>${esc(M.q)}</p><p class="note">El finalista contesta en su celular. Si no tiene, escoge por él:</p><div class="row">${M.opts.map((o, k) => M.gone.includes(k) ? '<span></span>' : `<button class="b ${M.pick === k ? 'gold' : ''}" data-mpick="${k}" ${M.locked ? 'disabled' : ''}>${'ABCD'[k]}: ${esc(o)}</button>`).join('')}</div>`;
        if (!M.locked) h += `<button class="b ok" data-cmd="milFinal" ${M.pick === null ? 'disabled' : ''}>Respuesta final</button><div class="row" style="--c:3">${[['f', '50:50'], ['p', 'Público'], ['a', 'Amigo']].map(([k, t]) => `<button class="b" data-mlife="${k}" ${M.life[k] ? 'disabled' : ''}>${t}</button>`).join('')}</div><button class="b" data-cmd="milQuit">Se retira</button>`; }
      if (M.step === 'out') h += `<p class="big">${esc(M.msg)}</p>`;
      return h + '</div>';
    }
    return '';
  }
  function hostSettings() {
    const st = V.settings; const G = { feu: '100 Mexicanos', jeo: 'Jeopardy', pre: 'Atínale', bas: 'Basta', mil: 'Millonario' };
    const seg = (k, opts, lab) => `<p class="big" style="margin-top:12px">${lab}</p><div class="row" style="--c:${opts.length}">${opts.map(([v, t]) => `<button class="b ${String(st[k]) === String(v) ? 'pri' : ''}" data-set="${k}" data-v="${v}">${t}</button>`).join('')}</div>`;
    return `<p class="big">Juegos de esta noche</p><div class="row" style="--c:2">${Object.keys(G).map(g => `<button class="b ${st.games.includes(g) ? 'pri' : ''}" data-game="${g}">${G[g]}</button>`).join('')}</div>
      ${seg('feuPasses', [[2, '2'], [3, '3'], [4, '4']], '100 Mexicanos: veces al frente por persona')}${seg('jeoRounds', [[1, '1 tablero'], [2, '2 tableros']], 'Jeopardy')}${seg('bastaRounds', [[2, '2'], [3, '3'], [4, '4']], 'Basta: rondas')}${seg('finalists', [[2, '2'], [3, '3']], 'Millonario: finalistas')}${seg('robLaps', [[1, '1 vuelta'], [2, '2 vueltas']], 'Ronda de robo')}${seg('sound', [[true, 'Sonido'], [false, 'Sin sonido']], 'Sonido en la tele')}
      <p class="big" style="margin-top:12px">Saltar a un juego</p><div class="row" style="--c:2">${st.games.map(g => `<button class="b" data-goto="${g}">${G[g]}</button>`).join('')}</div><p class="note">Saltar reinicia ese juego desde sus reglas.</p>`;
  }

  // ---------- eventos ----------
  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const d = b.dataset; const val = id => { const el = $('#' + id); return el ? el.value.trim() : ''; };
    if (d.tab) { tab = d.tab; render(true); return; }
    if (d.orn) { draft.orn = d.orn; draft.name = val('jn') || draft.name; store.set('xmas-draft-' + SALA, draft); render(true); return; }
    if (d.cmd) { cmd(d.cmd); return; }
    if (d.act === 'join') { draft.name = val('jn'); if (!draft.name) return toast('Escribe tu nombre'); if (!draft.orn) return toast('Escoge una esfera'); store.set('xmas-draft-' + SALA, draft); editing = false; send({ t: 'join', name: draft.name, orn: draft.orn }); if (isHost) { soloHost = false; store.set('xmas-solohost', false); } return; }
    if (d.act === 'solohost') { soloHost = true; store.set('xmas-solohost', true); tab = 'ctl'; render(true); return; }
    if (d.act === 'unsolo') { soloHost = false; store.set('xmas-solohost', false); render(true); return; }
    if (d.act === 'edit') { editing = true; render(true); return; }
    if (d.act === 'buzz') { send({ t: 'buzz' }); try { navigator.vibrate && navigator.vibrate(80); } catch (x) {} b.disabled = true; return; }
    if (d.act === 'answer' || d.act === 'janswer') { const v = val('ans'); if (!v) return toast('Escribe tu respuesta'); send({ t: 'answer', text: v }); document.activeElement && document.activeElement.blur(); return; }
    if (d.act === 'fj') { const v = val('ans'); if (!v) return toast('Escribe tu respuesta'); send({ t: 'fj', text: v }); toast('Respuesta enviada'); return; }
    if (d.act === 'tname') { const v = val('tname'); if (v) { send({ t: 'teamname', v }); toast('Listo'); } return; }
    if (d.wq) { send({ t: 'wager', v: +d.wq }); return; }
    if (d.act === 'wager' || d.act === 'fjwager') { send({ t: 'wager', v: +val('wager') || 0 }); return; }
    if (d.act === 'price') { const v = val('price'); if (!v) return toast('Escribe un precio'); send({ t: 'price', v }); toast('Precio enviado: ' + fmt(v)); document.activeElement && document.activeElement.blur(); return; }
    if (d.act === 'stop') { send({ t: 'stop' }); return; }
    if (d.act === 'basta') { send({ t: 'basta', a: basDraft }); return; }
    if (d.act === 'mfinal') { send({ t: 'mfinal' }); return; }
    if (d.act === 'mquit') { send({ t: 'mquit' }); return; }
    if (d.act === 'roll') { send({ t: 'roll' }); return; }
    if (d.robw !== undefined) { send({ t: 'robWant', v: d.robw === '1' }); return; }
    if (d.robt) { send({ t: 'robTarget', q: d.robt }); return; }
    if (d.robj !== undefined) { send({ t: 'robJudge', v: d.robj === '1' }); return; }
    if (d.act === 'robmath') { const v = val('rmath'); if (!v) return toast('Escribe el resultado'); send({ t: 'robMath', v }); return; }
    if (d.bvote) { send({ t: 'bvote', k: d.bvote }); return; }
    if (d.act === 'bdone') { send({ t: 'bdone' }); toast('¡Gracias!'); return; }
    if (d.hrobw !== undefined) { cmd('robWant', { v: d.hrobw === '1' }); return; }
    if (d.hrobt) { cmd('robTarget', { q: d.hrobt }); return; }
    if (d.hrobj !== undefined) { cmd('robJudge', { v: d.hrobj === '1' }); return; }
    if (d.pick) { send({ t: 'pick', key: d.pick }); return; }
    if (d.mk !== undefined) { send({ t: 'mpick', k: +d.mk }); return; }
    if (d.life) { send({ t: 'mlife', k: d.life }); return; }
    if (d.vote !== undefined) { send({ t: 'vote', k: +d.vote }); return; }
    // host
    if (d.pts) { cmd('pts', { p: d.pts, d: +d.d }); return; }
    if (d.rm) { cmd('remove', { p: d.rm }); return; }
    if (d.set) { const v = d.v === 'true' ? true : d.v === 'false' ? false : +d.v; cmd('settings', { [d.set]: v }); return; }
    if (d.game) { const gs = V.settings.games; const nx = gs.includes(d.game) ? gs.filter(x => x !== d.game) : ['feu', 'jeo', 'pre', 'bas', 'mil'].filter(x => gs.includes(x) || x === d.game); if (nx.length) cmd('settings', { games: nx }); return; }
    if (d.goto) { cmd('goto', { g: d.goto }); return; }
    if (d.feuteam) { cmd('feuTeam', { p: d.feuteam, t: +d.t }); return; }
    if (d.feubuzz) { cmd('feuBuzzFor', { p: d.feubuzz }); return; }
    if (d.feutile) { cmd('feuTile', { k: +d.feutile }); return; }
    if (d.reset) { if (b.dataset.sure) { cmd('reset', { keepPlayers: d.reset === 'keep' }); toast('Juego reiniciado'); } else { b.dataset.sure = 1; b.textContent = '¿Seguro? Toca otra vez para reiniciar'; } return; }
    if (d.act === 'endnow') { if (b.dataset.sure) cmd('endNow'); else { b.dataset.sure = 1; b.textContent = '¿Seguro? Se reparten los puntos como van. Toca otra vez'; } return; }
    if (d.act === 'feusay') { const v = val('say'); if (v) cmd('feuSay', { text: v }); return; }
    if (d.act === 'feuadd') { cmd('feuAdd', { q: val('fq'), a: $('#fa') ? $('#fa').value : '' }); toast('Pregunta agregada'); return; }
    if (d.jtc) { cmd('jTeamCount', { n: +d.jtc }); return; }
    if (d.jteam) { cmd('jTeam', { p: d.jteam, t: +d.t }); return; }
    if (d.jpick) { cmd('jPick', { key: d.jpick }); return; }
    if (d.jbuzz) { cmd('jBuzzFor', { p: d.jbuzz }); return; }
    if (d.act === 'jsay') { const v = val('say'); if (v) cmd('jSay', { text: v }); return; }
    if (d.act === 'hwager') { cmd('jWager', { v: +val('hw') || 0 }); return; }
    if (d.fjflip !== undefined) { cmd('fjFlip', { t: +d.fjflip }); return; }
    if (d.act === 'prefor') { const p = val('pfor'), v = val('pval'); if (p && v) cmd('preFor', { p, v }); return; }
    if (d.btog) { cmd('basToggle', { p: d.btog, c: +d.c }); return; }
    if (d.mpick !== undefined) { cmd('milPickFor', { k: +d.mpick }); return; }
    if (d.mlife) { cmd('milLife', { k: d.mlife }); return; }
  });
  let basT = null;
  document.addEventListener('input', e => {
    const i = e.target;
    if (i.id === 'jn') { draft.name = i.value; store.set('xmas-draft-' + SALA, draft); } if (i.dataset && i.dataset.bas !== undefined) { basDraft[i.dataset.bas] = i.value; store.set('xmas-bas-' + SALA + basKey, basDraft); clearTimeout(basT); basT = setTimeout(() => send({ t: 'bastaAns', a: basDraft }), 600);
      const full = V && V.bas && V.bas.cats.every((c, k) => (basDraft[k] || '').trim()); const btn = document.querySelector('[data-act="basta"]'); if (btn) btn.disabled = !full; }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'ans') { const b = document.querySelector('[data-act="answer"],[data-act="janswer"],[data-act="fj"]'); b && b.click(); } if (e.key === 'Enter' && e.target.id === 'price') { const b = document.querySelector('[data-act="price"]'); b && b.click(); } });
  document.addEventListener('focusout', () => { clearTimeout(renderT); renderT = setTimeout(render, 700); });
  render();
}

// letras girando en la ruleta del Basta (solo pantalla)
setInterval(() => { const el = document.getElementById('spinL'); if (el) el.textContent = D.bastaLetters[Math.floor(Math.random() * D.bastaLetters.length)]; }, 90);

if (ROLE === 'tv') bootTV(); else bootPhone();
})();
