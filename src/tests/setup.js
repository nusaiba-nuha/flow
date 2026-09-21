// happy-dom lacks the layout APIs Vue Flow probes on mount.
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
