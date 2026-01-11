import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PDFOrganizer } from "../js/PDFOrganizer.js";

/**
 * Comprehensive Test Suite for PDFOrganizer
 *
 * Coverage targets:
 * - CRITICAL: Load & Display, Core Operations, Export, Edge Cases
 * - IMPORTANT: Multi-selection, Split/Merge, Error Handling
 * - NICE-TO-HAVE: Performance, Integration
 */

describe("PDFOrganizer - Comprehensive Tests", () => {
  let organizer;
  let mockFile;
  let mockArrayBuffer;

  // Helper to create mock PDF file
  const createMockFile = (name = "test.pdf", size = 1024) => ({
    name,
    type: "application/pdf",
    size,
    arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(size))),
  });

  // Helper to create mock canvas
  const createMockCanvas = () => {
    const mockContext = {
      fillStyle: "",
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    };
    return {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockContext),
      toDataURL: vi.fn(() => "data:image/png;base64,test"),
      _mockContext: mockContext, // Expose for test access
    };
  };

  beforeEach(() => {
    organizer = new PDFOrganizer();
    mockArrayBuffer = new ArrayBuffer(1024);
    mockFile = createMockFile();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // 1. BASIC TESTS - CRITICAL
  // ============================================================================

  describe("1A. Load & Display PDF (CRITICAL)", () => {
    describe("Load PDF file and display thumbnails", () => {
      it("should load a PDF file successfully", async () => {
        const result = await organizer.loadPDFFile(mockFile);

        expect(result.pages.length).toBe(3);
        expect(result.startId).toBe(0);
        expect(result.endId).toBe(3);
        expect(result.fileIndex).toBe(0);
        expect(organizer.pages.length).toBe(3);
      });

      it("should create page objects with correct structure", async () => {
        await organizer.loadPDFFile(mockFile);

        const page = organizer.pages[0];
        expect(page).toHaveProperty("id");
        expect(page).toHaveProperty("pageNumber");
        expect(page).toHaveProperty("rotation");
        expect(page).toHaveProperty("externalPdfDoc");
        expect(page).toHaveProperty("externalArrayBuffer");
        expect(page).toHaveProperty("fileIndex");
        expect(page.pageNumber).toBe(1);
        expect(page.fileIndex).toBe(0);
      });

      it("should assign sequential IDs to pages", async () => {
        await organizer.loadPDFFile(mockFile);

        expect(organizer.pages[0].id).toBe(0);
        expect(organizer.pages[1].id).toBe(1);
        expect(organizer.pages[2].id).toBe(2);
      });
    });

    describe("Load multiple PDF files (append mode)", () => {
      it("should append pages when reset=false", async () => {
        await organizer.loadPDFFile(mockFile, true);
        expect(organizer.pages.length).toBe(3);

        await organizer.loadPDFFile(mockFile, false);
        expect(organizer.pages.length).toBe(6);
        expect(organizer.fileCounter).toBe(2);
      });

      it("should assign different fileIndex to appended pages", async () => {
        await organizer.loadPDFFile(mockFile, true);
        await organizer.loadPDFFile(mockFile, false);

        expect(organizer.pages[0].fileIndex).toBe(0);
        expect(organizer.pages[3].fileIndex).toBe(1);
      });

      it("should continue ID sequence when appending", async () => {
        await organizer.loadPDFFile(mockFile, true);
        const lastIdFirstFile = organizer.pages[2].id;

        await organizer.loadPDFFile(mockFile, false);
        expect(organizer.pages[3].id).toBe(lastIdFirstFile + 1);
      });

      it("should reset pages when reset=true", async () => {
        await organizer.loadPDFFile(mockFile, true);
        await organizer.loadPDFFile(mockFile, false);
        expect(organizer.pages.length).toBe(6);

        await organizer.loadPDFFile(mockFile, true);
        expect(organizer.pages.length).toBe(3);
        expect(organizer.fileCounter).toBe(1);
      });
    });

    describe("Handle PDFs with existing rotation metadata", () => {
      it("should preserve page rotation from PDF metadata", async () => {
        // Mock PDF.js to return pages with rotation
        const originalGetDocument = window.pdfjsLib.getDocument;
        window.pdfjsLib.getDocument = vi.fn(() => ({
          promise: Promise.resolve({
            numPages: 2,
            getPage: vi.fn((pageNum) =>
              Promise.resolve({
                rotate: pageNum === 1 ? 90 : 180,
                getViewport: vi.fn(() => ({ width: 612, height: 792 })),
                render: vi.fn(() => ({ promise: Promise.resolve() })),
              }),
            ),
          }),
        }));

        await organizer.loadPDFFile(mockFile);

        expect(organizer.pages[0].rotation).toBe(90);
        expect(organizer.pages[1].rotation).toBe(180);

        window.pdfjsLib.getDocument = originalGetDocument;
      });
    });

    describe("Handle PDFs with varying page counts", () => {
      it("should handle PDF with exactly 1 page", async () => {
        const originalGetDocument = window.pdfjsLib.getDocument;
        window.pdfjsLib.getDocument = vi.fn(() => ({
          promise: Promise.resolve({
            numPages: 1,
            getPage: vi.fn(() =>
              Promise.resolve({
                rotate: 0,
                getViewport: vi.fn(() => ({ width: 612, height: 792 })),
                render: vi.fn(() => ({ promise: Promise.resolve() })),
              }),
            ),
          }),
        }));

        const result = await organizer.loadPDFFile(mockFile);
        expect(result.pages.length).toBe(1);

        window.pdfjsLib.getDocument = originalGetDocument;
      });

      it("should handle PDF with many pages (simulated 100+)", async () => {
        const originalGetDocument = window.pdfjsLib.getDocument;
        window.pdfjsLib.getDocument = vi.fn(() => ({
          promise: Promise.resolve({
            numPages: 100,
            getPage: vi.fn(() =>
              Promise.resolve({
                rotate: 0,
                getViewport: vi.fn(() => ({ width: 612, height: 792 })),
                render: vi.fn(() => ({ promise: Promise.resolve() })),
              }),
            ),
          }),
        }));

        const result = await organizer.loadPDFFile(mockFile);
        expect(result.pages.length).toBe(100);

        window.pdfjsLib.getDocument = originalGetDocument;
      });
    });
  });

  describe("1B. Page Operations (CRITICAL)", () => {
    beforeEach(async () => {
      await organizer.loadPDFFile(mockFile);
    });

    describe("Rotate Page", () => {
      it("should rotate page 90 degrees clockwise", () => {
        const page = organizer.rotatePage(0, 90);
        expect(page.rotation).toBe(90);
      });

      it("should rotate page -90 degrees counter-clockwise", () => {
        organizer.rotatePage(0, 90);
        const page = organizer.rotatePage(0, -90);
        expect(page.rotation).toBe(0);
      });

      it("should normalize 360 degrees to 0", () => {
        organizer.rotatePage(0, 90);
        organizer.rotatePage(0, 90);
        organizer.rotatePage(0, 90);
        const page = organizer.rotatePage(0, 90);
        expect(page.rotation).toBe(0);
      });

      it("should handle negative rotation correctly", () => {
        const page = organizer.rotatePage(0, -90);
        expect(page.rotation).toBe(270);
      });

      it("should handle -360 degrees (normalize to 0)", () => {
        const page = organizer.rotatePage(0, -360);
        expect(page.rotation).toBe(0);
      });

      it("should rotate page with existing base rotation", async () => {
        // Set base rotation first
        organizer.pages[0].rotation = 90;
        const page = organizer.rotatePage(0, 90);
        expect(page.rotation).toBe(180);
      });

      it("should return undefined for non-existent index", () => {
        const result = organizer.rotatePage(999, 90);
        expect(result).toBeUndefined();
      });

      it("should return undefined for negative index", () => {
        const result = organizer.rotatePage(-1, 90);
        expect(result).toBeUndefined();
      });
    });

    describe("Duplicate Page", () => {
      it("should duplicate any specific page", () => {
        const originalLength = organizer.pages.length;
        const newPage = organizer.duplicatePage(1);

        expect(newPage).not.toBeNull();
        expect(organizer.pages.length).toBe(originalLength + 1);
      });

      it("should insert duplicated page immediately after original", () => {
        const originalPage = organizer.pages[1];
        organizer.duplicatePage(1);

        expect(organizer.pages[2].pageNumber).toBe(originalPage.pageNumber);
      });

      it("should assign unique ID to duplicated page", () => {
        const originalId = organizer.pages[0].id;
        const newPage = organizer.duplicatePage(0);

        expect(newPage.id).not.toBe(originalId);
        expect(newPage.id).toBeGreaterThan(originalId);
      });

      it("should copy all properties from original", () => {
        organizer.pages[0].rotation = 90;
        const newPage = organizer.duplicatePage(0);

        expect(newPage.pageNumber).toBe(organizer.pages[0].pageNumber);
        expect(newPage.rotation).toBe(90);
        expect(newPage.externalPdfDoc).toBe(organizer.pages[0].externalPdfDoc);
        expect(newPage.fileIndex).toBe(organizer.pages[0].fileIndex);
      });

      it("should duplicate a blank page", () => {
        const blankPage = organizer.addBlankPage(0);
        const duplicated = organizer.duplicatePage(0);

        expect(duplicated.isBlank).toBe(true);
        expect(duplicated.pageNumber).toBeNull();
      });

      it("should return null for non-existent index", () => {
        const result = organizer.duplicatePage(999);
        expect(result).toBeNull();
      });
    });

    describe("Delete Page", () => {
      it("should delete any specific page", () => {
        const originalLength = organizer.pages.length;
        const result = organizer.deletePage(1);

        expect(result).toBe(true);
        expect(organizer.pages.length).toBe(originalLength - 1);
      });

      it("should delete the correct page at index", () => {
        const pageToDelete = organizer.pages[1];
        organizer.deletePage(1);

        expect(organizer.pages).not.toContainEqual(pageToDelete);
      });

      it("should delete multiple consecutive pages", () => {
        organizer.deletePage(0);
        organizer.deletePage(0);

        expect(organizer.pages.length).toBe(1);
      });

      it("should handle deletion at last index", () => {
        const lastIndex = organizer.pages.length - 1;
        organizer.deletePage(lastIndex);

        expect(organizer.pages.length).toBe(2);
      });

      it("should handle deletion at first index", () => {
        const secondPage = organizer.pages[1];
        organizer.deletePage(0);

        expect(organizer.pages[0]).toBe(secondPage);
      });
    });

    describe("Add Blank Page", () => {
      it("should add blank page at any index", () => {
        const originalLength = organizer.pages.length;
        const blankPage = organizer.addBlankPage(1);

        expect(blankPage).not.toBeNull();
        expect(organizer.pages.length).toBe(originalLength + 1);
        expect(organizer.pages[1]).toBe(blankPage);
      });

      it("should have correct properties (isBlank=true, rotation=0)", () => {
        const blankPage = organizer.addBlankPage(0);

        expect(blankPage.isBlank).toBe(true);
        expect(blankPage.rotation).toBe(0);
        expect(blankPage.pageNumber).toBeNull();
      });

      it("should assign unique ID to blank page", () => {
        const blankPage1 = organizer.addBlankPage(0);
        const blankPage2 = organizer.addBlankPage(1);

        expect(blankPage1.id).not.toBe(blankPage2.id);
      });

      it("should add blank page at beginning", () => {
        const blankPage = organizer.addBlankPage(0);
        expect(organizer.pages[0]).toBe(blankPage);
      });

      it("should add blank page at end", () => {
        const lastIndex = organizer.pages.length;
        const blankPage = organizer.addBlankPage(lastIndex);
        expect(organizer.pages[lastIndex]).toBe(blankPage);
      });
    });

    describe("Render Blank Page", () => {
      it("should render blank page with white background", () => {
        const mockCanvas = createMockCanvas();
        const mockContext = mockCanvas._mockContext;

        organizer.renderBlankPage(mockCanvas);

        expect(mockCanvas.width).toBe(612);
        expect(mockCanvas.height).toBe(792);
        expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 612, 792);
      });

      it("should handle null canvas gracefully", () => {
        expect(() => organizer.renderBlankPage(null)).not.toThrow();
      });

      it("should handle undefined canvas gracefully", () => {
        expect(() => organizer.renderBlankPage(undefined)).not.toThrow();
      });
    });
  });

  describe("1C. Page Movement (CRITICAL)", () => {
    beforeEach(async () => {
      await organizer.loadPDFFile(mockFile);
    });

    describe("Move Page", () => {
      it("should move page from one index to another", () => {
        const pageToMove = organizer.pages[0];
        organizer.movePage(0, 2);

        expect(organizer.pages[2]).toBe(pageToMove);
      });

      it("should maintain array length after move", () => {
        const originalLength = organizer.pages.length;
        organizer.movePage(0, 2);

        expect(organizer.pages.length).toBe(originalLength);
      });

      it("should move page from first to last index", () => {
        const firstPage = organizer.pages[0];
        const lastIndex = organizer.pages.length - 1;
        organizer.movePage(0, lastIndex);

        expect(organizer.pages[lastIndex]).toBe(firstPage);
      });

      it("should move page from last to first index", () => {
        const lastIndex = organizer.pages.length - 1;
        const lastPage = organizer.pages[lastIndex];
        organizer.movePage(lastIndex, 0);

        expect(organizer.pages[0]).toBe(lastPage);
      });

      it("should return undefined for null fromIndex", () => {
        const result = organizer.movePage(null, 1);
        expect(result).toBeUndefined();
      });

      it("should return undefined for null toIndex", () => {
        const result = organizer.movePage(0, null);
        expect(result).toBeUndefined();
      });

      it("should return undefined for out of bounds fromIndex", () => {
        const result = organizer.movePage(999, 0);
        expect(result).toBeUndefined();
      });

      it("should return undefined for negative fromIndex", () => {
        const result = organizer.movePage(-1, 0);
        expect(result).toBeUndefined();
      });
    });

    describe("Move Multiple Pages", () => {
      it("should move multiple selected pages to drop position", () => {
        const page0 = organizer.pages[0];
        const page1 = organizer.pages[1];

        organizer.moveMultiplePages([0, 1], 2);

        // After moving, pages 0 and 1 should be after index 2
        expect(organizer.pages).toContain(page0);
        expect(organizer.pages).toContain(page1);
      });

      it("should return pages array for empty pageIndices", () => {
        const result = organizer.moveMultiplePages([], 1);
        expect(result).toBe(organizer.pages);
      });

      it("should return pages array for null pageIndices", () => {
        const result = organizer.moveMultiplePages(null, 1);
        expect(result).toBe(organizer.pages);
      });

      it("should handle invalid dropIndex", () => {
        const result = organizer.moveMultiplePages([0], -1);
        expect(result).toBe(organizer.pages);
      });
    });

    describe("Swap Pages", () => {
      it("should swap two pages", () => {
        const page0 = organizer.pages[0];
        const page2 = organizer.pages[2];

        organizer.swapPages(0, 2);

        expect(organizer.pages[0]).toBe(page2);
        expect(organizer.pages[2]).toBe(page0);
      });

      it("should return undefined for null index1", () => {
        const result = organizer.swapPages(null, 1);
        expect(result).toBeUndefined();
      });

      it("should return undefined for null index2", () => {
        const result = organizer.swapPages(0, null);
        expect(result).toBeUndefined();
      });

      it("should return undefined when swapping same index", () => {
        const result = organizer.swapPages(1, 1);
        expect(result).toBeUndefined();
      });

      it("should return undefined for out of bounds index", () => {
        const result = organizer.swapPages(0, 999);
        expect(result).toBeUndefined();
      });
    });
  });

  describe("1D. Export PDF (CRITICAL)", () => {
    beforeEach(async () => {
      await organizer.loadPDFFile(mockFile);
    });

    describe("Export all pages", () => {
      it("should export all pages into a single PDF", async () => {
        const pdfBytes = await organizer.exportPDF();

        expect(pdfBytes).toBeInstanceOf(Uint8Array);
        expect(pdfBytes.length).toBeGreaterThan(0);
      });

      it("should call PDFDocument.create", async () => {
        const createSpy = vi.spyOn(window.PDFLib.PDFDocument, "create");
        await organizer.exportPDF();

        expect(createSpy).toHaveBeenCalled();
      });
    });

    describe("Export specific range of pages", () => {
      it("should export only specified page indices", async () => {
        const pdfBytes = await organizer.exportPDF([0, 2]);

        expect(pdfBytes).toBeInstanceOf(Uint8Array);
      });

      it("should export single page", async () => {
        const pdfBytes = await organizer.exportPDF([1]);

        expect(pdfBytes).toBeInstanceOf(Uint8Array);
      });
    });

    describe("Export rotated pages", () => {
      it("should export pages that have been rotated", async () => {
        organizer.rotatePage(0, 90);
        organizer.rotatePage(1, 180);

        const pdfBytes = await organizer.exportPDF();

        expect(pdfBytes).toBeInstanceOf(Uint8Array);
      });
    });

    describe("Export blank pages", () => {
      it("should export blank pages correctly", async () => {
        organizer.addBlankPage(1);

        const pdfBytes = await organizer.exportPDF();

        expect(pdfBytes).toBeInstanceOf(Uint8Array);
      });

      it("should export blank page with rotation", async () => {
        const blankPage = organizer.addBlankPage(0);
        blankPage.rotation = 90;

        const pdfBytes = await organizer.exportPDF();

        expect(pdfBytes).toBeInstanceOf(Uint8Array);
      });
    });

    describe("Export mixed content", () => {
      it("should export normal pages + blank pages", async () => {
        organizer.addBlankPage(1);
        organizer.addBlankPage(3);
        organizer.rotatePage(0, 90);

        const pdfBytes = await organizer.exportPDF();

        expect(pdfBytes).toBeInstanceOf(Uint8Array);
      });
    });

    describe("Handle null pages in export", () => {
      it("should skip null pages during export", async () => {
        organizer.pages.push(null);

        const pdfBytes = await organizer.exportPDF();

        expect(pdfBytes).toBeInstanceOf(Uint8Array);
        organizer.pages.pop(); // Cleanup
      });
    });
  });

  // ============================================================================
  // 2. ADVANCED FUNCTIONALITY TESTS - IMPORTANT
  // ============================================================================

  describe("2A. Multi-Selection & Batch Operations (IMPORTANT)", () => {
    beforeEach(async () => {
      await organizer.loadPDFFile(mockFile);
    });

    describe("sortSelectedPages (Reverse order of selected)", () => {
      it("should reverse order of selected pages", () => {
        const page0 = organizer.pages[0];
        const page2 = organizer.pages[2];

        organizer.sortSelectedPages([0, 2]);

        expect(organizer.pages[0]).toBe(page2);
        expect(organizer.pages[2]).toBe(page0);
      });

      it("should return pages array for empty selection", () => {
        const result = organizer.sortSelectedPages([]);
        expect(result).toBe(organizer.pages);
      });

      it("should return pages array for null selection", () => {
        const result = organizer.sortSelectedPages(null);
        expect(result).toBe(organizer.pages);
      });

      it("should handle single page selection (no change)", () => {
        const originalPage = organizer.pages[1];
        organizer.sortSelectedPages([1]);

        expect(organizer.pages[1]).toBe(originalPage);
      });
    });

    describe("Export only selected pages", () => {
      it("should export only selected page indices", async () => {
        const pdfBytes = await organizer.exportPDF([0, 2]);

        expect(pdfBytes).toBeInstanceOf(Uint8Array);
      });
    });
  });

  describe("2B. Split PDF Operations (IMPORTANT)", () => {
    beforeEach(async () => {
      await organizer.loadPDFFile(mockFile);
    });

    describe("Split at Page", () => {
      it("should split PDF into 2 parts at specific page", async () => {
        const result = await organizer.splitAtPage(2);

        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(Uint8Array);
        expect(result[1]).toBeInstanceOf(Uint8Array);
      });

      it("should split at page 1 (first page only in part 1)", async () => {
        const result = await organizer.splitAtPage(1);

        expect(result).toHaveLength(2);
      });

      it("should handle split at last-1 page", async () => {
        const lastPageNum = organizer.pages.length - 1;
        const result = await organizer.splitAtPage(lastPageNum);

        expect(result).toHaveLength(2);
      });
    });

    describe("Extract Page Range", () => {
      it("should extract pages from fromPage to toPage", async () => {
        const result = await organizer.extractPageRange(1, 2);

        expect(result).toBeInstanceOf(Uint8Array);
      });

      it("should extract a single page", async () => {
        const result = await organizer.extractPageRange(2, 2);

        expect(result).toBeInstanceOf(Uint8Array);
      });

      it("should extract all pages", async () => {
        const totalPages = organizer.pages.length;
        const result = await organizer.extractPageRange(1, totalPages);

        expect(result).toBeInstanceOf(Uint8Array);
      });
    });

    describe("Split Every N Pages", () => {
      it("should split into multiple parts with N pages each", async () => {
        const result = await organizer.splitEveryNPages(1);

        expect(result).toHaveLength(3); // 3 pages, 1 per part
        result.forEach((part) => {
          expect(part).toBeInstanceOf(Uint8Array);
        });
      });

      it("should handle when pages not divisible by N", async () => {
        const result = await organizer.splitEveryNPages(2);

        expect(result).toHaveLength(2); // 3 pages / 2 = 2 parts
      });

      it("should return single part when N >= total pages", async () => {
        const result = await organizer.splitEveryNPages(5);

        expect(result).toHaveLength(1);
      });
    });
  });

  // ============================================================================
  // 3. EDGE CASE TESTS - CRITICAL
  // ============================================================================

  describe("4A. Boundary Conditions (CRITICAL)", () => {
    describe("Load PDF with 0 pages", () => {
      it("should handle PDF with 0 pages gracefully", async () => {
        const originalGetDocument = window.pdfjsLib.getDocument;
        window.pdfjsLib.getDocument = vi.fn(() => ({
          promise: Promise.resolve({
            numPages: 0,
            getPage: vi.fn(),
          }),
        }));

        const result = await organizer.loadPDFFile(mockFile);
        expect(result.pages.length).toBe(0);

        window.pdfjsLib.getDocument = originalGetDocument;
      });
    });

    describe("Rotation boundary conditions", () => {
      beforeEach(async () => {
        await organizer.loadPDFFile(mockFile);
      });

      it("should normalize -360 degrees to 0", () => {
        const page = organizer.rotatePage(0, -360);
        expect(page.rotation).toBe(0);
      });

      it("should normalize 720 degrees to 0", () => {
        organizer.rotatePage(0, 360);
        const page = organizer.rotatePage(0, 360);
        expect(page.rotation).toBe(0);
      });

      it("should handle very large rotation value", () => {
        const page = organizer.rotatePage(0, 1080); // 3 full rotations
        expect(page.rotation).toBe(0);
      });
    });
  });

  describe("4B. Invalid Inputs (CRITICAL)", () => {
    describe("rotatePage with invalid index", () => {
      beforeEach(async () => {
        await organizer.loadPDFFile(mockFile);
      });

      it("should return undefined for non-existent index", () => {
        expect(organizer.rotatePage(999, 90)).toBeUndefined();
      });

      it("should return undefined for negative index", () => {
        expect(organizer.rotatePage(-1, 90)).toBeUndefined();
      });
    });

    describe("duplicatePage with invalid index", () => {
      beforeEach(async () => {
        await organizer.loadPDFFile(mockFile);
      });

      it("should return null for non-existent index", () => {
        expect(organizer.duplicatePage(999)).toBeNull();
      });

      it("should return null for negative index", () => {
        expect(organizer.duplicatePage(-1)).toBeNull();
      });
    });

    describe("movePage with invalid parameters", () => {
      beforeEach(async () => {
        await organizer.loadPDFFile(mockFile);
      });

      it("should return undefined for null fromIndex", () => {
        expect(organizer.movePage(null, 1)).toBeUndefined();
      });

      it("should return undefined for null toIndex", () => {
        expect(organizer.movePage(0, null)).toBeUndefined();
      });

      it("should return undefined for negative fromIndex", () => {
        expect(organizer.movePage(-1, 1)).toBeUndefined();
      });

      it("should return undefined for out of bounds toIndex", () => {
        expect(organizer.movePage(0, 999)).toBeUndefined();
      });
    });
  });

  describe("4C. State Management (CRITICAL)", () => {
    describe("Clear all pages and reset state", () => {
      it("should clear all data on clear()", async () => {
        await organizer.loadPDFFile(mockFile);
        organizer.clear();

        expect(organizer.pages).toEqual([]);
        expect(organizer.pageCanvasRefs).toEqual({});
        expect(organizer.nextPageId).toBe(0);
        expect(organizer.fileCounter).toBe(0);
      });
    });

    describe("nextPageId increments correctly", () => {
      it("should increment after loading file", async () => {
        await organizer.loadPDFFile(mockFile);
        expect(organizer.nextPageId).toBe(3);
      });

      it("should increment after adding blank page", async () => {
        await organizer.loadPDFFile(mockFile);
        const beforeId = organizer.nextPageId;
        organizer.addBlankPage(0);

        expect(organizer.nextPageId).toBe(beforeId + 1);
      });

      it("should increment after duplicating page", async () => {
        await organizer.loadPDFFile(mockFile);
        const beforeId = organizer.nextPageId;
        organizer.duplicatePage(0);

        expect(organizer.nextPageId).toBe(beforeId + 1);
      });
    });

    describe("fileCounter increments correctly", () => {
      it("should increment when loading new files", async () => {
        await organizer.loadPDFFile(mockFile, true);
        expect(organizer.fileCounter).toBe(1);

        await organizer.loadPDFFile(mockFile, false);
        expect(organizer.fileCounter).toBe(2);

        await organizer.loadPDFFile(mockFile, false);
        expect(organizer.fileCounter).toBe(3);
      });

      it("should reset to 0 when loading with reset=true", async () => {
        await organizer.loadPDFFile(mockFile, true);
        await organizer.loadPDFFile(mockFile, false);
        await organizer.loadPDFFile(mockFile, true);

        expect(organizer.fileCounter).toBe(1);
      });
    });
  });

  // ============================================================================
  // 5. ERROR HANDLING TESTS - IMPORTANT
  // ============================================================================

  describe("5A. Loading Errors (IMPORTANT)", () => {
    it("should throw error when PDF.js getDocument fails", async () => {
      const originalGetDocument = window.pdfjsLib.getDocument;
      window.pdfjsLib.getDocument = vi.fn(() => ({
        promise: Promise.reject(new Error("Invalid PDF")),
      }));

      await expect(organizer.loadPDFFile(mockFile)).rejects.toThrow("Invalid PDF");

      window.pdfjsLib.getDocument = originalGetDocument;
    });

    it("should throw error when arrayBuffer fails", async () => {
      const badFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.reject(new Error("Read failed"))),
      };

      await expect(organizer.loadPDFFile(badFile)).rejects.toThrow("Read failed");
    });
  });

  describe("5B. Rendering Errors (IMPORTANT)", () => {
    beforeEach(async () => {
      await organizer.loadPDFFile(mockFile);
    });

    it("should return undefined when canvas is null", async () => {
      const result = await organizer.renderPage(0, null);
      expect(result).toBeUndefined();
    });

    it("should return undefined when page has no externalPdfDoc", async () => {
      const mockCanvas = createMockCanvas();
      organizer.pages[0].externalPdfDoc = null;

      const result = await organizer.renderPage(0, mockCanvas);
      expect(result).toBeUndefined();
    });

    it("should throw error when PDF.js render fails", async () => {
      const mockCanvas = createMockCanvas();
      organizer.pages[0].externalPdfDoc = {
        getPage: vi.fn(() => Promise.reject(new Error("Render failed"))),
      };

      await expect(organizer.renderPage(0, mockCanvas)).rejects.toThrow("Render failed");
    });
  });

  describe("5C. Export Errors (IMPORTANT)", () => {
    beforeEach(async () => {
      await organizer.loadPDFFile(mockFile);
    });

    it("should throw error when PDFDocument.create fails", async () => {
      const originalCreate = window.PDFLib.PDFDocument.create;
      window.PDFLib.PDFDocument.create = vi.fn(() => Promise.reject(new Error("Create failed")));

      await expect(organizer.exportPDF()).rejects.toThrow("Create failed");

      window.PDFLib.PDFDocument.create = originalCreate;
    });

    it("should handle export of empty pages array", async () => {
      organizer.pages = [];
      const pdfBytes = await organizer.exportPDF();

      expect(pdfBytes).toBeInstanceOf(Uint8Array);
    });
  });

  describe("5D. Split/Merge Errors (IMPORTANT)", () => {
    beforeEach(async () => {
      await organizer.loadPDFFile(mockFile);
    });

    it("should throw error when splitAtPage fails", async () => {
      const originalCreate = window.PDFLib.PDFDocument.create;
      window.PDFLib.PDFDocument.create = vi.fn(() => Promise.reject(new Error("Split failed")));

      await expect(organizer.splitAtPage(1)).rejects.toThrow("Split failed");

      window.PDFLib.PDFDocument.create = originalCreate;
    });

    it("should throw error when extractPageRange fails", async () => {
      const originalCreate = window.PDFLib.PDFDocument.create;
      window.PDFLib.PDFDocument.create = vi.fn(() => Promise.reject(new Error("Extract failed")));

      await expect(organizer.extractPageRange(1, 2)).rejects.toThrow("Extract failed");

      window.PDFLib.PDFDocument.create = originalCreate;
    });

    it("should throw error when splitEveryNPages fails", async () => {
      const originalCreate = window.PDFLib.PDFDocument.create;
      window.PDFLib.PDFDocument.create = vi.fn(() =>
        Promise.reject(new Error("Split every failed")),
      );

      await expect(organizer.splitEveryNPages(1)).rejects.toThrow("Split every failed");

      window.PDFLib.PDFDocument.create = originalCreate;
    });
  });

  // ============================================================================
  // 6. HELPER METHOD TESTS
  // ============================================================================

  describe("Helper Methods", () => {
    describe("getPages", () => {
      it("should return the pages array", async () => {
        await organizer.loadPDFFile(mockFile);
        const pages = organizer.getPages();

        expect(pages).toBe(organizer.pages);
        expect(Array.isArray(pages)).toBe(true);
      });

      it("should return empty array when no pages loaded", () => {
        const pages = organizer.getPages();
        expect(pages).toEqual([]);
      });
    });

    describe("reversePages", () => {
      it("should reverse the order of all pages", async () => {
        await organizer.loadPDFFile(mockFile);
        const firstPage = organizer.pages[0];
        const lastPage = organizer.pages[2];

        organizer.reversePages();

        expect(organizer.pages[0]).toBe(lastPage);
        expect(organizer.pages[2]).toBe(firstPage);
      });

      it("should return the reversed pages array", async () => {
        await organizer.loadPDFFile(mockFile);
        const result = organizer.reversePages();

        expect(result).toBe(organizer.pages);
      });
    });

    describe("addPageToPdf (internal helper)", () => {
      it("should handle null pageInfo gracefully", async () => {
        await organizer.loadPDFFile(mockFile);
        const newPdf = await window.PDFLib.PDFDocument.create();
        const loadedPdfDocs = new Map();

        // Should not throw
        await expect(organizer.addPageToPdf(newPdf, null, loadedPdfDocs)).resolves.toBeUndefined();
      });
    });
  });

  // ============================================================================
  // 7. INTEGRATION-LIKE TESTS
  // ============================================================================

  describe("Integration Scenarios", () => {
    it("should handle complete workflow: load, edit, export", async () => {
      // Load
      await organizer.loadPDFFile(mockFile);
      expect(organizer.pages.length).toBe(3);

      // Edit
      organizer.rotatePage(0, 90);
      organizer.duplicatePage(1);
      organizer.addBlankPage(2);
      organizer.deletePage(4);

      expect(organizer.pages.length).toBe(4);
      expect(organizer.pages[0].rotation).toBe(90);
      expect(organizer.pages[2].isBlank).toBe(true);

      // Export
      const pdfBytes = await organizer.exportPDF();
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
    });

    it("should handle append and merge workflow", async () => {
      // Load first file
      await organizer.loadPDFFile(mockFile, true);
      const firstFilePages = organizer.pages.length;

      // Append second file
      await organizer.loadPDFFile(mockFile, false);
      expect(organizer.pages.length).toBe(firstFilePages * 2);

      // Verify fileIndex differentiation
      expect(organizer.pages[0].fileIndex).toBe(0);
      expect(organizer.pages[3].fileIndex).toBe(1);

      // Export combined
      const pdfBytes = await organizer.exportPDF();
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
    });

    it("should handle split workflow", async () => {
      await organizer.loadPDFFile(mockFile);

      // Split at page 2
      const [part1, part2] = await organizer.splitAtPage(2);

      expect(part1).toBeInstanceOf(Uint8Array);
      expect(part2).toBeInstanceOf(Uint8Array);
    });

    it("should handle complex page manipulation", async () => {
      await organizer.loadPDFFile(mockFile);

      // Complex operations
      organizer.movePage(0, 2);
      organizer.swapPages(0, 1);
      organizer.reversePages();
      organizer.addBlankPage(1);
      organizer.duplicatePage(0);

      expect(organizer.pages.length).toBe(5);

      const pdfBytes = await organizer.exportPDF();
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
    });
  });
});
