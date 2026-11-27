// Conexión entre la pantalla grande (host) y los celulares.
// En internet usa PeerJS (conexión directa entre aparatos, sin cuentas).
// Con ?local=1 usa BroadcastChannel para probar en varias pestañas de la misma compu.
window.makeNet = function (local) {
  const PREFIX = 'navidadjuego-v1-';
  const usePeer = !local && typeof window.Peer === 'function';

  // ---------- modo local (pestañas) ----------
  function bcHost(code, h) {
    const bc = new BroadcastChannel(PREFIX + code);
    const clients = new Set();
    bc.onmessage = e => {
      const m = e.data; if (!m || m.to !== 'host') return;
      if (m.kind === 'open') { if (!clients.has(m.from)) { clients.add(m.from); h.onOpen && h.onOpen(m.from); } return; }
      if (m.kind === 'close') { clients.delete(m.from); h.onClose && h.onClose(m.from); return; }
      if (m.kind === 'data') h.onData && h.onData(m.from, m.data);
    };
    h.onReady && setTimeout(() => h.onReady(), 0);
    return {
      send(id, data) { bc.postMessage({ to: id, kind: 'data', data }); },
      broadcast(data) { bc.postMessage({ to: '*', kind: 'data', data }); },
      ok: () => true
    };
  }
  function bcClient(code, h) {
    const bc = new BroadcastChannel(PREFIX + code);
    const me = 'c' + Math.random().toString(36).slice(2, 10);
    bc.onmessage = e => { const m = e.data; if (!m || (m.to !== me && m.to !== '*')) return; if (m.kind === 'data') h.onData && h.onData(m.data); };
    const open = () => bc.postMessage({ to: 'host', from: me, kind: 'open' });
    setTimeout(() => { open(); h.onStatus && h.onStatus(true); }, 50);
    window.addEventListener('beforeunload', () => bc.postMessage({ to: 'host', from: me, kind: 'close' }));
    return { send(data) { bc.postMessage({ to: 'host', from: me, kind: 'data', data }); }, reopen: open };
  }

  // ---------- modo internet (PeerJS) ----------
  function peerHost(code, h) {
    const conns = new Map();
    let peer = null, ready = false;
    function start() {
      peer = new Peer(PREFIX + code);
      peer.on('open', () => { ready = true; h.onReady && h.onReady(); });
      peer.on('connection', conn => {
        conn.on('open', () => { conns.set(conn.peer, conn); h.onOpen && h.onOpen(conn.peer); });
        conn.on('data', d => h.onData && h.onData(conn.peer, d));
        conn.on('close', () => { conns.delete(conn.peer); h.onClose && h.onClose(conn.peer); });
        conn.on('error', () => {});
      });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
      peer.on('error', err => {
        ready = false;
        h.onError && h.onError(err);
        // si la sala sigue ocupada (por ejemplo, recién recargaste la página), se reintenta solo
        setTimeout(() => { try { peer.destroy(); } catch (e) {} start(); }, err && err.type === 'unavailable-id' ? 6000 : 3000);
      });
    }
    start();
    return {
      send(id, data) { const c = conns.get(id); if (c && c.open) try { c.send(data); } catch (e) {} },
      broadcast(data) { conns.forEach(c => { if (c.open) try { c.send(data); } catch (e) {} }); },
      ok: () => ready
    };
  }
  function peerClient(code, h) {
    let peer = null, conn = null, alive = false, timer = null;
    function connect() {
      if (!peer || peer.destroyed) {
        peer = new Peer();
        peer.on('open', () => dial());
        peer.on('error', () => { status(false); retry(); });
        peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
      } else dial();
    }
    function dial() {
      try { conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' }); } catch (e) { retry(); return; }
      conn.on('open', () => status(true));
      conn.on('data', d => h.onData && h.onData(d));
      conn.on('close', () => { status(false); retry(); });
      conn.on('error', () => { status(false); retry(); });
    }
    function status(v) { alive = v; h.onStatus && h.onStatus(v); }
    function retry() { clearTimeout(timer); timer = setTimeout(() => { if (!alive) connect(); }, 2500); }
    connect();
    return { send(data) { if (conn && conn.open) try { conn.send(data); } catch (e) {} }, reopen() {} };
  }

  return {
    mode: usePeer ? 'peer' : 'local',
    host: (code, h) => usePeer ? peerHost(code, h) : bcHost(code, h),
    join: (code, h) => usePeer ? peerClient(code, h) : bcClient(code, h)
  };
};
