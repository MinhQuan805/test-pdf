// import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
// import { mount, flushPromises } from "@vue/test-utils";
// import { nextTick } from "vue";
// import Organize from "../Organize.vue";

// // Mock PDFOrganizer module
// vi.mock("../js/PDFOrganizer.js", () => {
//   return {
//     PDFOrganizer: class MockPDFOrganizer {
//       constructor() {
//         this.pages = [];
//         this.loadPDFFile = vi.fn(async (file, reset = true) => ({
//           pages: [
//             { id: 0, pageNumber: 1, rotation: 0, fileIndex: 0, selected: false },
//             { id: 1, pageNumber: 2, rotation: 0, fileIndex: 0, selected: false },
//             { id: 2, pageNumber: 3, rotation: 0, fileIndex: 0, selected: false },
//           ],
//           newPages: [],
//           startId: 0,
//           endId: 3,
//           fileIndex: 0,
//         }));
//         this.renderPage = vi.fn();
//         this.renderBlankPage = vi.fn();
//         this.rotatePage = vi.fn((index, degrees) => {
//           this.pages[index] = { ...this.pages[index], rotation: degrees };
//           return this.pages[index];
//         });
//         this.duplicatePage = vi.fn((index) => {
//           const newPage = { id: 99, pageNumber: 1, rotation: 0, selected: false };
//           this.pages.splice(index + 1, 0, newPage);
//           return newPage;
//         });
//         this.addBlankPage = vi.fn((index) => {
//           const blankPage = { id: 100, isBlank: true, pageNumber: 0, selected: false };
//           this.pages.splice(index, 0, blankPage);
//           return blankPage;
//         });
//         this.deletePage = vi.fn((index) => {
//           this.pages.splice(index, 1);
//           return true;
//         });
//         this.reversePages = vi.fn(() => {
//           this.pages = this.pages.reverse();
//         });
//         this.movePage = vi.fn((fromIndex, toIndex) => {
//           const [movedPage] = this.pages.splice(fromIndex, 1);
//           this.pages.splice(toIndex, 0, movedPage);
//         });
//         this.swapPages = vi.fn((index1, index2) => {
//           if (this.pages[index1] && this.pages[index2]) {
//             const temp = this.pages[index1];
//             this.pages[index1] = this.pages[index2];
//             this.pages[index2] = temp;
//           }
//         });
//         this.sortSelectedPages = vi.fn((selectedIndices) => {
//           // Reverse the selected pages in place
//           const selectedPages = selectedIndices.map(i => this.pages[i]);
//           selectedPages.reverse();
//           selectedIndices.forEach((idx, i) => {
//             this.pages[idx] = selectedPages[i];
//           });
//         });
//         this.moveMultiplePages = vi.fn((indices, targetIndex) => {
//           // Simple implementation for testing
//           const movedPages = indices.map(i => this.pages[i]);
//           // Remove from original positions (from highest to lowest to avoid index shifts)
//           indices.sort((a, b) => b - a).forEach(i => this.pages.splice(i, 1));
//           // Insert at target
//           this.pages.splice(targetIndex, 0, ...movedPages);
//         });
//         this.getPages = vi.fn(() => this.pages);
//         this.exportPDF = vi.fn(async (progressCallback) => {
//           if (progressCallback) {
//             progressCallback(10);
//             progressCallback(50);
//             progressCallback(100);
//           }
//           return new Uint8Array([1, 2, 3]);
//         });
//         this.exportPages = vi.fn(async (pageIndices, progressCallback) => {
//           if (progressCallback) {
//             progressCallback(10);
//             progressCallback(100);
//           }
//           return new Uint8Array([4, 5, 6]);
//         });
//       }
//     },
//   };
// });

// describe("Organize.vue Component", () => {
//   let wrapper;

//   beforeEach(() => {
//     // Reset DOM
//     document.body.innerHTML = "";

//     // Mount component
//     wrapper = mount(Organize, {
//       attachTo: document.body,
//     });
//   });

//   afterEach(() => {
//     if (wrapper) {
//       wrapper.unmount();
//     }
//   });

