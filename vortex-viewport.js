// vortex-viewport.js — Gestion du pan, zoom et transform du canvas

export class VortexViewport {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.world = world;
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.onChange = null;
  }

  registerEvents() {
    this.registerWheelEvent();
    this.registerPanEvent();
  }

  registerWheelEvent() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.min(2, Math.max(0.3, this.zoomLevel + delta));

      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoomLevel);
      this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoomLevel);

      this.zoomLevel = newZoom;
      this.applyTransform();
      if (this.onChange) this.onChange();
    });
  }

  // Pan déclenché par l'extérieur (graph interactions)
  startPan(e) {
    const startX = e.clientX;
    const startY = e.clientY;
    const startPanX = this.panX;
    const startPanY = this.panY;
    this.canvas.style.cursor = 'grabbing';

    const onMove = (ev) => {
      this.panX = startPanX + (ev.clientX - startX);
      this.panY = startPanY + (ev.clientY - startY);
      this.applyTransform();
    };

    const onUp = () => {
      this.canvas.style.cursor = '';
      this.canvas.removeEventListener('mousemove', onMove);
      this.canvas.removeEventListener('mouseup', onUp);
    };

    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onUp);
  }

  // Inutilisé pour le moment — réservé pour le pan implicite
  registerPanEvent() {}

  applyTransform() {
    this.world.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    this.world.style.transformOrigin = '0 0';

    const gridSize = 20 * this.zoomLevel;
    this.canvas.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    this.canvas.style.backgroundPosition = `${this.panX}px ${this.panY}px`;
  }

  reset() {
    this.panX = 0;
    this.panY = 0;
    this.zoomLevel = 1;
    this.applyTransform();
  }

  serialize() {
    return { panX: this.panX, panY: this.panY, zoomLevel: this.zoomLevel };
  }

  deserialize(viewport) {
    if (!viewport) return;
    this.panX = viewport.panX || 0;
    this.panY = viewport.panY || 0;
    this.zoomLevel = viewport.zoomLevel || 1;
    this.applyTransform();
  }
}
