import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PDFOrganizer } from "../js/PDFOrganizer.js";

/**
 * Memory Leak & Performance Test Suite for PDFOrganizer
 *
 * Tests cover:
 * - Memory leak detection during file operations
 * - Resource cleanup verification
 * - PDF.js document destruction
 * - Canvas reference management
 * - ArrayBuffer and Map cleanup
 * - Performance under load
 */

describe("PDFOrganizer - Memory Leak & Performance Tests", () => {
  let organizer;
  let mockFile;

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
      _mockContext: mockContext,
    };
  };

  beforeEach(() => {
    organizer = new PDFOrganizer();
    mockFile = createMockFile();
  });

  afterEach(() => {
    // Ensure cleanup after each test
    if (organizer) {
      organizer.clear();
    }
    vi.clearAllMocks();
  });

  // ============================================================================
  // MEMORY LEAK TESTS - PDF.js Document Cleanup
  // ============================================================================

  describe("Memory Leak - PDF.js Document Lifecycle", () => {
    describe("PDF.js document destruction on file cleanup", () => {
      it("should call destroy() on PDF.js document when cleanupFile is called", async () => {
        await organizer.loadPDFFile(mockFile);

        // Get the stored pdfDoc and spy on destroy
        const pdfDoc = organizer.filePdfDocs.get(0);
        const destroySpy = vi.spyOn(pdfDoc, "destroy").mockImplementation(() => {});

        organizer.cleanupFile(0);

        expect(destroySpy).toHaveBeenCalledTimes(1);
      });

      it("should remove pdfDoc reference from filePdfDocs Map after cleanup", async () => {
        await organizer.loadPDFFile(mockFile);

        expect(organizer.filePdfDocs.has(0)).toBe(true);

        organizer.cleanupFile(0);

        expect(organizer.filePdfDocs.has(0)).toBe(false);
      });

      it("should remove buffer reference from fileBuffers Map after cleanup", async () => {
        await organizer.loadPDFFile(mockFile);

        expect(organizer.fileBuffers.has(0)).toBe(true);

        organizer.cleanupFile(0);

        expect(organizer.fileBuffers.has(0)).toBe(false);
      });

      it("should remove usage tracking from fileUsage Map after cleanup", async () => {
        await organizer.loadPDFFile(mockFile);

        expect(organizer.fileUsage.has(0)).toBe(true);

        organizer.cleanupFile(0);

        expect(organizer.fileUsage.has(0)).toBe(false);
      });

      it("should handle destroy() throwing error gracefully", async () => {
        await organizer.loadPDFFile(mockFile);

        const pdfDoc = organizer.filePdfDocs.get(0);
        vi.spyOn(pdfDoc, "destroy").mockImplementation(() => {
          throw new Error("Destroy failed");
        });

        // Should not throw
        expect(() => organizer.cleanupFile(0)).not.toThrow();

        // Maps should still be cleaned
        expect(organizer.filePdfDocs.has(0)).toBe(false);
        expect(organizer.fileBuffers.has(0)).toBe(false);
      });

      it("should handle cleanupFile when pdfDoc has no destroy method", async () => {
        await organizer.loadPDFFile(mockFile);

        // Remove destroy method
        const pdfDoc = organizer.filePdfDocs.get(0);
        delete pdfDoc.destroy;

        // Should not throw
        expect(() => organizer.cleanupFile(0)).not.toThrow();
        expect(organizer.filePdfDocs.has(0)).toBe(false);
      });
    });

    describe("PDF.js document destruction on clear()", () => {
      it("should call destroy() on all PDF.js documents when clear() is called", async () => {
        // Load multiple files
        await organizer.loadPDFFile(mockFile, true);
        await organizer.loadPDFFile(mockFile, false);
        await organizer.loadPDFFile(mockFile, false);

        const destroySpies = [];
        for (const [, pdfDoc] of organizer.filePdfDocs.entries()) {
          const spy = vi.spyOn(pdfDoc, "destroy").mockImplementation(() => {});
          destroySpies.push(spy);
        }

        organizer.clear();

        destroySpies.forEach((spy) => {
          expect(spy).toHaveBeenCalledTimes(1);
        });
      });

      it("should clear all Maps after clear()", async () => {
        await organizer.loadPDFFile(mockFile, true);
        await organizer.loadPDFFile(mockFile, false);

        expect(organizer.filePdfDocs.size).toBe(2);
        expect(organizer.fileBuffers.size).toBe(2);
        expect(organizer.fileUsage.size).toBe(2);

        organizer.clear();

        expect(organizer.filePdfDocs.size).toBe(0);
        expect(organizer.fileBuffers.size).toBe(0);
        expect(organizer.fileUsage.size).toBe(0);
      });

      it("should reset all counters after clear()", async () => {
        await organizer.loadPDFFile(mockFile, true);
        await organizer.loadPDFFile(mockFile, false);

        expect(organizer.nextPageId).toBe(6);
        expect(organizer.fileCounter).toBe(2);

        organizer.clear();

        expect(organizer.nextPageId).toBe(0);
        expect(organizer.fileCounter).toBe(0);
      });

      it("should clear pages array after clear()", async () => {
        await organizer.loadPDFFile(mockFile, true);

        expect(organizer.pages.length).toBe(3);

        organizer.clear();

        expect(organizer.pages.length).toBe(0);
      });

      it("should clear pageCanvasRefs after clear()", async () => {
        await organizer.loadPDFFile(mockFile, true);
        organizer.pageCanvasRefs[0] = createMockCanvas();
        organizer.pageCanvasRefs[1] = createMockCanvas();

        expect(Object.keys(organizer.pageCanvasRefs).length).toBe(2);

        organizer.clear();

        expect(Object.keys(organizer.pageCanvasRefs).length).toBe(0);
      });
    });
  });

  // ============================================================================
  // MEMORY LEAK TESTS - Page Deletion Cleanup
  // ============================================================================

  describe("Memory Leak - Page Deletion Cleanup", () => {
    describe("File usage tracking on page deletion", () => {
      it("should decrement fileUsage when deleting a page", async () => {
        await organizer.loadPDFFile(mockFile);

        expect(organizer.fileUsage.get(0)).toBe(3);

        organizer.deletePage(0);

        expect(organizer.fileUsage.get(0)).toBe(2);
      });

      it("should cleanup file when last page from file is deleted", async () => {
        await organizer.loadPDFFile(mockFile);

        const pdfDoc = organizer.filePdfDocs.get(0);
        const destroySpy = vi.spyOn(pdfDoc, "destroy").mockImplementation(() => {});

        // Delete all pages from the file
        organizer.deletePage(0); // 2 pages left
        organizer.deletePage(0); // 1 page left
        organizer.deletePage(0); // 0 pages left

        expect(destroySpy).toHaveBeenCalledTimes(1);
        expect(organizer.filePdfDocs.has(0)).toBe(false);
        expect(organizer.fileBuffers.has(0)).toBe(false);
        expect(organizer.fileUsage.has(0)).toBe(false);
      });

      it("should not cleanup file when pages from file still exist", async () => {
        await organizer.loadPDFFile(mockFile);

        const pdfDoc = organizer.filePdfDocs.get(0);
        const destroySpy = vi.spyOn(pdfDoc, "destroy").mockImplementation(() => {});

        organizer.deletePage(0);
        organizer.deletePage(0);

        // One page still exists
        expect(destroySpy).not.toHaveBeenCalled();
        expect(organizer.filePdfDocs.has(0)).toBe(true);
        expect(organizer.fileUsage.get(0)).toBe(1);
      });

      it("should handle deletion of blank page without affecting file usage", async () => {
        await organizer.loadPDFFile(mockFile);
        organizer.addBlankPage(0);

        const initialUsage = organizer.fileUsage.get(0);

        // Delete blank page (index 0)
        organizer.deletePage(0);

        // Usage should remain the same
        expect(organizer.fileUsage.get(0)).toBe(initialUsage);
      });

      it("should handle multiple files with correct cleanup", async () => {
        await organizer.loadPDFFile(mockFile, true);
        await organizer.loadPDFFile(mockFile, false);

        const pdfDoc0 = organizer.filePdfDocs.get(0);
        const pdfDoc1 = organizer.filePdfDocs.get(1);
        const destroySpy0 = vi.spyOn(pdfDoc0, "destroy").mockImplementation(() => {});
        const destroySpy1 = vi.spyOn(pdfDoc1, "destroy").mockImplementation(() => {});

        // Delete all pages from first file (indices 0, 1, 2)
        organizer.deletePage(0);
        organizer.deletePage(0);
        organizer.deletePage(0);

        // First file should be cleaned up
        expect(destroySpy0).toHaveBeenCalledTimes(1);
        expect(organizer.filePdfDocs.has(0)).toBe(false);

        // Second file should still exist
        expect(destroySpy1).not.toHaveBeenCalled();
        expect(organizer.filePdfDocs.has(1)).toBe(true);
        expect(organizer.fileUsage.get(1)).toBe(3);
      });
    });

    describe("Canvas reference cleanup on page deletion", () => {
      it("should remove canvas reference when page is deleted", async () => {
        await organizer.loadPDFFile(mockFile);

        // Add canvas refs
        organizer.pageCanvasRefs[0] = createMockCanvas();
        organizer.pageCanvasRefs[1] = createMockCanvas();
        organizer.pageCanvasRefs[2] = createMockCanvas();

        organizer.deletePage(0);

        expect(organizer.pageCanvasRefs[0]).toBeUndefined();
        // Other refs should still exist
        expect(organizer.pageCanvasRefs[1]).toBeDefined();
        expect(organizer.pageCanvasRefs[2]).toBeDefined();
      });

      it("should handle deletion when no canvas reference exists", async () => {
        await organizer.loadPDFFile(mockFile);

        // No canvas refs set
        expect(() => organizer.deletePage(0)).not.toThrow();
      });
    });
  });

  // ============================================================================
  // MEMORY LEAK TESTS - Duplicate Page Memory
  // ============================================================================

  describe("Memory Leak - Duplicate Page Reference Sharing", () => {
    it("should share externalPdfDoc reference when duplicating page", async () => {
      await organizer.loadPDFFile(mockFile);

      const originalPdfDoc = organizer.pages[0].externalPdfDoc;
      organizer.duplicatePage(0);

      const duplicatedPdfDoc = organizer.pages[1].externalPdfDoc;

      // Should be the exact same reference (not a copy)
      expect(duplicatedPdfDoc).toBe(originalPdfDoc);
    });

    it("should share externalArrayBuffer reference when duplicating page", async () => {
      await organizer.loadPDFFile(mockFile);

      const originalBuffer = organizer.pages[0].externalArrayBuffer;
      organizer.duplicatePage(0);

      const duplicatedBuffer = organizer.pages[1].externalArrayBuffer;

      // Should be the exact same reference
      expect(duplicatedBuffer).toBe(originalBuffer);
    });

    it("should share fileIndex when duplicating page", async () => {
      await organizer.loadPDFFile(mockFile);

      organizer.duplicatePage(0);

      expect(organizer.pages[0].fileIndex).toBe(organizer.pages[1].fileIndex);
    });

    it("should not increase fileUsage when duplicating (shared reference)", async () => {
      await organizer.loadPDFFile(mockFile);

      const usageBefore = organizer.fileUsage.get(0);
      organizer.duplicatePage(0);

      // Note: Current implementation doesn't increment usage on duplicate
      // This tests the current behavior
      expect(organizer.fileUsage.get(0)).toBe(usageBefore);
    });
  });

  // ============================================================================
  // MEMORY LEAK TESTS - Load with Reset
  // ============================================================================

  describe("Memory Leak - Load with Reset", () => {
    it("should clear previous file references when loading with reset=true", async () => {
      await organizer.loadPDFFile(mockFile, true);

      const firstPdfDoc = organizer.filePdfDocs.get(0);
      expect(firstPdfDoc).toBeDefined();

      // Load new file with reset
      await organizer.loadPDFFile(mockFile, true);

      // New file should have fileIndex 0 again
      expect(organizer.filePdfDocs.size).toBe(1);
      expect(organizer.fileCounter).toBe(1);
    });

    it("should preserve file references when loading with reset=false", async () => {
      await organizer.loadPDFFile(mockFile, true);
      await organizer.loadPDFFile(mockFile, false);

      expect(organizer.filePdfDocs.size).toBe(2);
      expect(organizer.filePdfDocs.has(0)).toBe(true);
      expect(organizer.filePdfDocs.has(1)).toBe(true);
    });

    it("should not leak memory when rapidly loading files with reset", async () => {
      for (let i = 0; i < 10; i++) {
        await organizer.loadPDFFile(mockFile, true);
      }

      // Only the last file should be tracked
      expect(organizer.filePdfDocs.size).toBe(1);
      expect(organizer.fileBuffers.size).toBe(1);
      expect(organizer.fileUsage.size).toBe(1);
      expect(organizer.pages.length).toBe(3);
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS - Large Operations
  // ============================================================================

  describe("Performance - Large Scale Operations", () => {
    // Create a mock with many pages
    const createLargeFileMock = (numPages) => {
      const originalGetDocument = window.pdfjsLib.getDocument;
      window.pdfjsLib.getDocument = vi.fn(() => ({
        promise: Promise.resolve({
          numPages: numPages,
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
          destroy: vi.fn(),
        }),
      }));

      return () => {
        window.pdfjsLib.getDocument = originalGetDocument;
      };
    };

    it("should handle loading large PDF (100+ pages) efficiently", async () => {
      const restore = createLargeFileMock(100);

      const startTime = performance.now();
      await organizer.loadPDFFile(mockFile);
      const endTime = performance.now();

      expect(organizer.pages.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      restore();
    });

    it("should handle bulk page deletion efficiently", async () => {
      const restore = createLargeFileMock(50);
      await organizer.loadPDFFile(mockFile);

      const startTime = performance.now();

      // Delete all pages
      while (organizer.pages.length > 0) {
        organizer.deletePage(0);
      }

      const endTime = performance.now();

      expect(organizer.pages.length).toBe(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

      restore();
    });

    it("should handle bulk page rotation efficiently", async () => {
      const restore = createLargeFileMock(50);
      await organizer.loadPDFFile(mockFile);

      const startTime = performance.now();

      // Rotate all pages
      for (let i = 0; i < organizer.pages.length; i++) {
        organizer.rotatePage(i, 90);
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be very fast

      restore();
    });

    it("should handle bulk page duplication efficiently", async () => {
      const restore = createLargeFileMock(20);
      await organizer.loadPDFFile(mockFile);

      const startTime = performance.now();

      // Duplicate each page (going backwards to avoid index issues)
      for (let i = 19; i >= 0; i--) {
        organizer.duplicatePage(i);
      }

      const endTime = performance.now();

      expect(organizer.pages.length).toBe(40);
      expect(endTime - startTime).toBeLessThan(100);

      restore();
    });

    it("should handle reversePages efficiently", async () => {
      const restore = createLargeFileMock(100);
      await organizer.loadPDFFile(mockFile);

      const startTime = performance.now();
      organizer.reversePages();
      const endTime = performance.now();

      expect(organizer.pages[0].pageNumber).toBe(100);
      expect(organizer.pages[99].pageNumber).toBe(1);
      expect(endTime - startTime).toBeLessThan(50);

      restore();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS - Memory Efficiency
  // ============================================================================

  describe("Performance - Memory Efficiency", () => {
    it("should not create duplicate ArrayBuffers when loading same file", async () => {
      await organizer.loadPDFFile(mockFile, true);

      // All pages from same file should reference same buffer
      const buffer = organizer.pages[0].externalArrayBuffer;
      for (const page of organizer.pages) {
        expect(page.externalArrayBuffer).toBe(buffer);
      }
    });

    it("should not create duplicate pdfDoc references within same file", async () => {
      await organizer.loadPDFFile(mockFile, true);

      const pdfDoc = organizer.pages[0].externalPdfDoc;
      for (const page of organizer.pages) {
        expect(page.externalPdfDoc).toBe(pdfDoc);
      }
    });

    it("should use Map for efficient file tracking", async () => {
      await organizer.loadPDFFile(mockFile, true);
      await organizer.loadPDFFile(mockFile, false);
      await organizer.loadPDFFile(mockFile, false);

      // O(1) lookups
      expect(organizer.filePdfDocs.get(0)).toBeDefined();
      expect(organizer.filePdfDocs.get(1)).toBeDefined();
      expect(organizer.filePdfDocs.get(2)).toBeDefined();
      expect(organizer.filePdfDocs.get(3)).toBeUndefined();
    });
  });

  // ============================================================================
  // MEMORY LEAK TESTS - Edge Cases
  // ============================================================================

  describe("Memory Leak - Edge Cases", () => {
    it("should handle rapid load/clear cycles without memory leak", async () => {
      for (let i = 0; i < 5; i++) {
        await organizer.loadPDFFile(mockFile, true);
        organizer.clear();
      }

      expect(organizer.pages.length).toBe(0);
      expect(organizer.filePdfDocs.size).toBe(0);
      expect(organizer.fileBuffers.size).toBe(0);
      expect(organizer.fileUsage.size).toBe(0);
      expect(organizer.nextPageId).toBe(0);
      expect(organizer.fileCounter).toBe(0);
    });

    it("should handle interleaved append and delete operations", async () => {
      await organizer.loadPDFFile(mockFile, true);
      await organizer.loadPDFFile(mockFile, false);

      // Delete some pages from first file
      organizer.deletePage(0);
      organizer.deletePage(0);

      // Append another file
      await organizer.loadPDFFile(mockFile, false);

      // Delete remaining page from first file
      organizer.deletePage(0);

      // First file should be cleaned up
      expect(organizer.filePdfDocs.has(0)).toBe(false);

      // Other files should remain
      expect(organizer.filePdfDocs.has(1)).toBe(true);
      expect(organizer.filePdfDocs.has(2)).toBe(true);
    });

    it("should handle delete on empty pages array gracefully", () => {
      expect(() => organizer.deletePage(0)).not.toThrow();
      expect(organizer.pages.length).toBe(0);
    });

    it("should handle clear on empty organizer gracefully", () => {
      expect(() => organizer.clear()).not.toThrow();
    });

    it("should handle cleanupFile for non-existent file index", () => {
      expect(() => organizer.cleanupFile(999)).not.toThrow();
    });

    it("should handle deletion when page has no fileIndex (blank page)", async () => {
      organizer.addBlankPage(0);

      expect(organizer.pages[0].isBlank).toBe(true);
      expect(organizer.pages[0].fileIndex).toBeUndefined();

      expect(() => organizer.deletePage(0)).not.toThrow();
      expect(organizer.pages.length).toBe(0);
    });

    it("should not leak canvas refs when deleting all pages", async () => {
      await organizer.loadPDFFile(mockFile);

      // Add canvas refs
      organizer.pageCanvasRefs[0] = createMockCanvas();
      organizer.pageCanvasRefs[1] = createMockCanvas();
      organizer.pageCanvasRefs[2] = createMockCanvas();

      organizer.deletePage(0);
      organizer.deletePage(0);
      organizer.deletePage(0);

      expect(organizer.pageCanvasRefs[0]).toBeUndefined();
      expect(organizer.pageCanvasRefs[1]).toBeUndefined();
      expect(organizer.pageCanvasRefs[2]).toBeUndefined();
    });
  });

  // ============================================================================
  // MEMORY LEAK TESTS - Export Operations
  // ============================================================================

  describe("Memory Leak - Export Operations", () => {
    it("should not leak loadedPdfDocs Map in exportPDF", async () => {
      await organizer.loadPDFFile(mockFile);

      // Export should not affect internal state
      const pagesBefore = organizer.pages.length;
      const fileDocsBefore = organizer.filePdfDocs.size;

      await organizer.exportPDF();

      expect(organizer.pages.length).toBe(pagesBefore);
      expect(organizer.filePdfDocs.size).toBe(fileDocsBefore);
    });

    it("should not leak loadedPdfDocs Map in splitAtPage", async () => {
      await organizer.loadPDFFile(mockFile);

      const fileDocsBefore = organizer.filePdfDocs.size;

      await organizer.splitAtPage(2);

      expect(organizer.filePdfDocs.size).toBe(fileDocsBefore);
    });

    it("should not leak loadedPdfDocs Map in extractPageRange", async () => {
      await organizer.loadPDFFile(mockFile);

      const fileDocsBefore = organizer.filePdfDocs.size;

      await organizer.extractPageRange(1, 2);

      expect(organizer.filePdfDocs.size).toBe(fileDocsBefore);
    });

    it("should not leak loadedPdfDocs Map in splitEveryNPages", async () => {
      await organizer.loadPDFFile(mockFile);

      const fileDocsBefore = organizer.filePdfDocs.size;

      await organizer.splitEveryNPages(1);

      expect(organizer.filePdfDocs.size).toBe(fileDocsBefore);
    });
  });

  // ============================================================================
  // CONCURRENCY TESTS
  // ============================================================================

  describe("Concurrency - Parallel Operations", () => {
    it("should handle concurrent page operations without corruption", async () => {
      await organizer.loadPDFFile(mockFile);

      // Simulate concurrent operations
      const operations = [
        () => organizer.rotatePage(0, 90),
        () => organizer.rotatePage(1, 180),
        () => organizer.rotatePage(2, 270),
      ];

      await Promise.all(operations.map((op) => Promise.resolve(op())));

      expect(organizer.pages[0].rotation).toBe(90);
      expect(organizer.pages[1].rotation).toBe(180);
      expect(organizer.pages[2].rotation).toBe(270);
    });

    it("should handle rapid successive file loads", async () => {
      const loadPromises = [];

      for (let i = 0; i < 3; i++) {
        loadPromises.push(organizer.loadPDFFile(mockFile, false));
      }

      await Promise.all(loadPromises);

      // Should have loaded all files
      expect(organizer.fileCounter).toBe(3);
      expect(organizer.pages.length).toBe(9);
    });
  });

  // ============================================================================
  // REFERENCE INTEGRITY TESTS
  // ============================================================================

  describe("Reference Integrity", () => {
    it("should maintain consistent page IDs after multiple operations", async () => {
      await organizer.loadPDFFile(mockFile);

      const initialIds = organizer.pages.map((p) => p.id);

      // Perform various operations
      organizer.rotatePage(0, 90);
      organizer.rotatePage(1, 180);

      // Move pages
      organizer.movePage(2, 0);

      const afterIds = organizer.pages.map((p) => p.id);

      // IDs should be preserved (just reordered)
      expect(afterIds.sort()).toEqual(initialIds.sort());
    });

    it("should maintain fileIndex integrity after page movements", async () => {
      await organizer.loadPDFFile(mockFile, true);
      await organizer.loadPDFFile(mockFile, false);

      // Get original fileIndices
      const originalFileIndices = organizer.pages.map((p) => p.fileIndex);

      // Reverse pages
      organizer.reversePages();

      // FileIndices should be preserved
      const newFileIndices = organizer.pages.map((p) => p.fileIndex);
      expect(newFileIndices.sort()).toEqual(originalFileIndices.sort());
    });

    it("should maintain externalPdfDoc references after page movements", async () => {
      await organizer.loadPDFFile(mockFile, true);

      const originalPdfDoc = organizer.pages[0].externalPdfDoc;

      organizer.movePage(0, 2);

      // PdfDoc reference should be preserved
      expect(organizer.pages[2].externalPdfDoc).toBe(originalPdfDoc);
    });
  });
});