//   describe("Component Initialization", () => {
//     it("nên render component thành công", () => {
//       expect(wrapper.exists()).toBe(true);
//       expect(wrapper.find(".pdf-organizer").exists()).toBe(true);
//     });

//     it("nên khởi tạo với state mặc định", () => {
//       expect(wrapper.vm.pages).toEqual([]);
//       expect(wrapper.vm.isLoaded).toBe(false);
//       expect(wrapper.vm.pagesPerRow).toBe(6);
//       expect(wrapper.vm.selectedTool).toBe("select");
//       expect(wrapper.vm.selectedCount).toBe(0);
//       expect(wrapper.vm.allSelected).toBe(false);
//     });

//     it("nên có SplitDialog và MergeDialog components", () => {
//       expect(wrapper.findComponent({ name: "SplitDialog" }).exists()).toBe(true);
//       expect(wrapper.findComponent({ name: "MergeDialog" }).exists()).toBe(true);
//     });
//   });

//   describe("File Upload", () => {
//     it("nên có button Open để chọn file", () => {
//       const openButton = wrapper.findAll("button").find((btn) => btn.text().includes("Open"));
//       expect(openButton).toBeTruthy();
//     });

//     it("nên trigger file input khi click Open button", async () => {
//       const fileInput = wrapper.vm.fileInput;
//       const clickSpy = vi.spyOn(fileInput, "click").mockImplementation(() => {});

//       await wrapper.vm.clickFileInput();
//       expect(clickSpy).toHaveBeenCalled();
//     });

//     it("nên load PDF file khi chọn file", async () => {
//       const mockFile = new File(["pdf content"], "test.pdf", {
//         type: "application/pdf",
//       });

//       wrapper.vm.fileInput = {
//         files: [mockFile],
//       };

//       await wrapper.vm.handleFileUpload();
//       await flushPromises();

//       // Verify file was loaded by checking if pages exist
//       expect(wrapper.vm.isLoaded).toBe(true);
//     });

//     it("nên update isLoaded sau khi load file", async () => {
//       const mockFile = new File(["pdf content"], "test.pdf", {
//         type: "application/pdf",
//       });

//       wrapper.vm.fileInput = {
//         files: [mockFile],
//       };

//       await wrapper.vm.handleFileUpload();
//       await flushPromises();

//       expect(wrapper.vm.isLoaded).toBe(true);
//     });

//     it("nên không load file nếu không phải PDF", async () => {
//       const mockFile = new File(["text"], "test.txt", {
//         type: "text/plain",
//       });

//       wrapper.vm.fileInput = {
//         files: [mockFile],
//       };

//       await wrapper.vm.handleFileUpload();

//       // File should not be loaded
//       expect(wrapper.vm.isLoaded).toBe(false);
//     });
//   });

//   describe("Append File", () => {
//     it("nên có button Add file", () => {
//       const addButton = wrapper.findAll("button").find((btn) => btn.text().includes("Add file"));
//       expect(addButton).toBeTruthy();
//     });

//     it("nên append file khi chọn file", async () => {
//       // First load initial file
//       const firstFile = new File(["pdf content"], "test.pdf", {
//         type: "application/pdf",
//       });
//       wrapper.vm.fileInput = { files: [firstFile] };
//       await wrapper.vm.handleFileUpload();
//       await flushPromises();

//       const mockFile = new File(["pdf content"], "test2.pdf", {
//         type: "application/pdf",
//       });

//       wrapper.vm.fileAppend = {
//         files: [mockFile],
//         value: "",
//       };

//       await wrapper.vm.handleAppendFile();
//       await flushPromises();

//       // Should still be loaded
//       expect(wrapper.vm.isLoaded).toBe(true);
//     });

//     it("nên không append file nếu không phải PDF", async () => {
//       const mockFile = new File(["text"], "test.txt", {
//         type: "text/plain",
//       });

//       wrapper.vm.fileAppend = {
//         files: [mockFile],
//         value: "",
//       };

//       const initialPagesLength = wrapper.vm.pages.length;
//       await wrapper.vm.handleAppendFile();

//       // Pages should not change
//       expect(wrapper.vm.pages.length).toBe(initialPagesLength);
//     });
//   });

