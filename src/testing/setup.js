// Test setup file for Vitest
import { vi } from "vitest";

// Mock window.pdfjsLib
global.window = global.window || {};
window.pdfjsLib = {
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 3,
      getPage: vi.fn((pageNum) =>
        Promise.resolve({
          rotate: 0,
          getViewport: vi.fn((options) => ({
            width: 612,
            height: 792,
            scale: options.scale || 1,
            rotation: options.rotation || 0,
          })),
          render: vi.fn(() => ({
            promise: Promise.resolve(),
          })),
        }),
      ),
      destroy: vi.fn(), // Add destroy method for memory leak testing
    }),
  })),
};

// Mock window.PDFLib
window.PDFLib = {
  PDFDocument: {
    create: vi.fn(() =>
      Promise.resolve({
        addPage: vi.fn((dimensions) => ({
          setRotation: vi.fn(),
          getRotation: vi.fn(() => ({ angle: 0 })),
        })),
        copyPages: vi.fn((srcDoc, pages) =>
          Promise.resolve([
            {
              getRotation: vi.fn(() => ({ angle: 0 })),
              setRotation: vi.fn(),
            },
          ]),
        ),
        save: vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3]))),
      }),
    ),
    load: vi.fn((buffer) =>
      Promise.resolve({
        getPageCount: vi.fn(() => 3),
      }),
    ),
  },
  degrees: vi.fn((deg) => deg),
};

// Mock canvas
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillStyle: "",
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
}));
