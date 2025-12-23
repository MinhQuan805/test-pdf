import { describe, it, expect, beforeEach, vi } from "vitest";
import { PDFOrganizer } from "../js/PDFOrganizer.js";

describe("PDFOrganizer", () => {
  let organizer;

  beforeEach(() => {
    organizer = new PDFOrganizer();
  });

  describe("Khởi tạo (Initialization)", () => {
    it("nên khởi tạo với các giá trị mặc định", () => {
      expect(organizer.pages).toEqual([]);
      expect(organizer.nextPageId).toBe(0);
      expect(organizer.fileCounter).toBe(0);
      expect(organizer.pageCanvasRefs).toEqual({});
    });
  });

  describe("loadPDFFile", () => {
    let mockFile;
    let mockArrayBuffer;

    beforeEach(() => {
      mockArrayBuffer = new ArrayBuffer(8);
      mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(mockArrayBuffer)),
      };
    });

    it("nên load file PDF thành công", async () => {
      const result = await organizer.loadPDFFile(mockFile);

      expect(result.pages.length).toBe(3); // Mock PDF có 3 trang
      expect(result.startId).toBe(0);
      expect(result.fileIndex).toBe(0);
      expect(organizer.pages.length).toBe(3);
    });

    it("nên reset pages khi reset = true", async () => {
      // Load file đầu tiên
      await organizer.loadPDFFile(mockFile);
      expect(organizer.pages.length).toBe(3);

      // Load file thứ hai với reset = true
      await organizer.loadPDFFile(mockFile, true);
      expect(organizer.pages.length).toBe(3); // Đã reset
      expect(organizer.nextPageId).toBe(3);
      expect(organizer.fileCounter).toBe(1);
    });

    it("nên append pages khi reset = false", async () => {
      // Load file đầu tiên
      await organizer.loadPDFFile(mockFile);
      expect(organizer.pages.length).toBe(3);

      // Load file thứ hai với reset = false
      await organizer.loadPDFFile(mockFile, false);
      expect(organizer.pages.length).toBe(6); // Đã append
      expect(organizer.fileCounter).toBe(2);
    });

    it("nên throw error khi file không phải PDF", async () => {
      const invalidFile = {
        type: "text/plain",
        arrayBuffer: vi.fn(),
      };

      await expect(organizer.loadPDFFile(invalidFile)).rejects.toThrow("File must be a PDF");
    });

    it("nên tạo page data đúng format", async () => {
      await organizer.loadPDFFile(mockFile);

      const page = organizer.pages[0];
      expect(page).toHaveProperty("id");
      expect(page).toHaveProperty("pageNumber");
      expect(page).toHaveProperty("rotation");
      expect(page).toHaveProperty("externalPdfDoc");
      expect(page).toHaveProperty("externalArrayBuffer");
      expect(page).toHaveProperty("fileIndex");
    });
  });

  describe("rotatePage", () => {
    beforeEach(async () => {
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };
      await organizer.loadPDFFile(mockFile);
    });

    it("nên rotate page clockwise 90 độ", () => {
      const page = organizer.rotatePage(0, 90);
      expect(page.rotation).toBe(90);
    });

    it("nên rotate page counter-clockwise -90 độ", () => {
      organizer.rotatePage(0, 90);
      const page = organizer.rotatePage(0, -90);
      expect(page.rotation).toBe(0);
    });

    it("nên xử lý rotation 360 độ thành 0", () => {
      organizer.rotatePage(0, 90);
      organizer.rotatePage(0, 90);
      organizer.rotatePage(0, 90);
      const page = organizer.rotatePage(0, 90);
      expect(page.rotation).toBe(0);
    });

    it("nên xử lý negative rotation", () => {
      const page = organizer.rotatePage(0, -90);
      expect(page.rotation).toBe(270);
    });

    it("nên return undefined khi index không tồn tại", () => {
      const result = organizer.rotatePage(999, 90);
      expect(result).toBeUndefined();
    });
  });

  describe("duplicatePage", () => {
    beforeEach(async () => {
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };
      await organizer.loadPDFFile(mockFile);
    });

    it("nên duplicate page thành công", () => {
      const originalLength = organizer.pages.length;
      const newPage = organizer.duplicatePage(0);

      expect(newPage).not.toBeNull();
      expect(organizer.pages.length).toBe(originalLength + 1);
      expect(newPage.pageNumber).toBe(organizer.pages[0].pageNumber);
    });

    it("nên insert duplicate page ngay sau original", () => {
      organizer.duplicatePage(1);

      expect(organizer.pages[1].pageNumber).toBe(organizer.pages[2].pageNumber);
    });

    it("nên copy tất cả properties từ original page", () => {
      const originalPage = organizer.pages[0];
      const newPage = organizer.duplicatePage(0);

      expect(newPage.pageNumber).toBe(originalPage.pageNumber);
      expect(newPage.rotation).toBe(originalPage.rotation);
      expect(newPage.externalPdfDoc).toBe(originalPage.externalPdfDoc);
      expect(newPage.fileIndex).toBe(originalPage.fileIndex);
    });

    it("nên có unique ID cho duplicated page", () => {
      const originalId = organizer.pages[0].id;
      const newPage = organizer.duplicatePage(0);

      expect(newPage.id).not.toBe(originalId);
      expect(newPage.id).toBeGreaterThan(originalId);
    });

    it("nên return null khi index không tồn tại", () => {
      const result = organizer.duplicatePage(999);
      expect(result).toBeNull();
    });
  });

  describe("addBlankPage", () => {
    beforeEach(async () => {
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };
      await organizer.loadPDFFile(mockFile);
    });

    it("nên thêm blank page tại index chỉ định", () => {
      const originalLength = organizer.pages.length;
      const blankPage = organizer.addBlankPage(1);

      expect(blankPage).not.toBeNull();
      expect(organizer.pages.length).toBe(originalLength + 1);
      expect(organizer.pages[1]).toBe(blankPage);
    });

    it("nên tạo blank page với đúng properties", () => {
      const blankPage = organizer.addBlankPage(0);

      expect(blankPage.isBlank).toBe(true);
      expect(blankPage.rotation).toBe(0);
      expect(blankPage.pageNumber).toBeNull();
      expect(blankPage).toHaveProperty("id");
    });

    it("nên có unique ID cho blank page", () => {
      const blankPage1 = organizer.addBlankPage(0);
      const blankPage2 = organizer.addBlankPage(1);

      expect(blankPage1.id).not.toBe(blankPage2.id);
    });
  });

  describe("deletePage", () => {
    beforeEach(async () => {
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };
      await organizer.loadPDFFile(mockFile);
    });

    it("nên xóa page thành công", () => {
      const originalLength = organizer.pages.length;
      const success = organizer.deletePage(1);

      expect(success).toBe(true);
      expect(organizer.pages.length).toBe(originalLength - 1);
    });

    it("không nên xóa page cuối cùng", () => {
      // Xóa đến còn 1 page
      while (organizer.pages.length > 1) {
        organizer.deletePage(0);
      }

      const success = organizer.deletePage(0);
      expect(success).toBe(false);
      expect(organizer.pages.length).toBe(1);
    });

    it("nên xóa đúng page tại index", () => {
      const pageToDelete = organizer.pages[1];
      organizer.deletePage(1);

      expect(organizer.pages).not.toContain(pageToDelete);
    });
  });

  describe("reversePages", () => {
    beforeEach(async () => {
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };
      await organizer.loadPDFFile(mockFile);
    });

    it("nên đảo ngược thứ tự pages", () => {
      const firstPage = organizer.pages[0];
      const lastPage = organizer.pages[organizer.pages.length - 1];

      organizer.reversePages();

      expect(organizer.pages[0]).toBe(lastPage);
      expect(organizer.pages[organizer.pages.length - 1]).toBe(firstPage);
    });

    it("nên return reversed pages", () => {
      const result = organizer.reversePages();
      expect(result).toBe(organizer.pages);
    });
  });

  describe("movePage", () => {
    beforeEach(async () => {
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };
      await organizer.loadPDFFile(mockFile);
    });

    it("nên move page từ index này sang index khác", () => {
      const pageToMove = organizer.pages[0];
      organizer.movePage(0, 2);

      expect(organizer.pages[2]).toBe(pageToMove);
    });

    it("nên giữ nguyên length của pages array", () => {
      const originalLength = organizer.pages.length;
      organizer.movePage(0, 2);

      expect(organizer.pages.length).toBe(originalLength);
    });

    it("nên return undefined khi fromIndex null", () => {
      const result = organizer.movePage(null, 1);
      expect(result).toBeUndefined();
    });

    it("nên return undefined khi toIndex null", () => {
      const result = organizer.movePage(0, null);
      expect(result).toBeUndefined();
    });

    it("nên return undefined khi index out of bounds", () => {
      const result = organizer.movePage(999, 0);
      expect(result).toBeUndefined();
    });
  });

  describe("getPages", () => {
    it("nên return pages array", async () => {
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };
      await organizer.loadPDFFile(mockFile);

      const pages = organizer.getPages();
      expect(pages).toBe(organizer.pages);
      expect(Array.isArray(pages)).toBe(true);
    });
  });

  describe("getPageById", () => {
    beforeEach(async () => {
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };
      await organizer.loadPDFFile(mockFile);
    });

    it("nên tìm page bằng ID", () => {
      const targetPage = organizer.pages[1];
      const foundPage = organizer.getPageById(targetPage.id);

      expect(foundPage).toBe(targetPage);
    });

    it("nên return null khi không tìm thấy page", () => {
      const foundPage = organizer.getPageById(9999);
      expect(foundPage).toBeNull();
    });
  });

  describe("getPageCount", () => {
    it("nên return 0 khi không có pages", () => {
      expect(organizer.getPageCount()).toBe(0);
    });

    it("nên return đúng số lượng pages", async () => {
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };
      await organizer.loadPDFFile(mockFile);

      expect(organizer.getPageCount()).toBe(3);
    });
  });

  describe("clear", () => {
    beforeEach(async () => {
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };
      await organizer.loadPDFFile(mockFile);
    });

    it("nên clear tất cả data", () => {
      organizer.clear();

      expect(organizer.pages).toEqual([]);
      expect(organizer.pageCanvasRefs).toEqual({});
      expect(organizer.nextPageId).toBe(0);
      expect(organizer.fileCounter).toBe(0);
    });
  });

  describe("renderBlankPage", () => {
    it("nên render blank page lên canvas", () => {
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          fillStyle: "",
          fillRect: vi.fn(),
        })),
      };

      organizer.renderBlankPage(mockCanvas);

      expect(mockCanvas.width).toBe(612);
      expect(mockCanvas.height).toBe(792);
      expect(mockCanvas.getContext).toHaveBeenCalledWith("2d");
    });

    it("nên handle null canvas", () => {
      expect(() => organizer.renderBlankPage(null)).not.toThrow();
    });
  });

  describe("renderPage", () => {
    beforeEach(async () => {
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };
      await organizer.loadPDFFile(mockFile);
    });

    it("nên render page lên canvas thành công", async () => {
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          fillStyle: "",
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          drawImage: vi.fn(),
        })),
      };

      await organizer.renderPage(0, mockCanvas);

      expect(mockCanvas.width).toBeGreaterThan(0);
      expect(mockCanvas.height).toBeGreaterThan(0);
      expect(mockCanvas.getContext).toHaveBeenCalledWith("2d");
    });

    it("nên return khi page không tồn tại", async () => {
      const mockCanvas = { getContext: vi.fn() };
      const result = await organizer.renderPage(999, mockCanvas);

      expect(result).toBeUndefined();
      expect(mockCanvas.getContext).not.toHaveBeenCalled();
    });

    it("nên return khi canvas là null", async () => {
      const result = await organizer.renderPage(0, null);
      expect(result).toBeUndefined();
    });

    it("nên throw error khi render thất bại", async () => {
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          fillStyle: "",
          fillRect: vi.fn(),
        })),
      };

      // Mock page render để throw error
      const originalPage = organizer.pages[0];
      organizer.pages[0].externalPdfDoc = {
        getPage: vi.fn(() => Promise.reject(new Error("Render failed"))),
      };

      await expect(organizer.renderPage(0, mockCanvas)).rejects.toThrow("Render failed");

      // Restore original page
      organizer.pages[0] = originalPage;
    });

    it("nên return khi page không có externalPdfDoc", async () => {
      const mockCanvas = { getContext: vi.fn() };
      const originalPdfDoc = organizer.pages[0].externalPdfDoc;

      organizer.pages[0].externalPdfDoc = null;
      const result = await organizer.renderPage(0, mockCanvas);

      expect(result).toBeUndefined();

      // Restore
      organizer.pages[0].externalPdfDoc = originalPdfDoc;
    });
  });

  describe("exportPDF", () => {
    beforeEach(async () => {
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };
      await organizer.loadPDFFile(mockFile);
    });

    it("nên export PDF thành công", async () => {
      const pdfBytes = await organizer.exportPDF();

      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });

    it("nên call progress callback", async () => {
      const progressCallback = vi.fn();
      await organizer.exportPDF(progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(100);
    });

    it("nên handle blank pages trong export", async () => {
      organizer.addBlankPage(1);

      const pdfBytes = await organizer.exportPDF();
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
    });

    it("nên handle rotated pages trong export", async () => {
      organizer.rotatePage(0, 90);

      const pdfBytes = await organizer.exportPDF();
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
    });

    it("nên handle blank page có rotation", async () => {
      const blankPage = organizer.addBlankPage(0);
      blankPage.rotation = 90;

      const pdfBytes = await organizer.exportPDF();
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
    });

    it("nên reuse loaded PDF documents", async () => {
      // Load same file twice để test cached documents
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };
      await organizer.loadPDFFile(mockFile, false);

      const pdfBytes = await organizer.exportPDF();
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
    });

    it("nên skip null pages trong export", async () => {
      // Add null page để test continue logic
      organizer.pages.push(null);

      const pdfBytes = await organizer.exportPDF();
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      // Remove null page
      organizer.pages.pop();
    });

    it("nên throw error khi export thất bại", async () => {
      // Mock PDFDocument.create để throw error
      const originalCreate = window.PDFLib.PDFDocument.create;
      window.PDFLib.PDFDocument.create = vi.fn(() => Promise.reject(new Error("Export failed")));

      await expect(organizer.exportPDF()).rejects.toThrow("Export failed");

      // Restore
      window.PDFLib.PDFDocument.create = originalCreate;
    });
  });

  describe("loadPDFFile - Error handling", () => {
    it("nên throw error khi PDF.js getDocument thất bại", async () => {
      const mockFile = {
        type: "application/pdf",
        arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
      };

      const originalGetDocument = window.pdfjsLib.getDocument;
      window.pdfjsLib.getDocument = vi.fn(() => ({
        promise: Promise.reject(new Error("Invalid PDF")),
      }));

      await expect(organizer.loadPDFFile(mockFile)).rejects.toThrow("Invalid PDF");

      // Restore
      window.pdfjsLib.getDocument = originalGetDocument;
    });
  });
});
