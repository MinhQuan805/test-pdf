import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import Organize from '../Organize.vue';

// Mock PDFOrganizer module
vi.mock('../js/PDFOrganizer.js', () => {
  return {
    PDFOrganizer: class MockPDFOrganizer {
      constructor() {
        this.pages = [];
        this.loadPDFFile = vi.fn(async (file, reset = true) => ({
          pages: [
            { id: 0, pageNumber: 1, rotation: 0, fileIndex: 0 },
            { id: 1, pageNumber: 2, rotation: 0, fileIndex: 0 },
            { id: 2, pageNumber: 3, rotation: 0, fileIndex: 0 },
          ],
          newPages: [],
          startId: 0,
          endId: 3,
          fileIndex: 0,
        }));
        this.renderPage = vi.fn();
        this.renderBlankPage = vi.fn();
        this.rotatePage = vi.fn((index, degrees) => ({ rotation: degrees }));
        this.duplicatePage = vi.fn((index) => ({ id: 99, pageNumber: 1 }));
        this.addBlankPage = vi.fn((index) => ({ id: 100, isBlank: true }));
        this.deletePage = vi.fn(() => true);
        this.reversePages = vi.fn();
        this.movePage = vi.fn();
        this.getPages = vi.fn(() => [
          { id: 0, pageNumber: 1, rotation: 0 },
          { id: 1, pageNumber: 2, rotation: 0 },
          { id: 2, pageNumber: 3, rotation: 0 },
        ]);
        this.exportPDF = vi.fn(async (callback) => {
          if (callback) {
            callback(10);
            callback(50);
            callback(100);
          }
          return new Uint8Array([1, 2, 3]);
        });
      }
    }
  };
});