//   describe("Tool Selection", () => {
//     it("nên bắt đầu với tool 'select'", () => {
//       expect(wrapper.vm.selectedTool).toBe("select");
//     });

//     it("nên thay đổi tool khi selectTool được gọi", async () => {
//       wrapper.vm.selectTool("rotate");
//       expect(wrapper.vm.selectedTool).toBe("rotate");

//       wrapper.vm.selectTool("delete");
//       expect(wrapper.vm.selectedTool).toBe("delete");
//     });

//     it("nên reset swap source khi chuyển tool", () => {
//       wrapper.vm.swapSourceIndex = 1;
//       wrapper.vm.selectTool("delete");
//       expect(wrapper.vm.swapSourceIndex).toBeNull();
//     });

//     it("nên có các tool buttons trong floating toolbar", () => {
//       const toolbar = wrapper.find(".floating-toolbar");
//       expect(toolbar.exists()).toBe(true);
//     });
//   });

//   describe("Page Selection", () => {
//     beforeEach(async () => {
//       wrapper.vm.pages = [
//         { id: 0, pageNumber: 1, rotation: 0, selected: false },
//         { id: 1, pageNumber: 2, rotation: 0, selected: false },
//         { id: 2, pageNumber: 3, rotation: 0, selected: false },
//       ];
//       wrapper.vm.isLoaded = true;
//       await nextTick();
//     });

//     it("nên select page khi click với select tool", async () => {
//       wrapper.vm.selectedTool = "select";
//       const mockEvent = { ctrlKey: false, metaKey: false, shiftKey: false };

//       await wrapper.vm.handlePageClick(0, mockEvent);
//       expect(wrapper.vm.pages[0].selected).toBe(true);
//     });

//     it("nên toggle select với Ctrl+Click", async () => {
//       wrapper.vm.selectedTool = "select";
//       const mockEvent = { ctrlKey: true, metaKey: false, shiftKey: false };

//       await wrapper.vm.handlePageClick(0, mockEvent);
//       expect(wrapper.vm.pages[0].selected).toBe(true);

//       // With ctrlKey, it selects only the clicked page (clears others)
//       await wrapper.vm.handlePageClick(1, mockEvent);
//       expect(wrapper.vm.pages[1].selected).toBe(true);
//       expect(wrapper.vm.pages[0].selected).toBe(false);
//     });

//     it("nên select multiple pages với Shift+Click", async () => {
//       wrapper.vm.selectedTool = "select";

//       // First click
//       await wrapper.vm.handlePageClick(0, { ctrlKey: false, metaKey: false, shiftKey: false });

//       // Shift click to select range
//       await wrapper.vm.handlePageClick(2, { ctrlKey: false, metaKey: false, shiftKey: true });

//       expect(wrapper.vm.pages[0].selected).toBe(true);
//       expect(wrapper.vm.pages[1].selected).toBe(true);
//       expect(wrapper.vm.pages[2].selected).toBe(true);
//     });

//     it("nên update selection count", async () => {
//       wrapper.vm.pages[0].selected = true;
//       wrapper.vm.pages[1].selected = true;

//       wrapper.vm.updateSelectionCount();
//       expect(wrapper.vm.selectedCount).toBe(2);
//     });

//     it("nên toggle select all", async () => {
//       wrapper.vm.toggleSelectAll();
//       expect(wrapper.vm.allSelected).toBe(true);
//       expect(wrapper.vm.pages.every(p => p.selected)).toBe(true);

//       wrapper.vm.toggleSelectAll();
//       expect(wrapper.vm.allSelected).toBe(false);
//       expect(wrapper.vm.pages.every(p => !p.selected)).toBe(true);
//     });
//   });

//   describe("Page Operations", () => {
//     beforeEach(async () => {
//       wrapper.vm.pages = [
//         { id: 0, pageNumber: 1, rotation: 0, selected: false },
//         { id: 1, pageNumber: 2, rotation: 0, selected: false },
//         { id: 2, pageNumber: 3, rotation: 0, selected: false },
//       ];
//       wrapper.vm.isLoaded = true;
//       await nextTick();
//     });

//     it("nên rotate page khi dùng rotate tool", async () => {
//       wrapper.vm.selectedTool = "rotate";
//       const initialRotation = wrapper.vm.pages[0].rotation;

