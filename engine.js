// Motor del juego: vive en la pantalla grande. Guarda el estado, califica y reparte puntos.
window.makeEngine = function (D, onChange) {
  const now = () => Date.now();
  const rnd = n => Math.floor(Math.random() * n);
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const code4 = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[rnd(24)]).join('');
  const key6 = () => Math.random().toString(36).slice(2, 8);

  // ---------- calificar texto ----------
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const STOP = new Set('el la los las un una unos unas de del al a y o en con por para que tu te mi mis su sus se le lo es son fue fueron era eran quien quienes cual cuales donde cuando ver hacer tomar ir dar poner algo muy mas tus'.split(' '));
  const QFORM = /^\s*(¿|(que|quien|quienes|cual|cuales|donde|cuando|cuanto|cuantos)\b)/;
  const isQ = t => /[¿?]/.test(String(t)) || QFORM.test(norm(t));
  const toks = s => norm(s).split(' ').filter(w => w && !STOP.has(w));
  function lev(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let p = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; }
  const close = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && lev(a, b) <= (Math.max(a.length, b.length) >= 7 ? 2 : 1)) || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b)) || (a.length > 3 && b.length > 3 && (a.endsWith('s') ? a.slice(0, -1) : a) === (b.endsWith('s') ? b.slice(0, -1) : b));
  function sim(typed, answer) {
    const nt = norm(typed), na = norm(answer);
    if (!nt || !na) return 0;
    if (nt === na) return 1;
    if (na.length >= 4 && (nt.includes(na) || (nt.length >= 4 && na.includes(nt)))) return 0.9;
    const t = toks(typed), a = toks(answer);
    if (!t.length || !a.length) return 0;
    const hit = a.filter(w => t.some(x => close(x, w))).length;
    return hit / a.length;
  }
  const judgeOne = (typed, answer, alias) => [answer, ...(alias || [])].some(a => sim(typed, a) >= 0.5);
  function judgeFeud(typed, answers, open) {
    let best = -1, bs = 0;
    answers.forEach((a, k) => { if (open[k]) return; const s = Math.max(...[a[0], ...(a[2] || [])].map(x => sim(typed, x))); if (s >= 0.5 && (s > bs || (s === bs && best >= 0 && a[1] > answers[best][1]))) { best = k; bs = s; } });
    return best;
  }

  // ---------- estado ----------
  let S = null;
  try { S = JSON.parse(localStorage.getItem('xmas-state') || 'null'); } catch (e) {}
  if (!S || S.v !== 3) S = fresh();
  if (!S.settings.jr2) { S.settings.jeoRounds = 2; S.settings.jr2 = true; }
  try { localStorage.setItem('xmas-state', JSON.stringify(S)); } catch (e) {}
  function fresh(keep) {
    return {
      v: 3, code: (keep && keep.code) || code4(), key: (keep && keep.key) || key6(),
      phase: 'menu', paused: false, players: {}, order: [], hist: [],
      settings: { games: ['feu', 'jeo', 'pre', 'bas', 'mil'], feuPasses: 3, jeoTeams: 4, jeoRounds: 2, finalists: 3, bastaRounds: 3, sound: true },
      gi: 0, g: {}, ev: [], evId: 0, last: null
    };
  }
  let saveT = null;
  function changed() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem('xmas-state', JSON.stringify(S)); } catch (e) {} }, 200); onChange && onChange(); }
  function ev(type, text, extra) { S.evId++; S.ev = [...S.ev.slice(-6), { id: S.evId, type, text: text || '', t: now(), ...(extra || {}) }]; }

  const active = () => S.order.filter(p => S.players[p] && !S.players[p].removed);
  const nameOf = p => (S.players[p] && S.players[p].name) || '—';
  function addPts(p, d, why) { if (!S.players[p] || !d) return; S.players[p].pts += d; S.hist.push({ p, d, why, t: now() }); }
  const ranking = () => active().sort((a, b) => S.players[b].pts - S.players[a].pts || S.order.indexOf(a) - S.order.indexOf(b));
  const GAMES = { feu: '100 Mexicanos Dijeron', jeo: 'Jeopardy', pre: 'Atínale al precio', bas: 'Basta', mil: '¿Quién quiere ser millonario?' };
  const curGame = () => S.settings.games[S.gi];

  // ---------- jugadores ----------
  function join(pid, name, orn) {
    name = String(name || '').trim().slice(0, 16); if (!name) return 'Escribe tu nombre';
    const taken = Object.entries(S.players).find(([q, x]) => q !== pid && !x.removed && x.orn === orn);
    if (taken) return 'Esa esfera ya la escogió ' + taken[1].name;
    if (!S.players[pid]) { S.players[pid] = { name, orn, pts: 0, removed: false }; S.order.push(pid); ev('join', name + ' entró al juego', { orn }); }
    else { S.players[pid].name = name; S.players[pid].orn = orn; S.players[pid].removed = false; }
    return null;
  }

  // ---------- flujo general ----------
  function goIntro() { S.phase = 'intro'; S.g = {}; ev('banner', GAMES[curGame()]); }
  function startGame() { S.phase = 'play'; const g = curGame(); INIT[g](); }
  function endGame(summary) { S.phase = 'results'; S.results = summary; ev('win', summary.title); }
  function afterResults() { S.phase = 'standings'; }
  function afterStandings() {
    if (S.gi + 1 < S.settings.games.length) { S.gi++; goIntro(); }
    else { S.phase = 'final'; S.rob = { turn: 0, lap: 1, die: 0, rule: '' }; ev('win', 'Fin del juego'); }
  }

  // ===================== 100 MEXICANOS =====================
  const INIT = {};
  INIT.feu = () => {
    const ps = shuffle(active()); const A = ps.filter((_, i) => i % 2 === 0), B = ps.filter((_, i) => i % 2 === 1);
    const n = Math.max(A.length, B.length) * S.settings.feuPasses;
    S.g = { step: 'draw', teams: [{ name: 'Equipo Estrella', members: A }, { name: 'Equipo Corazón', members: B }], scores: [0, 0], r: 0, rounds: Math.max(1, n), qOrder: shuffle(D.feud.map((_, i) => i)), extra: [], round: null, drawAt: now() };
  };
  function feuQ(r) { const g = S.g; const qi = g.qOrder[r % g.qOrder.length]; return qi < D.feud.length ? D.feud[qi] : g.extra[qi - D.feud.length]; }
  function feuFront(r) { const t = S.g.teams; return [t[0].members[r % Math.max(1, t[0].members.length)], t[1].members[r % Math.max(1, t[1].members.length)]]; }
  const teamOf = p => S.g.teams.findIndex(t => t.members.includes(p));
  function feuStartRound() {
    const g = S.g; const q = feuQ(g.r); const fr = feuFront(g.r);
    g.step = 'round';
    g.round = { open: q[1].map(() => false), strikes: 0, pot: 0, mode: 'faceoff', fronts: fr, buzzOpen: true, answerer: null, deadline: 0, fo: [], control: -1, turn: 0, last: null, winner: -1, undo: [] };
    ev('banner', `Pregunta ${g.r + 1} de ${g.rounds}`, { sub: `Pasan al frente: ${nameOf(fr[0])} contra ${nameOf(fr[1])}` });
  }
  function feuSetAnswerer(p) { const R = S.g.round; R.answerer = p; R.deadline = now() + 20000; R.buzzOpen = false; }
  function feuSnapshot() { const R = S.g.round; const copy = JSON.parse(JSON.stringify({ ...R, undo: [] })); R.undo = [...R.undo.slice(-9), { round: copy, scores: [...S.g.scores] }]; }
  function feuUndo() { const R = S.g.round; if (!R || !R.undo.length) return 'No hay nada que deshacer'; const u = R.undo.pop(); const keep = R.undo; S.g.round = { ...u.round, undo: keep }; S.g.scores = u.scores; ev('info', 'Se deshizo la última jugada'); }
  function feuBuzz(p) {
    const R = S.g.round; if (!R || R.mode !== 'faceoff' || !R.buzzOpen || !R.fronts.includes(p) || R.fo.some(f => f.p === p)) return;
    feuSetAnswerer(p); ev('buzz', nameOf(p), { pid: p });
  }
  // tile: índice destapado, -1 = error
  function feuApply(tile, text) {
    const g = S.g, R = g.round, q = feuQ(g.r); if (!R || !R.answerer || R.mode === 'done') return;
    feuSnapshot();
    const p = R.answerer; const ok = tile >= 0 && !R.open[tile];
    R.last = { p, text: text || '', ok, tile };
    if (ok) { R.open[tile] = true; R.pot += q[1][tile][1]; ev('ding', q[1][tile][0], { pts: q[1][tile][1] }); }
    else ev('strike', text ? `«${text}» no está en el tablero` : 'No está en el tablero');
    if (R.mode === 'faceoff') {
      R.fo.push({ p, rank: ok ? tile : 99 });
      if (ok && tile === 0) return feuControl(teamOf(p));
      if (R.fo.length === 1) { const other = R.fronts.find(x => x !== p); feuSetAnswerer(other); return; }
      const [a, b] = R.fo; if (a.rank === 99 && b.rank === 99) { R.fo = []; R.answerer = null; R.buzzOpen = true; R.deadline = 0; ev('info', 'Ninguno le atinó: ¡otra vez al timbre!'); return; }
      return feuControl(teamOf(a.rank <= b.rank ? a.p : b.p));
    }
    if (R.mode === 'play') {
      if (R.open.every(Boolean)) return feuFinish(R.control);
      if (!ok) { R.strikes++; if (R.strikes >= 3) { R.mode = 'steal'; const other = 1 - R.control; feuSetAnswerer(R.fronts[other]); ev('banner', '¡Tres strikes!', { sub: `${g.teams[other].name} puede robar con una respuesta` }); return; } }
      feuNextTurn(); return;
    }
    if (R.mode === 'steal') return feuFinish(ok ? 1 - R.control : R.control);
  }
  function feuControl(t) {
    const g = S.g, R = g.round; R.control = t; R.mode = 'play'; R.strikes = 0;
    const mem = g.teams[t].members; const start = Math.max(0, mem.indexOf(R.fronts[t]));
    R.turn = start; if (R.open.every(Boolean)) return feuFinish(t);
    ev('banner', `Juega ${g.teams[t].name}`, { sub: 'Contestan por turnos. Tres errores y el otro equipo puede robar.' });
    feuNextTurn(mem.length < 2);
  }
  function feuNextTurn(first) { const g = S.g, R = g.round; const mem = g.teams[R.control].members; if (!first) R.turn = (R.turn + 1) % mem.length; feuSetAnswerer(mem[R.turn]); }
  function feuFinish(w) { const g = S.g, R = g.round; R.mode = 'done'; R.winner = w; R.answerer = null; R.deadline = 0; g.scores[w] += R.pot; ev('win', `¡${R.pot} puntos para ${g.teams[w].name}!`); }
  function feuNext() {
    const g = S.g;
    if (g.step === 'draw') { g.step = 'names'; return; }
    if (g.step === 'names') { g.r = 0; feuStartRound(); return; }
    if (g.step === 'round') {
      const R = g.round;
      if (R.mode !== 'done') return 'Primero termina la ronda';
      if (!R.revealAll) { R.revealAll = true; return; }
      if (g.r + 1 < g.rounds) { g.r++; feuStartRound(); return; }
      const w = g.scores[0] === g.scores[1] ? -1 : (g.scores[0] > g.scores[1] ? 0 : 1);
      const lines = [];
      g.teams.forEach((t, i) => { const pts = w < 0 ? 3 : (i === w ? 5 : 2); t.members.forEach(p => addPts(p, pts, '100 Mexicanos')); lines.push(`${t.name}: ${g.scores[i]} → +${pts} c/u`); });
      endGame({ title: w < 0 ? '¡Empate!' : `¡Ganó ${g.teams[w].name}!`, lines });
    }
  }

  // ===================== JEOPARDY =====================
  const TEAMC = [['Rojo', 'etiqueta-roja'], ['Verde', 'etiqueta-verde'], ['Azul', 'etiqueta-azul'], ['Crema', 'etiqueta-crema']];
  INIT.jeo = () => {
    const T = Math.min(4, Math.max(2, S.settings.jeoTeams)); const ps = active();
    const teams = Array.from({ length: T }, (_, i) => ({ name: 'Equipo ' + TEAMC[i][0], tag: TEAMC[i][1], members: [], score: 0 }));
    ps.forEach((p, i) => teams[i % T].members.push(p));
    S.g = { step: 'teams', teams, round: 0, used: {}, dd: [], picker: 0, clue: null, fj: null };
  };
  const jTeamOf = p => S.g.teams.findIndex(t => t.members.includes(p));
  function jBoardStart() { const g = S.g; const cats = D.jeopardy[g.round]; const keys = []; cats.forEach((c, ci) => [1, 2, 3, 4].forEach(v => keys.push(ci + '-' + v))); g.dd = shuffle(keys).slice(0, g.round === 0 ? 1 : 2); g.used = {}; g.step = 'board'; g.clue = null; ev('banner', 'Jeopardy · ronda ' + (g.round + 1), { sub: `Escoge ${g.teams[g.picker].name}` }); }
  function jPick(key, byP) {
    const g = S.g; if (g.step !== 'board' || g.used[key]) return;
    if (byP && jTeamOf(byP) !== g.picker) return;
    const [ci, v] = key.split('-').map(Number); if (!D.jeopardy[g.round][ci]) return;
    const value = (v + 1) * 100 * (g.round + 1);
    g.used[key] = 1;
    const dd = g.dd.includes(key);
    g.clue = { key, ci, v, value, dd, wager: 0, buzzOpen: false, out: [], answering: dd ? null : { t: g.picker, p: null }, deadline: dd ? 0 : now() + 30000, revealed: false, result: null, last: null };
    g.step = dd ? 'dd' : 'clue';
    if (dd) ev('banner', '¡Casilla doble!', { sub: `${g.teams[g.picker].name} apuesta antes de ver la pregunta` }); else ev('open', '');
  }
  function jWager(p, v) {
    const g = S.g, c = g.clue; if (!c || g.step !== 'dd' || jTeamOf(p) !== g.picker) return;
    const max = Math.max(g.teams[g.picker].score, 500 * (g.round + 1)); v = Math.max(0, Math.min(max, Math.round(+v || 0)));
    c.wager = v; g.step = 'clue'; c.buzzOpen = false; c.answering = { t: g.picker, p: null }; c.deadline = now() + 30000;
    ev('info', `Apuestan ${v}`);
  }
  function jBuzz(p) {
    const g = S.g, c = g.clue; if (!c || g.step !== 'clue' || !c.buzzOpen || c.answering) return;
    const t = jTeamOf(p); if (t < 0 || c.out.includes(t)) return;
    c.answering = { t, p }; c.buzzOpen = false; c.deadline = now() + 20000; ev('buzz', nameOf(p) + ' · ' + g.teams[t].name, { pid: p });
  }
  function jAnswer(p, text) {
    const g = S.g, c = g.clue; if (!c || g.step !== 'clue' || !c.answering) return;
    if (c.answering.p && c.answering.p !== p) return;
    if (!c.answering.p && jTeamOf(p) !== c.answering.t) return;
    c.answering.p = p;
    const ans = D.jeopardy[g.round][c.ci][1][c.v][1];
    jResolve(judgeOne(text, ans, (D.jeopardyAlias || {})[ans]), text);
  }
  function jResolve(ok, text) {
    const g = S.g, c = g.clue; const t = c.answering ? c.answering.t : -1; if (t < 0) return;
    const val = c.dd ? c.wager : c.value;
    const bonus = ok && isQ(text) ? 50 * (g.round + 1) : 0;
    c.last = { t, p: c.answering.p, text: text || '', ok, bonus };
    if (ok) { g.teams[t].score += val + bonus; g.picker = t; c.revealed = true; c.result = 'ok'; c.answering = null; c.deadline = 0; ev('ding', `¡Correcto! +${val} para ${g.teams[t].name}${bonus ? ` y +${bonus} por contestar en forma de pregunta` : ''}`); }
    else {
      g.teams[t].score -= val; c.out.push(t); c.answering = null; c.deadline = 0; ev('strike', `${text ? '«' + text + '» ' : ''}No. −${val} para ${g.teams[t].name}`);
      if (c.dd || c.out.length >= g.teams.length) { c.revealed = true; c.result = 'none'; }
      else c.buzzOpen = true;
    }
  }
  function jFlip() { // el host corrige la última calificación
    const g = S.g, c = g.clue; if (!c || !c.last) return 'No hay respuesta que corregir';
    const L = c.last, val = c.dd ? c.wager : c.value, t = L.t;
    if (L.ok) { g.teams[t].score -= 2 * val + (L.bonus || 0); L.bonus = 0; L.ok = false; c.result = c.out.length + 1 >= g.teams.length ? 'none' : null; if (!c.out.includes(t)) c.out.push(t); if (c.result !== 'none' && !c.dd) { c.revealed = false; c.buzzOpen = true; } else { c.revealed = true; c.result = 'none'; } ev('info', 'Corregido: no contaba'); }
    else { L.bonus = isQ(L.text) ? 50 * (g.round + 1) : 0; g.teams[t].score += 2 * val + L.bonus; L.ok = true; c.out = c.out.filter(x => x !== t); c.revealed = true; c.result = 'ok'; c.buzzOpen = false; c.answering = null; g.picker = t; ev('ding', 'Corregido: sí contaba'); }
  }
  function jNobody() { const c = S.g.clue; if (!c) return; c.revealed = true; c.result = 'none'; c.buzzOpen = false; c.answering = null; c.deadline = 0; }
  function jNext() {
    const g = S.g;
    if (g.step === 'teams') { g.teams = g.teams.filter(t => t.members.length); g.picker = rnd(g.teams.length); jBoardStart(); return; }
    if (g.step === 'clue' || g.step === 'dd') {
      const c = g.clue; if (!c.revealed) { jNobody(); return; }
      g.clue = null; g.step = 'board';
      const total = D.jeopardy[g.round].length * 5;
      if (Object.keys(g.used).length >= total) {
        if (g.round + 1 < Math.min(S.settings.jeoRounds, D.jeopardy.length)) { g.round++; jBoardStart(); }
        else { g.step = 'fjw'; g.fj = { wagers: {}, answers: {}, judged: {}, deadline: 0 }; ev('banner', 'Final Jeopardy', { sub: 'Cada equipo apuesta desde su celular' }); }
      } else ev('info', `Escoge ${g.teams[g.picker].name}`);
      return;
    }
    if (g.step === 'board') { g.step = 'fjw'; g.fj = { wagers: {}, answers: {}, judged: {}, deadline: 0 }; ev('banner', 'Final Jeopardy', { sub: 'Cada equipo apuesta desde su celular' }); return; }
    if (g.step === 'fjw') { g.step = 'fjq'; g.fj.deadline = now() + 40000; return; }
    if (g.step === 'fjq') { g.step = 'fjr'; g.teams.forEach((t, i) => { const a = g.fj.answers[i]; g.fj.judged[i] = !!(a && judgeOne(a, D.jeopardyFinal[2], ['dickens'])); }); return; }
    if (g.step === 'fjr') {
      g.teams.forEach((t, i) => { const w = Math.min(Math.max(0, +g.fj.wagers[i] || 0), Math.max(0, t.score)); t.score += g.fj.judged[i] ? w : -w; });
      const ord = g.teams.map((t, i) => i).sort((a, b) => g.teams[b].score - g.teams[a].score);
      const award = [5, 3, 2, 1]; const lines = [];
      ord.forEach((ti, k) => { const t = g.teams[ti]; const pts = award[k] || 1; t.members.forEach(p => addPts(p, pts, 'Jeopardy')); lines.push(`${k + 1}.º ${t.name}: ${t.score} → +${pts} c/u`); });
      endGame({ title: `¡Ganó ${g.teams[ord[0]].name}!`, lines });
    }
  }
  function jFjWager(p, v) { const g = S.g; if (g.step !== 'fjw') return; const t = jTeamOf(p); if (t < 0) return; g.fj.wagers[t] = Math.max(0, Math.min(Math.max(0, g.teams[t].score), Math.round(+v || 0))); }
  function jFjAnswer(p, a) { const g = S.g; if (g.step !== 'fjq') return; const t = jTeamOf(p); if (t < 0) return; g.fj.answers[t] = String(a || '').slice(0, 60); }

  // ===================== ATÍNALE =====================
  INIT.pre = () => { S.g = { order: shuffle(D.products.map((_, i) => i)), i: 0, step: 'ready', deadline: 0, guesses: {}, winners: [] }; };
  function preStart() { const g = S.g; g.step = 'guess'; g.guesses = {}; g.winners = []; g.deadline = now() + 10000; ev('open', ''); }
  function preGuess(p, v) { const g = S.g; if (g.step !== 'guess' || !S.players[p]) return; const n = Math.round(parseFloat(String(v).replace(/[^0-9.]/g, ''))); if (!isFinite(n) || n < 0) return; g.guesses[p] = n; }
  function preReveal() {
    const g = S.g; g.step = 'reveal'; g.deadline = 0; const price = D.products[g.order[g.i]][3];
    const e = Object.entries(g.guesses); if (!e.length) { g.winners = []; return; }
    const under = e.filter(([, v]) => v <= price); const pool = under.length ? under : e;
    const best = Math.min(...pool.map(([, v]) => Math.abs(price - v)));
    g.winners = pool.filter(([, v]) => Math.abs(price - v) === best).map(([p]) => p);
    g.winners.forEach(p => addPts(p, 1, 'Atínale'));
    ev('win', g.winners.length ? '¡Le atinó ' + g.winners.map(nameOf).join(' y ') + '!' : 'Nadie mandó precio');
  }
  function preNext() {
    const g = S.g;
    if (g.step === 'ready') return preStart();
    if (g.step === 'guess') return preReveal();
    if (g.step === 'reveal') {
      if (g.i + 1 < g.order.length) { g.i++; return preStart(); }
      const tally = {}; S.hist.filter(h => h.why === 'Atínale').forEach(h => tally[h.p] = (tally[h.p] || 0) + h.d);
      const lines = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${nameOf(p)}: ${n} producto${n === 1 ? '' : 's'}`);
      endGame({ title: 'Se acabaron los productos', lines: lines.length ? lines : ['Nadie le atinó'] });
    }
  }

  // ===================== BASTA =====================
  INIT.bas = () => { S.g = { round: 0, rounds: S.settings.bastaRounds, cats: S.settings.bastaCats || D.bastaCategories, usedL: [], spinOrder: shuffle(active()), step: 'ready' }; };
  function basStartRound() { const g = S.g; g.step = 'spin'; g.spinner = g.spinOrder[g.round % g.spinOrder.length]; g.letter = ''; g.answers = {}; g.bastaBy = null; g.lockAt = 0; g.invalid = {}; g.cell = {}; g.roundPts = {}; ev('banner', `Basta · ronda ${g.round + 1} de ${g.rounds}`, { sub: `${nameOf(g.spinner)} detiene la ruleta` }); }
  function basStop(p) { const g = S.g; if (g.step !== 'spin') return; if (p && p !== g.spinner) return; const pool = D.bastaLetters.filter(l => !g.usedL.includes(l)); g.letter = pool[rnd(pool.length)] || 'S'; g.usedL.push(g.letter); g.step = 'write'; g.started = now(); ev('ding', 'Letra ' + g.letter); }
  function basAnswers(p, a) { const g = S.g; if (!['write', 'lock'].includes(g.step) || !S.players[p]) return; const o = {}; g.cats.forEach((c, i) => { o[i] = String((a && a[i]) || '').slice(0, 40); }); g.answers[p] = o; }
  function basBasta(p) { const g = S.g; if (g.step !== 'write') return; g.bastaBy = p; g.step = 'lock'; g.lockAt = now() + 3000; ev('basta', '¡BASTA!', { sub: 'Lo picó ' + nameOf(p) }); }
  function basScore() {
    const g = S.g; g.step = 'review'; g.cell = {}; g.roundPts = {};
    const ps = Object.keys(g.answers);
    g.cats.forEach((c, ci) => {
      const vals = ps.map(p => { const raw = g.answers[p][ci] || ''; const n = norm(raw); const ok = n && n[0] === norm(g.letter) && !g.invalid[p + '|' + ci]; return { p, n, ok }; });
      vals.forEach(v => { let pts = 0; if (v.ok) { const dup = vals.some(o => o.p !== v.p && o.ok && (o.n === v.n || (o.n.length >= 7 && lev(o.n, v.n) <= 1))); pts = dup ? 50 : 100; } g.cell[v.p + '|' + ci] = pts; g.roundPts[v.p] = (g.roundPts[v.p] || 0) + pts; });
    });
  }
  function basToggle(p, ci) { const g = S.g; if (g.step !== 'review') return; const k = p + '|' + ci; g.invalid[k] = !g.invalid[k]; basScore(); }
  function basNext() {
    const g = S.g;
    if (g.step === 'ready') return basStartRound();
    if (g.step === 'spin') return basStop(null);
    if (g.step === 'write') return basBasta(null);
    if (g.step === 'lock') return basScore();
    if (g.step === 'review') {
      const ord = Object.entries(g.roundPts).sort((a, b) => b[1] - a[1]);
      const award = [3, 2, 1]; g.awarded = [];
      ord.slice(0, 3).forEach(([p, v], k) => { if (v > 0) { addPts(p, award[k], 'Basta'); g.awarded.push([p, award[k], v]); } });
      g.step = 'scored'; ev('win', ord.length ? `¡${nameOf(ord[0][0])} ganó la ronda!` : 'Ronda sin respuestas'); return;
    }
    if (g.step === 'scored') {
      if (g.round + 1 < g.rounds) { g.round++; return basStartRound(); }
      const tally = {}; S.hist.filter(h => h.why === 'Basta').forEach(h => tally[h.p] = (tally[h.p] || 0) + h.d);
      endGame({ title: 'Se acabó el Basta', lines: Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${nameOf(p)}: +${n}`) });
    }
  }

  // ===================== MILLONARIO =====================
  INIT.mil = () => {
    const fin = ranking().slice(0, Math.max(1, S.settings.finalists));
    S.g = { finalists: fin, fi: 0, step: 'ready', results: {}, used: D.millionaire.map(() => []) };
  };
  function milPickQ(l) { const g = S.g; const pool = D.millionaire[l].map((_, i) => i).filter(i => !g.used[l].includes(i)); const i = pool.length ? pool[rnd(pool.length)] : rnd(D.millionaire[l].length); g.used[l].push(i); return i; }
  function milStartPlayer() { const g = S.g; g.step = 'q'; g.l = 0; g.qlvl = 0; g.qi = milPickQ(0); g.pick = null; g.gone = []; g.life = { f: false, p: false, a: false }; g.votes = null; g.locked = false; g.ok = null; g.msg = ''; ev('banner', '¡Juega ' + nameOf(g.finalists[g.fi]) + '!', { sub: 'Cinco preguntas. La 2.ª es tu seguro.' }); }
  const milQ = () => D.millionaire[S.g.qlvl][S.g.qi];
  const milPlayer = () => S.g.finalists[S.g.fi];
  function milPick(p, k) { const g = S.g; if (g.step !== 'q' || g.locked || p !== milPlayer() || g.gone.includes(k) || k < 0 || k > 3) return; g.pick = k; }
  function milFinal(p) { const g = S.g; if (g.step !== 'q' || g.locked || g.pick === null) return; if (p && p !== milPlayer()) return; g.locked = true; g.revealAt = now() + 2500; ev('lock', 'Respuesta final'); }
  function milReveal() {
    const g = S.g; if (!g.locked || g.ok !== null) return; const q = milQ(); g.ok = g.pick === q[2]; g.revealAt = 0;
    if (g.ok) { g.l++; if (g.l >= 5) { milEnd(D.ladder[4], '¡Contestó las cinco! +' + D.ladder[4]); } else { g.msg = `¡Correcto! Va por ${D.ladder[g.l - 1]} punto${D.ladder[g.l - 1] === 1 ? '' : 's'}`; ev('ding', g.msg); } }
    else { const keep = g.l >= 2 ? D.ladder[1] : 0; milEnd(keep, `Uy… se lleva ${keep} punto${keep === 1 ? '' : 's'}`); ev('strike', ''); }
  }
  function milEnd(pts, msg) { const g = S.g; const p = milPlayer(); g.step = 'out'; g.msg = msg; g.results[p] = pts; if (pts) addPts(p, pts, 'Millonario'); ev('win', nameOf(p) + ': ' + msg); }
  function milQuit(p) { const g = S.g; if (g.step !== 'q' || g.locked) return; if (p && p !== milPlayer()) return; const pts = g.l ? D.ladder[g.l - 1] : 0; milEnd(pts, `Se retira con ${pts} punto${pts === 1 ? '' : 's'}`); }
  function milLife(k, p) {
    const g = S.g; if (g.step !== 'q' || g.locked) return; if (p && p !== milPlayer()) return; const q = milQ();
    if (k === 'f' && !g.life.f) { g.life.f = true; g.gone = shuffle([0, 1, 2, 3].filter(i => i !== q[2])).slice(0, 2); if (g.gone.includes(g.pick)) g.pick = null; ev('info', '50:50'); }
    if (k === 'p' && !g.life.p) { g.life.p = true; g.votes = {}; ev('info', 'Pregunta al público: voten desde su celular'); }
    if (k === 'a' && !g.life.a) { g.life.a = true; g.callUntil = now() + 30000; ev('info', 'Llamada a un amigo: 30 segundos'); }
  }
  function milVote(p, k) { const g = S.g; if (!g.votes || p === milPlayer() || k < 0 || k > 3) return; g.votes[p] = k; }
  function milNext() {
    const g = S.g;
    if (g.step === 'ready') return milStartPlayer();
    if (g.step === 'q') { if (g.locked && g.ok === null) return milReveal(); if (g.ok) { g.qlvl = g.l; g.qi = milPickQ(g.l); g.pick = null; g.gone = []; g.votes = null; g.locked = false; g.ok = null; g.msg = ''; return; } return 'Esperando la respuesta final'; }
    if (g.step === 'out') {
      if (g.fi + 1 < g.finalists.length) { g.fi++; return milStartPlayer(); }
      endGame({ title: 'Se acabó la gran final', lines: g.finalists.map(p => `${nameOf(p)}: +${g.results[p] || 0}`) });
    }
  }

  // ---------- robo ----------
  function robRoll(p) {
    if (S.phase !== 'final') return; const ord = ranking(); const cur = ord[S.rob.turn % ord.length];
    if (p && p !== cur) return; const n = 1 + rnd(6); S.rob.die = n; S.rob.rule = D.robRules[n - 1]; S.rob.rolled = true; ev('dice', D.robRules[n - 1], { n });
  }
  function robNext() { const ord = ranking(); S.rob.turn++; S.rob.rolled = false; S.rob.die = 0; S.rob.rule = ''; if (S.rob.turn % ord.length === 0) S.rob.lap++; }

  // ---------- terminar el juego actual de golpe ----------
  function endNow() {
    if (S.phase !== 'play') return 'Solo se puede durante un juego';
    const G = curGame(), g = S.g;
    if (G === 'feu' && g.teams) {
      const w = g.scores[0] === g.scores[1] ? -1 : (g.scores[0] > g.scores[1] ? 0 : 1); const lines = [];
      g.teams.forEach((t, i) => { const pts = w < 0 ? 3 : (i === w ? 5 : 2); t.members.forEach(p => addPts(p, pts, '100 Mexicanos')); lines.push(`${t.name}: ${g.scores[i]} → +${pts} c/u`); });
      return endGame({ title: w < 0 ? '¡Empate!' : `¡Ganó ${g.teams[w].name}!`, lines });
    }
    if (G === 'jeo' && g.teams && g.step !== 'teams') {
      const ord = g.teams.map((t, i) => i).sort((a, b) => g.teams[b].score - g.teams[a].score); const award = [5, 3, 2, 1]; const lines = [];
      ord.forEach((ti, k) => { const t = g.teams[ti]; const pts = award[k] || 1; t.members.forEach(p => addPts(p, pts, 'Jeopardy')); lines.push(`${k + 1}.º ${t.name}: ${t.score} → +${pts} c/u`); });
      return endGame({ title: `¡Ganó ${g.teams[ord[0]].name}!`, lines });
    }
    if (G === 'mil' && g.finalists) return endGame({ title: 'Se acabó la gran final', lines: g.finalists.map(p => `${nameOf(p)}: +${g.results[p] || 0}`) });
    const why = { pre: 'Atínale', bas: 'Basta' }[G]; const tally = {}; S.hist.filter(h => h.why === why).forEach(h => tally[h.p] = (tally[h.p] || 0) + h.d);
    return endGame({ title: 'Se terminó ' + GAMES[G], lines: Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${nameOf(p)}: +${n}`) });
  }

  // ---------- botón "Siguiente" general ----------
  function next() {
    if (S.phase === 'menu') { S.phase = 'lobby'; return; }
    if (S.phase === 'lobby') { if (active().length < 2) return 'Se necesitan al menos 2 jugadores'; S.phase = 'night'; return; }
    if (S.phase === 'night') { S.gi = 0; goIntro(); return; }
    if (S.phase === 'intro') { startGame(); return; }
    if (S.phase === 'play') { const g = curGame(); return ({ feu: feuNext, jeo: jNext, pre: preNext, bas: basNext, mil: milNext })[g](); }
    if (S.phase === 'results') { afterResults(); return; }
    if (S.phase === 'standings') { afterStandings(); return; }
    if (S.phase === 'final') { robNext(); return; }
  }
  function back() {
    if (S.phase === 'lobby') S.phase = 'menu';
    else if (S.phase === 'night') S.phase = 'lobby';
    else if (S.phase === 'intro') { if (S.gi > 0) { S.phase = 'standings'; S.gi--; S.gi++; } else S.phase = 'night'; }
    else if (S.phase === 'play' && S.g && (S.g.step === 'draw' || S.g.step === 'teams' || S.g.step === 'ready')) S.phase = 'intro';
    else return 'Aquí no se puede regresar; usa Deshacer o ajusta puntos';
  }

  // ---------- timers (los revisa la pantalla cada medio segundo) ----------
  function tick() {
    if (S.paused || S.phase !== 'play') return false;
    const g = S.g, t = now(); let ch = false;
    if (curGame() === 'feu' && g.round && g.round.answerer && g.round.deadline && t > g.round.deadline) { feuApply(-1, '(se acabó el tiempo)'); ch = true; }
    if (curGame() === 'jeo') {
      const c = g.clue; if (c && c.answering && c.answering.p !== undefined && c.deadline && t > c.deadline) { jResolve(false, '(se acabó el tiempo)'); ch = true; }
      if (g.step === 'fjq' && g.fj.deadline && t > g.fj.deadline) { g.fj.deadline = 0; ch = true; }
    }
    if (curGame() === 'pre' && g.step === 'guess' && t > g.deadline) { preReveal(); ch = true; }
    if (curGame() === 'bas' && g.step === 'lock' && t > g.lockAt) { basScore(); ch = true; }
    if (curGame() === 'mil' && g.locked && g.ok === null && g.revealAt && t > g.revealAt) { milReveal(); ch = true; }
    return ch;
  }

  // ---------- mensajes ----------
  function handle(from, role, m) {
    if (!m || typeof m !== 'object') return;
    const p = from; let err = null;
    if (S.paused && m.t !== 'cmd' && m.t !== 'join') return 'El juego está en pausa';
    switch (m.t) {
      case 'join': err = join(p, m.name, m.orn); break;
      case 'buzz': if (S.phase === 'play') { if (curGame() === 'feu') feuBuzz(p); if (curGame() === 'jeo') jBuzz(p); } break;
      case 'answer': if (S.phase === 'play') {
        const txt = String(m.text || '').slice(0, 60);
        if (curGame() === 'feu') { const R = S.g.round; if (R && R.answerer === p) { const q = feuQ(S.g.r); feuApply(judgeFeud(txt, q[1], R.open), txt); } }
        if (curGame() === 'jeo') jAnswer(p, txt);
      } break;
      case 'teamname': if (curGame() === 'feu' && S.g.step === 'names') { const t = teamOf(p); if (t >= 0) S.g.teams[t].name = String(m.v || '').trim().slice(0, 22) || S.g.teams[t].name; } break;
      case 'pick': if (curGame() === 'jeo') jPick(String(m.key), p); break;
      case 'wager': if (curGame() === 'jeo') { if (S.g.step === 'dd') jWager(p, m.v); else jFjWager(p, m.v); } break;
      case 'fj': if (curGame() === 'jeo') jFjAnswer(p, m.text); break;
      case 'price': if (curGame() === 'pre') preGuess(p, m.v); break;
      case 'stop': if (curGame() === 'bas') basStop(p); break;
      case 'bastaAns': if (curGame() === 'bas') basAnswers(p, m.a); break;
      case 'basta': if (curGame() === 'bas') { basAnswers(p, m.a); basBasta(p); } break;
      case 'mpick': if (curGame() === 'mil') milPick(p, +m.k); break;
      case 'mfinal': if (curGame() === 'mil') milFinal(p); break;
      case 'mquit': if (curGame() === 'mil') milQuit(p); break;
      case 'mlife': if (curGame() === 'mil') milLife(m.k, p); break;
      case 'vote': if (curGame() === 'mil') milVote(p, +m.k); break;
      case 'roll': robRoll(p); break;
      case 'cmd': if (role !== 'host') return 'Solo el host puede hacer eso'; err = cmd(m.c, m.a || {}); break;
    }
    changed(); return err;
  }
  function cmd(c, a) {
    const g = S.g;
    switch (c) {
      case 'next': return next();
      case 'back': return back();
      case 'pause': S.paused = !S.paused; if (!S.paused) { /* da tiempo extra al volver */ const add = 5000; if (g && g.round && g.round.deadline) g.round.deadline = now() + 20000; if (g && g.deadline) g.deadline = Math.max(g.deadline, now() + add); } return;
      case 'pts': if (S.players[a.p]) addPts(a.p, +a.d || 0, 'Ajuste del host'); return;
      case 'remove': if (S.players[a.p]) S.players[a.p].removed = !S.players[a.p].removed; return;
      case 'rename': if (S.players[a.p]) S.players[a.p].name = String(a.v || '').slice(0, 16) || S.players[a.p].name; return;
      case 'settings': Object.assign(S.settings, a); return;
      case 'reset': { const keep = { code: S.code, key: S.key }; const pl = S.players, ord = S.order; S = fresh(keep); if (a.keepPlayers) { S.order = ord; Object.keys(pl).forEach(p => { S.players[p] = { ...pl[p], pts: 0 }; }); } return; }
      case 'endNow': return endNow();
      case 'goto': if (S.settings.games.includes(a.g)) { S.gi = S.settings.games.indexOf(a.g); goIntro(); } return;
      // 100 mexicanos
      case 'feuTeam': if (curGame() === 'feu' && g.teams) { const p = a.p; g.teams.forEach(t => t.members = t.members.filter(x => x !== p)); g.teams[a.t ? 1 : 0].members.push(p); } return;
      case 'feuReshuffle': if (curGame() === 'feu' && g.step === 'draw') { INIT.feu(); } return;
      case 'feuTile': if (g.round && g.round.answerer) feuApply(+a.k, a.text || '(lo dio por bueno el host)'); return;
      case 'feuMiss': if (g.round && g.round.answerer) feuApply(-1, a.text || ''); return;
      case 'feuSay': if (g.round && g.round.answerer) { const q = feuQ(g.r); feuApply(judgeFeud(a.text, q[1], g.round.open), String(a.text || '').slice(0, 60)); } return;
      case 'feuUndo': return feuUndo();
      case 'feuBuzzFor': if (g.round && g.round.mode === 'faceoff' && g.round.buzzOpen) feuBuzz(a.p); return;
      case 'feuAdd': { const q = String(a.q || '').trim(); const rows = String(a.a || '').split('\n').map(l => l.split('|').map(x => x.trim())).filter(x => x[0]).slice(0, 8); if (!q || rows.length < 2) return 'Escribe la pregunta y al menos 2 respuestas'; const def = [35, 25, 18, 12, 10, 8, 6, 4]; const ans = rows.map((x, k) => [x[0], Math.round(+x[1]) || def[k]]).sort((x, y) => y[1] - x[1]); g.extra.push([q, ans]); const idx = D.feud.length + g.extra.length - 1; g.qOrder.splice(g.r + 1, 0, idx); g.rounds++; return; }
      case 'feuMore': if (curGame() === 'feu' && g.rounds) { g.rounds++; } return;
      // jeopardy
      case 'jTeam': if (curGame() === 'jeo' && g.step === 'teams') { g.teams.forEach(t => t.members = t.members.filter(x => x !== a.p)); g.teams[+a.t].members.push(a.p); } return;
      case 'jTeamCount': if (curGame() === 'jeo' && g.step === 'teams') { S.settings.jeoTeams = Math.max(2, Math.min(4, +a.n)); INIT.jeo(); } return;
      case 'jPick': jPick(String(a.key)); return;
      case 'jFlip': return jFlip();
      case 'jNobody': jNobody(); return;
      case 'jSay': if (g.clue && g.clue.answering) { g.clue.answering.p = g.clue.answering.p || g.teams[g.clue.answering.t].members[0]; { const an = D.jeopardy[g.round][g.clue.ci][1][g.clue.v][1]; jResolve(judgeOne(a.text, an, (D.jeopardyAlias || {})[an]), String(a.text || '')); } } return;
      case 'jBuzzFor': jBuzz(a.p); return;
      case 'jWager': if (g.step === 'dd') { const m = g.teams[g.picker].members[0]; jWager(m, a.v); } return;
      case 'fjFlip': if (g.step === 'fjr') g.fj.judged[a.t] = !g.fj.judged[a.t]; return;
      // atínale
      case 'preFor': preGuess(a.p, a.v); return;
      // basta
      case 'basToggle': basToggle(a.p, +a.c); return;
      // millonario
      case 'milLife': milLife(a.k); return;
      case 'milQuit': milQuit(); return;
      case 'milFinal': milFinal(); return;
      case 'milPickFor': { const k = +a.k; if (g.step === 'q' && !g.locked && !g.gone.includes(k)) g.pick = k; return; }
      case 'roll': robRoll(); return;
    }
  }

  // ---------- vista pública (sin respuestas secretas) ----------
  function view() {
    const V = { code: S.code, phase: S.phase, paused: S.paused, now: now(), ev: S.ev, settings: S.settings, gi: S.gi, game: curGame(), gameName: GAMES[curGame()], games: S.settings.games.map(k => GAMES[k]),
      players: S.order.map(p => ({ id: p, name: S.players[p].name, orn: S.players[p].orn, pts: S.players[p].pts, removed: S.players[p].removed })),
      rank: ranking(), results: S.results || null };
    if (S.phase === 'final') V.rob = S.rob;
    if (S.phase !== 'play') return V;
    const g = S.g, G = curGame();
    if (G === 'feu') {
      V.feu = { step: g.step, teams: g.teams, scores: g.scores, r: g.r, rounds: g.rounds, left: g.rounds - g.r - 1, front: g.round ? g.round.fronts : feuFront(0), nextFront: feuFront(g.r + 1) };
      if (g.round) { const R = g.round, q = feuQ(g.r); V.feu.q = q[0]; V.feu.round = { strikes: R.strikes, pot: R.pot, mode: R.mode, buzzOpen: R.buzzOpen, answerer: R.answerer, deadline: R.deadline, control: R.control, winner: R.winner, last: R.last, canUndo: R.undo.length > 0, tiles: q[1].map((a, k) => (R.open[k] || R.revealAll) ? { o: R.open[k] ? 1 : 2, x: a[0], p: a[1] } : { o: 0 }) }; }
    }
    if (G === 'jeo') {
      const cats = D.jeopardy[g.round] || [];
      V.jeo = { step: g.step, teams: g.teams, round: g.round, picker: g.picker, cats: cats.map(c => c[0]), used: g.used, mult: g.round + 1 };
      if (g.clue) { const c = g.clue; const clue = cats[c.ci][1][c.v]; V.jeo.clue = { cat: cats[c.ci][0], value: c.value, dd: c.dd, wager: c.wager, q: g.step === 'dd' ? '' : clue[0], a: c.revealed ? clue[1] : '', buzzOpen: c.buzzOpen, out: c.out, answering: c.answering, deadline: c.deadline, result: c.result, last: c.last, max: Math.max(g.teams[g.picker] ? g.teams[g.picker].score : 0, 500 * (g.round + 1)) }; }
      if (g.fj) { const reveal = g.step === 'fjr'; V.jeo.fj = { cat: D.jeopardyFinal[0], q: g.step === 'fjw' ? '' : D.jeopardyFinal[1], a: reveal ? D.jeopardyFinal[2] : '', deadline: g.fj.deadline, wagered: Object.keys(g.fj.wagers).map(Number), answered: Object.keys(g.fj.answers).map(Number), wagers: reveal ? g.fj.wagers : null, answers: reveal ? g.fj.answers : null, judged: reveal ? g.fj.judged : null }; }
    }
    if (G === 'pre') {
      const pr = D.products[g.order[g.i]];
      V.pre = { step: g.step, i: g.i, n: g.order.length, id: pr[0], name: pr[1], where: pr[2], deadline: g.deadline, price: g.step === 'reveal' ? pr[3] : null, sent: Object.keys(g.guesses), guesses: g.step === 'reveal' ? g.guesses : null, winners: g.winners };
    }
    if (G === 'bas') {
      const show = ['review', 'scored'].includes(g.step);
      V.bas = { step: g.step, round: g.round, rounds: g.rounds, cats: g.cats, letter: g.letter, spinner: g.spinner, bastaBy: g.bastaBy, lockAt: g.lockAt, sent: Object.keys(g.answers || {}), answers: show ? g.answers : null, cell: show ? g.cell : null, roundPts: show ? g.roundPts : null, invalid: show ? g.invalid : null, awarded: g.awarded || [] };
    }
    if (G === 'mil') {
      V.mil = { step: g.step, finalists: g.finalists, fi: g.fi, results: g.results, ladder: D.ladder };
      if (g.step === 'q' || g.step === 'out') { const q = milQ(); V.mil.cur = milPlayer(); V.mil.l = g.l; V.mil.qn = g.qlvl + 1; V.mil.q = q[0]; V.mil.opts = q[1]; V.mil.pick = g.pick; V.mil.gone = g.gone; V.mil.life = g.life; V.mil.locked = g.locked; V.mil.ok = g.ok; V.mil.correct = g.ok !== null ? q[2] : null; V.mil.msg = g.msg; V.mil.revealAt = g.revealAt; V.mil.callUntil = g.callUntil || 0;
        if (g.votes) { const c = [0, 0, 0, 0]; Object.values(g.votes).forEach(k => c[k]++); V.mil.votes = c; V.mil.voters = Object.keys(g.votes); } }
    }
    return V;
  }

  return { get S() { return S; }, view, handle, tick, touch: changed, next, cmd: (c, a) => { const e = cmd(c, a || {}); changed(); return e; }, isKey: k => k === S.key, nameOf, GAMES, TEAMC };
};
