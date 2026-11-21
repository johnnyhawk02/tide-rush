// Keyboard and touch controls. Robyn can only change lane and jump.
export class Input {
  constructor(surface, on) {
    this.on = on; this.pointers = new Map();
    window.addEventListener('keydown', (e) => {
      if (e.repeat && e.code !== 'Escape') { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault(); return; }
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': on.left(); break;
        case 'ArrowRight': case 'KeyD': on.right(); break;
        case 'ArrowUp': case 'KeyW': case 'Space': on.jump(); break;
        case 'Escape': case 'KeyP': on.pause(); break;
        case 'Enter': on.confirm(); break;
        case 'KeyM': on.mute(); break;
        case 'KeyC': on.view && on.view(); break;
        default: return;
      }
      e.preventDefault();
    });
    const th = () => Math.max(20, Math.min(window.innerWidth, window.innerHeight) * 0.035);
    surface.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now(), fired: false });
      on.touch && on.touch();
      e.preventDefault();
    });
    surface.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId); if (!p) return;
      e.preventDefault();
      // one swipe is one move: once a touch has changed lane or jumped it does nothing more until the finger lifts,
      // however long or fast the swipe is
      if (p.fired) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y, T = th();
      if (Math.abs(dx) < T && Math.abs(dy) < T) return;
      if (Math.abs(dx) > Math.abs(dy)) (dx > 0 ? on.right : on.left)();
      else if (dy < 0) on.jump();
      p.fired = true;
    });
    const end = (e) => {
      const p = this.pointers.get(e.pointerId); if (!p) return;
      this.pointers.delete(e.pointerId);
      if (e.type === 'pointerup' && !p.fired && performance.now() - p.t < 280) on.jump();
    };
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', end);
    surface.addEventListener('pointerleave', end);
    // stop Safari from scrolling, zooming or showing menus over the game
    for (const ev of ['gesturestart', 'gesturechange', 'contextmenu', 'selectstart']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
    document.addEventListener('touchmove', (e) => { if (e.target === surface) e.preventDefault(); }, { passive: false });
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => { const now = Date.now(); if (now - lastTouchEnd < 320 && e.target === surface) e.preventDefault(); lastTouchEnd = now; }, { passive: false });
  }
}