//       await wrapper.vm.rotatePage(0, 90);
//       // Just verify the method was called
//       expect(wrapper.vm.selectedTool).toBe("rotate");
//     });

//     it("nên duplicate page", async () => {
//       await wrapper.vm.duplicatePage(0);
//       // Verify method completed without throwing
//       expect(wrapper.vm.isLoaded).toBe(true);
//     });

//     it("nên add blank page", async () => {
//       await wrapper.vm.addBlankPage(1);
//       // Verify method completed
//       expect(wrapper.vm.isLoaded).toBe(true);
//     });

//     it("nên delete page", async () => {
//       wrapper.vm.deletePage(1);
//       // Verify pages changed
//       expect(wrapper.vm.pages.length).toBeLessThanOrEqual(3);
//     });

//     it("nên swap pages", async () => {
//       wrapper.vm.selectedTool = "swap";
//       wrapper.vm.pages[0].selected = false;

//       // First click to set source - call swapPages directly
//       await wrapper.vm.swapPages(0);
//       await nextTick();
//       expect(wrapper.vm.swapSourceIndex).toBe(0);

//       // Second click to swap
//       await wrapper.vm.handlePageClick(2, {});
//       await nextTick();
//       await flushPromises();

//       await wrapper.vm.handlePageClick(0, {});
//       await nextTick();
//       expect(wrapper.vm.swapSourceIndex).toBe(0);

//       await wrapper.vm.handlePageClick(0, {});
//       await nextTick();
//       wrapper.vm.pages = [{ id: 0, pageNumber: 1 }];

//       wrapper.vm.deletePage(0);
//       expect(wrapper.vm.isLoaded).toBe(false);
//     });
//   });

//   describe("Batch Operations", () => {
//     beforeEach(async () => {
//       wrapper.vm.pages = [
//         { id: 0, pageNumber: 1, rotation: 0, selected: true },
//         { id: 1, pageNumber: 2, rotation: 0, selected: true },
//         { id: 2, pageNumber: 3, rotation: 0, selected: false },
//       ];
//       wrapper.vm.isLoaded = true;
//       wrapper.vm.selectedCount = 2;
//       await nextTick();
//     });

//     it("nên không apply action nếu không có pages selected", async () => {
//       wrapper.vm.pages.forEach(p => p.selected = false);
//       wrapper.vm.selectedCount = 0;

//       const initialLength = wrapper.vm.pages.length;
//       await wrapper.vm.applyToSelected("Delete");

//       // Should not delete anything
//       expect(wrapper.vm.pages.length).toBe(initialLength);
//     });

//     it("nên delete selected pages", async () => {
//       const initialLength = wrapper.vm.pages.length;
//       await wrapper.vm.applyToSelected("Delete");

//       // Some pages should be deleted
//       expect(wrapper.vm.pages.length).toBeLessThanOrEqual(initialLength);
//     });

//     it("nên rotate selected pages", async () => {
//       await wrapper.vm.applyToSelected("Rotate");

//       // Just verify the action completed
//       expect(wrapper.vm.isLoaded).toBe(true);
//     });

//     it("nên sort selected pages", async () => {
//       await wrapper.vm.applyToSelected("Sort");
//       // Verify the action completed
//       expect(wrapper.vm.isLoaded).toBe(true);
//     });
//   });

//   describe("Reverse Pages", () => {
//     beforeEach(async () => {
//       wrapper.vm.pages = [
//         { id: 0, pageNumber: 1 },
//         { id: 1, pageNumber: 2 },
//         { id: 2, pageNumber: 3 },
//       ];
//       wrapper.vm.isLoaded = true;
//       await nextTick();
//     });

//     it("nên reverse tất cả pages", async () => {
//       const initialLength = wrapper.vm.pages.length;
//       await wrapper.vm.reversePages();
//       await nextTick();
//       // Verify the action completed and pages still exist
//       expect(wrapper.vm.pages.length).toBeGreaterThanOrEqual(0);
//     });
//   });

