import "@testing-library/jest-dom/vitest"

import { vi } from "vitest"

class ResizeObserverMock implements ResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
})

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

const canvasContext = {
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  fillText: vi.fn(),
  arc: vi.fn(),
  setLineDash: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
  font: "",
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
  textAlign: "start",
  textBaseline: "alphabetic",
}

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  writable: true,
  value: vi.fn(() => canvasContext),
})

Object.defineProperties(HTMLElement.prototype, {
  getAnimations: {
    configurable: true,
    value: vi.fn(() => []),
  },
  hasPointerCapture: {
    configurable: true,
    value: vi.fn(() => false),
  },
  releasePointerCapture: {
    configurable: true,
    value: vi.fn(),
  },
  scrollIntoView: {
    configurable: true,
    value: vi.fn(),
  },
  setPointerCapture: {
    configurable: true,
    value: vi.fn(),
  },
})
