import { toRaw } from "vue";
class PDFOrganizer {
  constructor() {
    this.pages = [];
    this.pageCanvasRefs = {};
    this.nextPageId = 0;
    this.fileCounter = 0;
  }

  // Load a PDF file and extract its pages
  async loadPDFFile(file, reset = true) {
    try {
      const originalBuffer = await file.arrayBuffer();
      const bufferForDisplay = originalBuffer.slice(0);
      const pdfDoc = await window.pdfjsLib.getDocument({ data: bufferForDisplay }).promise;

      if (reset) {
        this.pages = [];
        this.pageCanvasRefs = {};
        this.nextPageId = 0;
        this.fileCounter = 0;
      }

      const currentIndex = this.fileCounter++;
      const startId = this.nextPageId;
      const newPages = [];

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const pdfPage = await pdfDoc.getPage(i);
        const baseRotation = pdfPage.rotate || 0;
        const pageData = {
          id: this.nextPageId++,
          pageNumber: i,
          rotation: baseRotation,
          externalPdfDoc: pdfDoc,
          externalArrayBuffer: originalBuffer,
          fileIndex: currentIndex,
        };
        this.pages.push(pageData);
        newPages.push(pageData);
      }

      return {
        pages: this.pages,
        newPages,
        startId,
        endId: this.nextPageId,
        fileIndex: currentIndex,
      };
    } catch (err) {
      console.error("Error loading PDF:", err);
      throw err;
    }
  }

  // Render a specific page onto a canvas
  async renderPage(index, canvas, scale = 0.5) {
    const page = this.pages[index];
    if (!page || !canvas) return;

    // Check if it's a blank page
    if (page.isBlank) {
      this.renderBlankPage(canvas);
      return;
    }

    let pdfInstance = null;
    try {
      if (page.externalPdfDoc) {
        // Use to Raw to avoid Vue reactivity issues
        pdfInstance = toRaw(page.externalPdfDoc);
      } else {
        return;
      }

      const pdfPage = await pdfInstance.getPage(page.pageNumber);
      const viewport = pdfPage.getViewport({
        scale: scale,
        rotation: page.rotation,
      });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext("2d");
      await pdfPage.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    } catch (err) {
      console.error("Error rendering page:", err);
      throw err;
    }
  }

  // Rotate a page by a given number of degrees
  rotatePage(index, degrees) {
    if (!this.pages[index]) return;

    this.pages[index].rotation = (this.pages[index].rotation + degrees) % 360;
    if (this.pages[index].rotation < 0) {
      this.pages[index].rotation += 360;
    }

    return this.pages[index];
  }

  // Duplicate a page at the given index
  duplicatePage(index) {
    const originalPage = this.pages[index];
    if (!originalPage) return null;

    const newPage = {
      id: this.nextPageId++,
      pageNumber: originalPage.pageNumber,
      rotation: originalPage.rotation,
      externalPdfDoc: originalPage.externalPdfDoc,
      externalArrayBuffer: originalPage.externalArrayBuffer,
      fileIndex: originalPage.fileIndex,
    };

    // Preserve isBlank property if it exists
    if (originalPage.isBlank) {
      newPage.isBlank = true;
    }

    this.pages.splice(index + 1, 0, newPage);
    return newPage;
  }

  // Add a blank page at the specified index
  addBlankPage(index) {
    const blankPage = {
      id: this.nextPageId++,
      pageNumber: null,
      rotation: 0,
      isBlank: true,
    };

    this.pages.splice(index, 0, blankPage);
    return blankPage;
  }

  // Render a blank (white) page onto a canvas
  renderBlankPage(canvas) {
    if (!canvas) return;

    canvas.width = 612;
    canvas.height = 792;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Delete a page at the given index (if more than one page exists)
  deletePage(index) {
    this.pages.splice(index, 1);
    return true;
  }

  // Reverse the order of all pages
  reversePages() {
    this.pages.reverse();
    return this.pages;
  }
  // Sort (reverse) selected pages while keeping them in their positions
  sortSelectedPages(selectedIndices) {
    if (!selectedIndices || selectedIndices.length === 0) return this.pages;

    // Extract the selected pages
    const selectedPages = selectedIndices.map((idx) => this.pages[idx]);

    // Reverse the selected pages
    selectedPages.reverse();

    // Put them back in their original positions
    selectedIndices.forEach((idx, i) => {
      this.pages[idx] = selectedPages[i];
    });

    return this.pages;
  }

  // Move a page from one index to another
  movePage(fromIndex, toIndex) {
    if (fromIndex === null || toIndex === null) return;
    if (fromIndex < 0 || fromIndex >= this.pages.length) return;
    if (toIndex < 0 || toIndex >= this.pages.length) return;

    const draggedPage = this.pages[fromIndex];
    this.pages.splice(fromIndex, 1);
    this.pages.splice(toIndex, 0, draggedPage);
    return this.pages;
  }

  // Move multiple pages to a drop position (used for drag-and-drop multiple selected pages)
  moveMultiplePages(pageIndices, dropIndex) {
    if (!pageIndices || pageIndices.length === 0) return this.pages;
    if (dropIndex < 0 || dropIndex >= this.pages.length) return this.pages;

    // Get the selected pages data before removing them
    const selectedPages = pageIndices.map((idx) => this.pages[idx]);

    // Remove selected pages from highest index to lowest to maintain correct indices
    for (let i = pageIndices.length - 1; i >= 0; i--) {
      this.pages.splice(pageIndices[i], 1);
    }

    // Calculate new drop position
    let adjustedDropIndex = dropIndex;
    for (const idx of pageIndices) {
      if (idx < dropIndex) {
        adjustedDropIndex--;
      }
    }

    // Insert selected pages after the drop position
    for (let i = 0; i < selectedPages.length; i++) {
      this.pages.splice(adjustedDropIndex + 1 + i, 0, selectedPages[i]);
    }

    return this.pages;
  }

  // Swap two pages
  swapPages(index1, index2) {
    if (index1 === null || index2 === null) return;
    if (index1 < 0 || index1 >= this.pages.length) return;
    if (index2 < 0 || index2 >= this.pages.length) return;
    if (index1 === index2) return;

    const temp = this.pages[index1];
    this.pages[index1] = this.pages[index2];
    this.pages[index2] = temp;
    return this.pages;
  }

  // Get the list of all pages
  getPages() {
    return this.pages;
  }

  // Export pages as PDF
  async exportPDF(pageIndices = null) {
    try {
      const { PDFDocument, degrees } = window.PDFLib;
      const loadedPdfDocs = new Map();

      const newPdf = await PDFDocument.create();

      // If no indices provided, export all pages
      const indices = pageIndices || Array.from({ length: this.pages.length }, (_, i) => i);

      for (const index of indices) {
        const pageInfo = this.pages[index];
        if (!pageInfo) continue;

        if (pageInfo.isBlank) {
          const blankPage = newPdf.addPage([612, 792]);
          if (pageInfo.rotation !== 0) {
            blankPage.setRotation(degrees(pageInfo.rotation));
          }
        } else {
          let srcDoc;
          const buffer = pageInfo.externalArrayBuffer;
          if (loadedPdfDocs.has(buffer)) {
            srcDoc = loadedPdfDocs.get(buffer);
          } else {
            srcDoc = await PDFDocument.load(buffer);
            loadedPdfDocs.set(buffer, srcDoc);
          }
          const [copiedPage] = await newPdf.copyPages(srcDoc, [pageInfo.pageNumber - 1]);
          if (pageInfo.rotation !== 0) {
            const currentRotation = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees(currentRotation + pageInfo.rotation));
          }
          newPdf.addPage(copiedPage);
        }
      }

      const pdfBytes = await newPdf.save();
      return pdfBytes;
    } catch (err) {
      console.error("Error exporting PDF:", err);
      throw err;
    }
  }

  // Clear all pages and reset the organizer
  clear() {
    this.pages = [];
    this.pageCanvasRefs = {};
    this.nextPageId = 0;
    this.fileCounter = 0;
  }

  // Split PDF methods
  async splitAtPage(pageNumber) {
    try {
      const { PDFDocument, degrees } = window.PDFLib;
      const loadedPdfDocs = new Map();

      // Create two new PDFs
      const pdf1 = await PDFDocument.create();
      const pdf2 = await PDFDocument.create();

      // First part: pages 1 to pageNumber
      for (let i = 0; i < pageNumber; i++) {
        const pageInfo = this.pages[i];
        if (!pageInfo) continue;

        if (pageInfo.isBlank) {
          const blankPage = pdf1.addPage([612, 792]);
          if (pageInfo.rotation !== 0) {
            blankPage.setRotation(degrees(pageInfo.rotation));
          }
        } else {
          let srcDoc;
          const buffer = pageInfo.externalArrayBuffer;
          if (loadedPdfDocs.has(buffer)) {
            srcDoc = loadedPdfDocs.get(buffer);
          } else {
            srcDoc = await PDFDocument.load(buffer);
            loadedPdfDocs.set(buffer, srcDoc);
          }
          const [copiedPage] = await pdf1.copyPages(srcDoc, [pageInfo.pageNumber - 1]);
          if (pageInfo.rotation !== 0) {
            const currentRotation = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees(currentRotation + pageInfo.rotation));
          }
          pdf1.addPage(copiedPage);
        }
      }

      // Second part: pages pageNumber + 1 to end
      for (let i = pageNumber; i < this.pages.length; i++) {
        const pageInfo = this.pages[i];
        if (!pageInfo) continue;

        if (pageInfo.isBlank) {
          const blankPage = pdf2.addPage([612, 792]);
          if (pageInfo.rotation !== 0) {
            blankPage.setRotation(degrees(pageInfo.rotation));
          }
        } else {
          let srcDoc;
          const buffer = pageInfo.externalArrayBuffer;
          if (loadedPdfDocs.has(buffer)) {
            srcDoc = loadedPdfDocs.get(buffer);
          } else {
            srcDoc = await PDFDocument.load(buffer);
            loadedPdfDocs.set(buffer, srcDoc);
          }
          const [copiedPage] = await pdf2.copyPages(srcDoc, [pageInfo.pageNumber - 1]);
          if (pageInfo.rotation !== 0) {
            const currentRotation = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees(currentRotation + pageInfo.rotation));
          }
          pdf2.addPage(copiedPage);
        }
      }

      const pdfBytes1 = await pdf1.save();
      const pdfBytes2 = await pdf2.save();

      return [pdfBytes1, pdfBytes2];
    } catch (err) {
      console.error("Error splitting PDF at page:", err);
      throw err;
    }
  }

  async extractPageRange(fromPage, toPage) {
    try {
      const { PDFDocument, degrees } = window.PDFLib;
      const loadedPdfDocs = new Map();

      const newPdf = await PDFDocument.create();

      // Extract pages from fromPage-1 to toPage-1 (0-indexed)
      for (let i = fromPage - 1; i < toPage; i++) {
        const pageInfo = this.pages[i];
        if (!pageInfo) continue;

        if (pageInfo.isBlank) {
          const blankPage = newPdf.addPage([612, 792]);
          if (pageInfo.rotation !== 0) {
            blankPage.setRotation(degrees(pageInfo.rotation));
          }
        } else {
          let srcDoc;
          const buffer = pageInfo.externalArrayBuffer;
          if (loadedPdfDocs.has(buffer)) {
            srcDoc = loadedPdfDocs.get(buffer);
          } else {
            srcDoc = await PDFDocument.load(buffer);
            loadedPdfDocs.set(buffer, srcDoc);
          }
          const [copiedPage] = await newPdf.copyPages(srcDoc, [pageInfo.pageNumber - 1]);
          if (pageInfo.rotation !== 0) {
            const currentRotation = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees(currentRotation + pageInfo.rotation));
          }
          newPdf.addPage(copiedPage);
        }
      }

      const pdfBytes = await newPdf.save();
      return pdfBytes;
    } catch (err) {
      console.error("Error extracting page range:", err);
      throw err;
    }
  }

  async splitEveryNPages(n) {
    try {
      const { PDFDocument, degrees } = window.PDFLib;
      const loadedPdfDocs = new Map();

      const pdfParts = [];
      const totalPages = this.pages.length;
      const numParts = Math.ceil(totalPages / n);

      for (let part = 0; part < numParts; part++) {
        const newPdf = await PDFDocument.create();
        const startIdx = part * n;
        const endIdx = Math.min(startIdx + n, totalPages);

        for (let i = startIdx; i < endIdx; i++) {
          const pageInfo = this.pages[i];
          if (!pageInfo) continue;

          if (pageInfo.isBlank) {
            const blankPage = newPdf.addPage([612, 792]);
            if (pageInfo.rotation !== 0) {
              blankPage.setRotation(degrees(pageInfo.rotation));
            }
          } else {
            let srcDoc;
            const buffer = pageInfo.externalArrayBuffer;
            if (loadedPdfDocs.has(buffer)) {
              srcDoc = loadedPdfDocs.get(buffer);
            } else {
              srcDoc = await PDFDocument.load(buffer);
              loadedPdfDocs.set(buffer, srcDoc);
            }
            const [copiedPage] = await newPdf.copyPages(srcDoc, [pageInfo.pageNumber - 1]);
            if (pageInfo.rotation !== 0) {
              const currentRotation = copiedPage.getRotation().angle;
              copiedPage.setRotation(degrees(currentRotation + pageInfo.rotation));
            }
            newPdf.addPage(copiedPage);
          }
        }

        const pdfBytes = await newPdf.save();
        pdfParts.push(pdfBytes);
      }

      return pdfParts;
    } catch (err) {
      console.error("Error splitting PDF every N pages:", err);
      throw err;
    }
  }
}

export { PDFOrganizer };