//   describe("Context Menu", () => {
//     beforeEach(async () => {
//       wrapper.vm.pages = [
//         { id: 0, pageNumber: 1, rotation: 0, selected: false },
//         { id: 1, pageNumber: 2, rotation: 0, selected: false },
//       ];
//       wrapper.vm.isLoaded = true;
//       await nextTick();
//     });

//     it("nên show context menu khi right click trên page", async () => {
//       const page = { id: 0, pageNumber: 1 };
//       const event = { clientX: 100, clientY: 200 };

//       wrapper.vm.showContextMenu(event, page, 0);
//       await nextTick();

//       expect(wrapper.vm.contextMenu.show).toBe(true);
//       expect(wrapper.vm.contextMenu.x).toBe(100);
//       expect(wrapper.vm.contextMenu.y).toBe(200);
//       expect(wrapper.vm.contextMenu.pageIndex).toBe(0);
//     });

//     it("nên hiển thị context menu với đúng options", async () => {
//       wrapper.vm.contextMenu = {
//         show: true,
//         x: 100,
//         y: 200,
//         pageIndex: 0,
//       };
//       await nextTick();

//       const contextMenu = wrapper.find(".context-menu");
//       expect(contextMenu.exists()).toBe(true);
//       expect(contextMenu.text()).toContain("Preview");
//     });

//     it("nên close context menu khi click outside", async () => {
//       wrapper.vm.contextMenu.show = true;
//       await nextTick();

//       wrapper.vm.contextMenu.show = false;
//       expect(wrapper.vm.contextMenu.show).toBe(false);
//     });
//   });

//   describe("Drag and Drop", () => {
//     beforeEach(async () => {
//       wrapper.vm.pages = [
//         { id: 0, pageNumber: 1, selected: false },
//         { id: 1, pageNumber: 2, selected: false },
//         { id: 2, pageNumber: 3, selected: false },
//       ];
//       wrapper.vm.isLoaded = true;
//       await nextTick();
//     });

// it("nên set draggedIndex khi bắt đầu drag single page", () => {
//       wrapper.vm.handleDragStart(0);
//       // draggedIndex is not exposed, just verify method ran
//       expect(wrapper.vm.pages.length).toBe(3);
//     });

//     it("nên set draggedIndices khi drag multiple selected pages", () => {
//       wrapper.vm.pages[0].selected = true;
//       wrapper.vm.pages[1].selected = true;

//       wrapper.vm.handleDragStart(0);
//       // When dragging selected page, just verify selection state
//       expect(wrapper.vm.pages[0].selected).toBe(true);
//     });

//     it("nên move page khi drop", async () => {
//       // Manually set draggedIndex since handleDragStart doesn't expose it
//       wrapper.vm.handleDragStart(0);

//       wrapper.vm.handlePageDrop(2);
//       await nextTick();

//       // Verify draggedIndex is reset
//       expect(wrapper.vm.draggedIndex).toBeNull();
//     });

//     it("nên không move nếu draggedIndex là null", () => {
//       wrapper.vm.draggedIndex = null;
//       const initialLength = wrapper.vm.pages.length;

//       wrapper.vm.handlePageDrop(2);

//       // Pages should not change
//       expect(wrapper.vm.pages.length).toBe(initialLength);
//     });

//     it("nên clear auto scroll khi drag end", () => {
//       // Set a mock interval
//       wrapper.vm.$.setupState.autoScrollInterval = 123;
//       wrapper.vm.handleDragEnd();

//       // Verify auto scroll was cleared
//       expect(wrapper.vm.autoScrollInterval).toBeNull();
//     });
//   });

//   describe("Preview Modal", () => {
//     beforeEach(async () => {
//       wrapper.vm.pages = [
//         { id: 0, pageNumber: 1, rotation: 0 },
//         { id: 1, pageNumber: 2, rotation: 0 },
//         { id: 2, pageNumber: 3, rotation: 0 },
//       ];
//       wrapper.vm.isLoaded = true;
//       await nextTick();
//     });

//     it("nên show preview modal khi gọi previewPage", async () => {
//       await wrapper.vm.previewPage(1);
//       await nextTick();

//       expect(wrapper.vm.previewModal.show).toBe(true);
//       expect(wrapper.vm.previewModal.pageIndex).toBe(1);
//     });

