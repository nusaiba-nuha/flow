// Runs before every test file, per `setupFiles` in vite.config.js.
//
// happy-dom does not implement the layout APIs Vue Flow probes on mount, so the
// stubs live here rather than in each spec that happens to render a canvas.
globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

globalThis.DOMMatrixReadOnly =
  globalThis.DOMMatrixReadOnly ||
  class {
    constructor() {
      this.m22 = 1
    }
  }