describe('Organize.vue Component', () => {
  let wrapper;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';

    // Mount component
    wrapper = mount(Organize, {
      attachTo: document.body,
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Component Initialization', () => {
    it('nên render component thành công', () => {
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.pdf-organizer').exists()).toBe(true);
    });

    it('nên hiển thị placeholder khi chưa load PDF', () => {
      expect(wrapper.vm.isLoaded).toBe(false);
      expect(wrapper.find('.pdf-placeholder').exists()).toBe(true);
      expect(wrapper.find('.pdf-placeholder-text').text()).toContain('Drag and drop');
    });

    it('nên khởi tạo với state mặc định', () => {
      expect(wrapper.vm.pages).toEqual([]);
      expect(wrapper.vm.processing).toBe(false);
      expect(wrapper.vm.progress).toBe(0);
      expect(wrapper.vm.isLoaded).toBe(false);
      expect(wrapper.vm.pagesPerRow).toBe(6);
    });
  });

  describe('File Upload', () => {
    it('nên có button Open để chọn file', () => {
      const openButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Open')
      );
      expect(openButton).toBeTruthy();
    });

    it('nên trigger file input khi click Open button', async () => {
      const fileInput = wrapper.vm.fileInput;
      const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {});

      await wrapper.vm.clickFileInput();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('nên load PDF file khi chọn file', async () => {
      const mockFile = new File(['pdf content'], 'test.pdf', {
        type: 'application/pdf'
      });

      wrapper.vm.fileInput = {
        files: [mockFile]
      };

      await wrapper.vm.handleFileUpload();
      await flushPromises();
      expect(wrapper.vm.pages.length).toBe(3);
      expect(wrapper.findAll('.page-card').length).toBe(3);
      expect(wrapper.vm.organizer.loadPDFFile).toHaveBeenCalledWith(mockFile, true);
    });

    it('nên update isLoaded sau khi load file', async () => {
      const mockFile = new File(['pdf content'], 'test.pdf', {
        type: 'application/pdf'
      });

      wrapper.vm.fileInput = {
        files: [mockFile]
      };

      await wrapper.vm.handleFileUpload();
      await flushPromises();

      expect(wrapper.vm.isLoaded).toBe(true);
    });

    it('nên không load file nếu không phải PDF', async () => {
      const mockFile = new File(['text'], 'test.txt', {
        type: 'text/plain'
      });

      wrapper.vm.fileInput = {
        files: [mockFile]
      };

      await wrapper.vm.handleFileUpload();
      expect(wrapper.vm.isLoaded).toBe(false);
    });
  });

  describe('Append File', () => {
    it('nên có button Add file', () => {
      const addButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Add file')
      );
      expect(addButton).toBeTruthy();
    });

    it('nên append file khi chọn file', async () => {
      const mockFile = new File(['pdf content'], 'test2.pdf', {
        type: 'application/pdf'
      });

      wrapper.vm.appendFileInput = {
        files: [mockFile]
      };

      await wrapper.vm.handleAppendFile();
      await flushPromises();

      expect(wrapper.vm.organizer.loadPDFFile).toHaveBeenCalledWith(mockFile, false);
    });

    it('nên disable Add file button khi đang processing', async () => {
      wrapper.vm.processing = true;
      await nextTick();

      const addButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Add file')
      );
      expect(addButton.attributes('disabled')).toBeDefined();
    });
  });

  describe('Page Grid Display', () => {
    beforeEach(async () => {
      wrapper.vm.pages = [
        { id: 0, pageNumber: 1, rotation: 0, fileIndex: 0 },
        { id: 1, pageNumber: 2, rotation: 0, fileIndex: 0 },
      ];
      wrapper.vm.isLoaded = true;
      await nextTick();
    });

    it('nên hiển thị pages grid khi đã load', () => {
      expect(wrapper.find('.pages-grid').exists()).toBe(true);
      expect(wrapper.find('.organize-body').exists()).toBe(true);
    });

    it('nên render đúng số lượng page cards', () => {
      const pageCards = wrapper.findAll('.page-card');
      expect(pageCards.length).toBe(2);
    });

    it('nên hiển thị page number badge', () => {
      const badges = wrapper.findAll('.page-number-badge');
      expect(badges.length).toBe(2);
      expect(badges[0].text()).toBe('1');
      expect(badges[1].text()).toBe('2');
    });

    it('nên apply grid layout với pagesPerRow', async () => {
      wrapper.vm.pagesPerRow = 4;
      await nextTick();

      const grid = wrapper.find('.pages-grid');
      expect(grid.attributes('style')).toContain('repeat(4, 1fr)');
    });
  });

  describe('Page Operations', () => {
    beforeEach(async () => {
      wrapper.vm.pages = [
        { id: 0, pageNumber: 1, rotation: 0 },
        { id: 1, pageNumber: 2, rotation: 0 },
        { id: 2, pageNumber: 3, rotation: 0 },
      ];
      wrapper.vm.isLoaded = true;
      await nextTick();
    });

    it('nên có button Rotate cho mỗi page', () => {
      const rotateButtons = wrapper.findAll('.page-actions button').filter(btn =>
        btn.find('i.fa-rotate-right').exists()
      );
      expect(rotateButtons.length).toBeGreaterThan(0);
    });

    it('nên rotate page khi click rotate button', async () => {
      await wrapper.vm.rotatePage(0, 90);
      expect(wrapper.vm.organizer.rotatePage).toHaveBeenCalledWith(0, 90);
    });

    it('nên duplicate page khi click duplicate button', async () => {
      await wrapper.vm.duplicatePage(0);
      expect(wrapper.vm.organizer.duplicatePage).toHaveBeenCalledWith(0);
    });

    it('nên add blank page khi click add blank button', async () => {
      await wrapper.vm.addBlankPage(1);
      expect(wrapper.vm.organizer.addBlankPage).toHaveBeenCalledWith(1);
    });

    it('nên delete page khi click delete button', async () => {
      wrapper.vm.deletePage(1);
      expect(wrapper.vm.organizer.deletePage).toHaveBeenCalledWith(1);
    });

    it('nên disable delete button khi chỉ có 1 page', async () => {
      wrapper.vm.pages = [{ id: 0, pageNumber: 1, rotation: 0 }];
      await nextTick();

      const deleteButtons = wrapper.findAll('.page-actions button').filter(btn =>
        btn.find('i.fa-trash').exists()
      );
      expect(deleteButtons[0].attributes('disabled')).toBeDefined();
    });
  });

  describe('Reverse Pages', () => {
    it('nên có button Sort', () => {
      const sortButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Sort')
      );
      expect(sortButton).toBeTruthy();
    });

    it('nên reverse pages khi click Sort', async () => {
      await wrapper.vm.reversePages();
      expect(wrapper.vm.organizer.reversePages).toHaveBeenCalled();
    });
  });

  describe('Context Menu', () => {
    beforeEach(async () => {
      wrapper.vm.pages = [
        { id: 0, pageNumber: 1, rotation: 0 },
        { id: 1, pageNumber: 2, rotation: 0 },
      ];
      wrapper.vm.isLoaded = true;
      await nextTick();
    });

    it('nên show context menu khi right click trên page', async () => {
      const page = { id: 0, pageNumber: 1 };
      const event = { clientX: 100, clientY: 200 };

      wrapper.vm.showContextMenu(event, page, 0);
      await nextTick();

      expect(wrapper.vm.contextMenu.show).toBe(true);
      expect(wrapper.vm.contextMenu.x).toBe(100);
      expect(wrapper.vm.contextMenu.y).toBe(200);
    });

    it('nên hiển thị context menu với đúng options', async () => {
      wrapper.vm.contextMenu = {
        show: true,
        x: 100,
        y: 200,
        pageIndex: 0,
      };
      await nextTick();

      const contextMenu = wrapper.find('.context-menu');
      expect(contextMenu.exists()).toBe(true);
      expect(contextMenu.text()).toContain('Rotate Clockwise');
      expect(contextMenu.text()).toContain('Duplicate Page');
      expect(contextMenu.text()).toContain('Delete Page');
    });

    it('nên close context menu khi click outside', async () => {
      wrapper.vm.contextMenu.show = true;
      await nextTick();

      wrapper.vm.closeContextMenu();
      expect(wrapper.vm.contextMenu.show).toBe(false);
    });
  });

  describe('Drag and Drop', () => {
    beforeEach(async () => {
      wrapper.vm.pages = [
        { id: 0, pageNumber: 1 },
        { id: 1, pageNumber: 2 },
        { id: 2, pageNumber: 3 },
      ];
      wrapper.vm.isLoaded = true;
      await nextTick();
    });

    it('nên set draggedIndex khi bắt đầu drag', () => {
      wrapper.vm.handleDragStart(0);
      expect(wrapper.vm.draggedIndex).toBe(0);
    });

    it('nên move page khi drop', () => {
      wrapper.vm.draggedIndex = 0;
      wrapper.vm.handlePageDrop(2);

      expect(wrapper.vm.organizer.movePage).toHaveBeenCalledWith(0, 2);
      expect(wrapper.vm.draggedIndex).toBeNull();
    });

    it('nên không move nếu draggedIndex là null', () => {
      wrapper.vm.draggedIndex = null;
      wrapper.vm.handlePageDrop(2);

      expect(wrapper.vm.organizer.movePage).not.toHaveBeenCalled();
    });
  });

  describe('Export PDF', () => {
    it('nên có button Export', () => {
      const exportButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Export')
      );
      expect(exportButton).toBeTruthy();
    });

    it('nên export PDF khi click Export button', async () => {
      // Mock DOM methods
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

      await wrapper.vm.downloadPDF();
      await flushPromises();

      expect(wrapper.vm.organizer.exportPDF).toHaveBeenCalled();

      // Cleanup
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('nên show processing overlay khi exporting', async () => {
      wrapper.vm.processing = true;
      wrapper.vm.isLoaded = true;
      await nextTick();

      expect(wrapper.find('.processing-overlay').exists()).toBe(true);
      expect(wrapper.find('.processing-content').text()).toContain('Processing PDF');
    });

    it('nên update progress khi exporting', async () => {
      wrapper.vm.processing = true;
      wrapper.vm.progress = 50;
      wrapper.vm.isLoaded = true;
      await nextTick();

      expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 50%');
    });
  });

  describe('Toast Notifications', () => {
    it('nên show toast với message', async () => {
      wrapper.vm.showToast('Test message', 'success');
      await nextTick();

      expect(wrapper.vm.toast.show).toBe(true);
      expect(wrapper.vm.toast.message).toBe('Test message');
    });

    it('nên hide toast khi call hideToast', async () => {
      wrapper.vm.toast = {
        show: true,
        message: 'Test',
        type: 'success',
        timeout: null,
      };
      await nextTick();

      wrapper.vm.hideToast();
      expect(wrapper.vm.toast.show).toBe(false);
    });

    it('nên clear timeout khi hide toast', () => {
      const timeout = setTimeout(() => {}, 1000);
      wrapper.vm.toast.timeout = timeout;

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      wrapper.vm.hideToast();

      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeout);
    });
  });

  describe('Pages Per Row Select', () => {
    it('nên có select dropdown cho pages per row', () => {
      const select = wrapper.find('select[title="Pages per row"]');
      expect(select.exists()).toBe(true);
    });

    it('nên có các options 3, 4, 5, 6', () => {
      const options = wrapper.findAll('option');
      const values = options.map(opt => opt.attributes('value'));

      expect(values).toContain('3');
      expect(values).toContain('4');
      expect(values).toContain('5');
      expect(values).toContain('6');
    });

    it('nên update pagesPerRow khi chọn option mới', async () => {
      const select = wrapper.find('select');
      await select.setValue('4');

      expect(wrapper.vm.pagesPerRow).toBe('4');
    });
  });

  describe('Lifecycle Hooks', () => {
    it('nên add event listener khi mounted', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const newWrapper = mount(Organize);
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));

      newWrapper.unmount();
    });

    it('nên remove event listener khi unmounted', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const newWrapper = mount(Organize);
      newWrapper.unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('Color Borders', () => {
    it('nên apply color border dựa trên fileIndex', async () => {
      wrapper.vm.pages = [
        { id: 0, fileIndex: 0 },
        { id: 1, fileIndex: 1 },
        { id: 2, fileIndex: 2 },
      ];
      wrapper.vm.isLoaded = true;
      await nextTick();

      const pageCards = wrapper.findAll('.page-card');
      expect(pageCards[0].classes()).toContain('border-blue-300');
      expect(pageCards[1].classes()).toContain('border-red-300');
      expect(pageCards[2].classes()).toContain('border-green-300');
    });
  });
});