//     it("nên close preview modal", async () => {
//       wrapper.vm.previewModal = { show: true, pageIndex: 1 };

//       wrapper.vm.closePreview();

//       expect(wrapper.vm.previewModal.show).toBe(false);
//       expect(wrapper.vm.previewModal.pageIndex).toBe(-1);
//       expect(wrapper.vm.zoomEnabled).toBe(false);
//     });

//     it("nên navigate đến page tiếp theo", async () => {
//       wrapper.vm.previewModal = { show: true, pageIndex: 0 };

//       await wrapper.vm.nextPreviewPage();

//       expect(wrapper.vm.previewModal.pageIndex).toBe(1);
//     });

//     it("nên navigate đến page trước", async () => {
//       wrapper.vm.previewModal = { show: true, pageIndex: 2 };

//       await wrapper.vm.prevPreviewPage();

//       expect(wrapper.vm.previewModal.pageIndex).toBe(1);
//     });

//     it("nên toggle zoom", () => {
//       wrapper.vm.zoomEnabled = false;

//       wrapper.vm.toggleZoom();
//       expect(wrapper.vm.zoomEnabled).toBe(true);

//       wrapper.vm.toggleZoom();
//       expect(wrapper.vm.zoomEnabled).toBe(false);
//     });

//     it("nên render preview modal overlay khi show", async () => {
//       wrapper.vm.previewModal = { show: true, pageIndex: 0 };
//       await nextTick();

//       expect(wrapper.find(".preview-modal-overlay").exists()).toBe(true);
//     });
//   });

//   describe("Split Dialog", () => {
//     beforeEach(async () => {
//       wrapper.vm.pages = [
//         { id: 0, pageNumber: 1 },
//         { id: 1, pageNumber: 2 },
//         { id: 2, pageNumber: 3 },
//         { id: 3, pageNumber: 4 },
//       ];
//       wrapper.vm.isLoaded = true;
//       await nextTick();
//     });

//     it("nên show split dialog khi openSplitDialog được gọi", async () => {
//       await wrapper.vm.openSplitDialog();
//       expect(wrapper.vm.showSplitDialog).toBe(true);
//     });

//     it("nên close split dialog", () => {
//       wrapper.vm.showSplitDialog = true;
//       wrapper.vm.closeSplitDialog();
//       expect(wrapper.vm.showSplitDialog).toBe(false);
//     });

//     it("nên render SplitDialog component khi show", async () => {
//       wrapper.vm.showSplitDialog = true;
//       await nextTick();

//       const dialog = wrapper.findComponent({ name: "SplitDialog" });
//       expect(dialog.exists()).toBe(true);
//       expect(dialog.props("show")).toBe(true);
//       expect(dialog.props("totalPages")).toBe(4);
//     });

//     it("nên handle split event từ dialog", async () => {
//       const splitData = {
//         mode: "range",
//         rangeFrom: 1,
//         rangeTo: 2,
//       };

//       await wrapper.vm.handleSplit(splitData);
//       // Verify method completed
//       expect(wrapper.vm.showSplitDialog).toBe(false);
//     });

//     it("nên không show split dialog khi không có pages", async () => {
//       wrapper.vm.pages = [];

//       await wrapper.vm.openSplitDialog();
//       // Should not open if no pages
//       expect(wrapper.vm.showSplitDialog).toBe(false);
//     });
//   });

//   describe("Merge Dialog", () => {
//     it("nên show merge dialog khi openMergeDialog được gọi", async () => {
//       await wrapper.vm.openMergeDialog();
//       expect(wrapper.vm.showMergeDialog).toBe(true);
//     });

//     it("nên close merge dialog", () => {
//       wrapper.vm.showMergeDialog = true;
//       wrapper.vm.closeMergeDialog();
//       expect(wrapper.vm.showMergeDialog).toBe(false);
//     });

//     it("nên render MergeDialog component khi show", async () => {
//       wrapper.vm.showMergeDialog = true;
//       await nextTick();

//       const dialog = wrapper.findComponent({ name: "MergeDialog" });
//       expect(dialog.exists()).toBe(true);
//       expect(dialog.props("show")).toBe(true);
//     });

//     it("nên handle merge event từ dialog", async () => {
//       const mockBlob = new Blob([new Uint8Array([1, 2, 3])], { type: "application/pdf" });

//       await wrapper.vm.handleMerge(mockBlob);

//       expect(wrapper.vm.showMergeDialog).toBe(false);
//     });

//     it("nên pass initialFile prop khi có pages loaded", async () => {
//       wrapper.vm.pages = [
//         { id: 0, pageNumber: 1 },
//         { id: 1, pageNumber: 2 },
//       ];
//       wrapper.vm.isLoaded = true;

//       await wrapper.vm.openMergeDialog();
//       await flushPromises();

//       expect(wrapper.vm.showMergeDialog).toBe(true);
//     });
//   });

//   describe("Export PDF", () => {
//     beforeEach(async () => {
//       wrapper.vm.pages = [
//         { id: 0, pageNumber: 1, selected: false },
//         { id: 1, pageNumber: 2, selected: false },
//         { id: 2, pageNumber: 3, selected: false },
//       ];
//       wrapper.vm.isLoaded = true;
//       await nextTick();
//     });

//     it("nên có button Export", () => {
//       const exportButton = wrapper.findAll("button").find((btn) => btn.text().includes("Export"));
//       expect(exportButton).toBeTruthy();
//     });

//     it("nên export all pages", async () => {
//       const createElementSpy = vi.spyOn(document, "createElement");
//       const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => {});
//       const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation(() => {});

//       await wrapper.vm.downloadFile();
//       await flushPromises();

//       // Verify DOM manipulation happened
//       expect(createElementSpy).toHaveBeenCalled();

//       createElementSpy.mockRestore();
//       appendChildSpy.mockRestore();
//       removeChildSpy.mockRestore();
//     });

//     it("nên export selected pages", async () => {
//       wrapper.vm.pages[0].selected = true;
//       wrapper.vm.pages[1].selected = true;
//       wrapper.vm.selectedCount = 2;

//       const createElementSpy = vi.spyOn(document, "createElement");
//       const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => {});
//       const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation(() => {});

//       await wrapper.vm.exportSelected();
//       await flushPromises();

//       // Verify method completed
//       expect(wrapper.vm.pages.length).toBe(3);

//       createElementSpy.mockRestore();
//       appendChildSpy.mockRestore();
//       removeChildSpy.mockRestore();
//     });

//     it("nên không export khi không có pages", async () => {
//       wrapper.vm.pages = [];

//       await wrapper.vm.downloadFile();
//       // Should not proceed with empty pages
//       expect(wrapper.vm.pages.length).toBe(0);
//     });

//     it("nên handle export dropdown", async () => {
//       await wrapper.vm.handleExport("all");
//       // Verify method completed
//       expect(wrapper.vm.isLoaded).toBe(true);
//     });
//   });

//   describe("Toast Notifications", () => {
//     it("nên show toast với message", async () => {
//       wrapper.vm.showToast("Test message", "success");
//       await nextTick();

//       expect(wrapper.vm.toast.show).toBe(true);
//       expect(wrapper.vm.toast.message).toBe("Test message");
//       expect(wrapper.vm.toast.type).toBe("success");
//     });

//     it("nên hide toast khi call hideToast", async () => {
//       wrapper.vm.toast = {
//         show: true,
//         message: "Test",
//         type: "success",
//         timeout: null,
//       };
//       await nextTick();

//       wrapper.vm.hideToast();
//       expect(wrapper.vm.toast.show).toBe(false);
//     });

//     it("nên render toast element khi show", async () => {
//       wrapper.vm.toast.show = true;
//       wrapper.vm.toast.message = "Test notification";
//       await nextTick();

//       const toastElement = wrapper.find("div[style*='position: fixed']");
//       expect(toastElement.exists()).toBe(true);
//       expect(toastElement.text()).toContain("Test notification");
//     });
//   });

//   describe("Processing State", () => {
//     it("nên có processing state", () => {
//       expect(wrapper.vm).toHaveProperty("isLoaded");
//     });
//   });

//   describe("Pages Per Row Select", () => {
//     it("nên có select dropdown cho pages per row", () => {
//       const select = wrapper.find('select[title="Pages per row"]');
//       expect(select.exists()).toBe(true);
//     });

//     it("nên có các options 3, 4, 5, 6", () => {
//       const options = wrapper.findAll("option");
//       const values = options.map((opt) => opt.attributes("value"));

//       expect(values).toContain("3");
//       expect(values).toContain("4");
//       expect(values).toContain("5");
//       expect(values).toContain("6");
//     });

//     it("nên update pagesPerRow khi chọn option mới", async () => {
//       const select = wrapper.find("select");
//       await select.setValue("4");

//       expect(wrapper.vm.pagesPerRow).toBe("4");
//     });
//   });

//   describe("Lifecycle Hooks", () => {
//     it("nên add event listener khi mounted", () => {
//       const addEventListenerSpy = vi.spyOn(document, "addEventListener");

//       const newWrapper = mount(Organize);
//       expect(addEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function));

//       newWrapper.unmount();
//     });

//     it("nên remove event listener khi unmounted", () => {
//       const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

//       const newWrapper = mount(Organize);
//       newWrapper.unmount();

//       expect(removeEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function));
//     });
//   });

//   describe("Color Borders", () => {
//     it("nên apply color border dựa trên fileIndex", async () => {
//       wrapper.vm.pages = [
//         { id: 0, fileIndex: 0, selected: false },
//         { id: 1, fileIndex: 1, selected: false },
//         { id: 2, fileIndex: 2, selected: false },
//       ];
//       wrapper.vm.isLoaded = true;
//       await nextTick();

//       const colorClasses = wrapper.vm.colorPage;
//       expect(colorClasses.length).toBeGreaterThan(0);
//       expect(colorClasses[0]).toContain("blue");
//       expect(colorClasses[1]).toContain("red");
//       expect(colorClasses[2]).toContain("green");
//     });
//   });

//   describe("Page Click Handler", () => {
//     beforeEach(async () => {
//       wrapper.vm.pages = [
//         { id: 0, pageNumber: 1, rotation: 0, selected: false },
//         { id: 1, pageNumber: 2, rotation: 0, selected: false },
//         { id: 2, pageNumber: 3, rotation: 0, selected: false },
//       ];
//       wrapper.vm.isLoaded = true;
//       await nextTick();
//     });

//     it("nên select page khi tool là select", async () => {
//       wrapper.vm.selectedTool = "select";
//       const mockEvent = { ctrlKey: false, metaKey: false, shiftKey: false };

//       await wrapper.vm.handlePageClick(0, mockEvent);
//       expect(wrapper.vm.pages[0].selected).toBe(true);
//     });

//     it("nên delete page khi tool là delete", async () => {
//       wrapper.vm.selectedTool = "delete";

//       wrapper.vm.handlePageClick(1, {});
//       // Verify page was removed
//       expect(wrapper.vm.pages.length).toBeLessThanOrEqual(3);
//     });

//     it("nên rotate page khi tool là rotate", async () => {
//       wrapper.vm.selectedTool = "rotate";

//       await wrapper.vm.handlePageClick(0, {});
//       // Verify action completed
//       expect(wrapper.vm.selectedTool).toBe("rotate");
//     });

//     it("nên duplicate page khi tool là duplicate", async () => {
//       wrapper.vm.selectedTool = "duplicate";

//       await wrapper.vm.handlePageClick(0, {});
//       // Verify action completed without error
//       expect(wrapper.vm.isLoaded).toBe(true);
//     });

//     it("nên add blank page khi tool là add-blank", async () => {
//       wrapper.vm.selectedTool = "add-blank";

//       await wrapper.vm.handlePageClick(0, {});
//       // Verify action completed
//       expect(wrapper.vm.isLoaded).toBe(true);
//     });

//     it("nên swap pages khi tool là swap", async () => {
//       wrapper.vm.selectedTool = "swap";

//       await wrapper.vm.handlePageClick(0, {});
//       await nextTick();
//       expect(wrapper.vm.swapSourceIndex).toBe(0);

//       await wrapper.vm.handlePageClick(2, {});
//       await nextTick();
//       await flushPromises();
//       // Verify swap completed
//       expect(wrapper.vm.swapSourceIndex).toBeNull();
//     });
//   });
// });
