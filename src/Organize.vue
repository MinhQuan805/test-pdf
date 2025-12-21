<template>
  <div class="pdf-organizer" @dragenter.stop @dragover.stop @drop.stop>
    <div class="p-2">
      <div class="header-actions">
        <div class="element-container ml-2">
          <div class="option-element">
            <input
              type="file"
              id="file"
              ref="fileInput"
              style="display: none"
              @change="handleFileUpload"
            />
            <button
              @click="clickFileInput"
              class="btn ml-4"
              title="Open a PDF file from your device"
            >
              <i class="fa-solid fa-folder-open mr-2"></i>
              Open
            </button>
          </div>
          <div class="option-element">
            <button
              id="download-pdf-button"
              @click="downloadPDF()"
              class="btn"
              title="Export the edited PDF with all annotations"
            >
              <i class="fa-solid fa-download mr-2"></i>
              Export
            </button>
          </div>
          <input
            type="file"
            ref="fileAppend"
            style="display: none"
            accept=".pdf"
            @change="handleAppendFile"
          />
          <button @click="clickAppendFileInput" class="btn">
            <i class="fa-solid fa-file-circle-plus mr-2"></i>
            Add file
          </button>
          <div class="option-element">
            <button @click="scrollToEditor" class="btn btn-xs" title="Focus on the PDF editor area">
              <i class="fa-solid fa-expand"></i>
              Focus
            </button>
          </div>
          <div class="option-element">
            <select v-model="pagesPerRow" class="btn btn-xs" title="Pages per row">
              <option value="3">3 pages</option>
              <option value="4">4 pages</option>
              <option value="5">5 pages</option>
              <option value="6">6 pages</option>
            </select>
          </div>
          <div class="option-element">
            <button @click="toggleSelectAll" class="btn">
              Select All
            </button>
          </div>
          <div class="option-element">
            <button @click="openMergeDialog" class="btn ml-4" title="Merge multiple PDF files">
              <i class="fa-solid fa-object-group mr-2"></i>
              Merge PDFs
            </button>
          </div>
          <div class="option-element">
            <button v-if="selectedCount >= 1" @click="exportSelected" class="btn btn-xs" title="Export selected pages to PDF">
              <i class="fa-solid fa-file-export mr-1"></i>
              Export Selected
            </button>
          </div>
          <div class="option-element">
            <button v-if="selectedCount > 1" @click="applyToSelected('Delete')" class="btn btn-xs" title="Delete selected pages">
              <i class="fa-solid fa-trash mr-1"></i>
              Delete
            </button>
          </div>
          <div class="option-element">
            <button v-if="selectedCount > 1" @click="applyToSelected('Rotate')" class="btn btn-xs" title="Rotate selected pages">
              <i class="fa-solid fa-rotate-right mr-1"></i>
              Rotate
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="organize-body p-8" :data-tool="selectedTool">
      <!-- Floating Toolbar -->
      <div class="floating-toolbar">
        <div class="tools-section">
          <div
            class="body-tool"
            :class="{ active: selectedTool === 'select' }"
            @click="selectTool('select')"
            title="Select Tool - Click to select pages"
          >
            <i class="fa-solid fa-mouse-pointer"></i>
          </div>
          <div
            class="body-tool"
            :class="{ active: selectedTool === 'swap' }"
            @click="selectTool('swap')"
            title="Swap Tool - Click a page and swap with another"
          >
            <i class="fa-solid fa-arrow-right-arrow-left"></i>
          </div>
          <div
            class="body-tool"
            :class="{ active: selectedTool === 'delete' }"
            @click="selectTool('delete')"
            title="Delete Tool - Click pages to delete them"
          >
            <i class="fa-solid fa-trash"></i>
          </div>

          <div
            class="body-tool"
            :class="{ active: selectedTool === 'rotate' }"
            @click="selectTool('rotate')"
            title="Rotate Tool - Click pages to rotate them 90° clockwise"
          >
            <i class="fa-solid fa-rotate-right"></i>
          </div>

          <div
            class="body-tool"
            :class="{ active: selectedTool === 'duplicate' }"
            @click="selectTool('duplicate')"
            title="Duplicate Tool - Click pages to duplicate them"
          >
            <i class="fa-solid fa-copy"></i>
          </div>

          <div
            class="body-tool"
            :class="{ active: selectedTool === 'add-blank' }"
            @click="selectTool('add-blank')"
            title="Add Blank Page - Click after a page to insert blank page"
          >
            <i class="fa-solid fa-plus"></i>
          </div>
          <div
            class="body-tool"
            :class="{ active: selectedTool === 'sort' }"
            @click="reversePages"
            title="Sort - Reverse page order"
          >
            <i class="fa-solid fa-sort"></i>
          </div>
          <div
            class="body-tool"
            @click="openSplitDialog"
            title="Split PDF - Split PDF into multiple files"
          >
            <i class="fa-solid fa-scissors"></i>
          </div>
        </div>
      </div>
      <div ref="pdfViewContainer" id="body-pdf-view" class="body-pdf-view">
        <!-- Placeholder content for when no PDF is loaded -->
        <div v-if="!isLoaded" class="pdf-placeholder">
          <div class="pdf-placeholder-content">
            <i class="fas fa-file-pdf pdf-placeholder-icon"></i>

            <p class="pdf-placeholder-text">Drag and drop a PDF file here to get started</p>
            <p class="pdf-placeholder-text-secondary">
              or use the
              <button @click="clickFileInput" class="btn">
                <i class="fa-solid fa-folder-open mr-2"></i>
                Open
              </button>
              button above to browse for a file
            </p>
            <div class="pdf-placeholder-formats">
              <span class="pdf-placeholder-format">PDF files</span>
              <span class="pdf-placeholder-format ml-3">JSON config files</span>
            </div>
          </div>
        </div>
        <!-- Pages Grid -->
        <div
          class="pages-grid"
          :style="{ gridTemplateColumns: `repeat(${pagesPerRow}, 1fr)` }"
          @dragover.prevent="handleDragOver"
        >
          <div
            v-for="(page, index) in pages"
            :key="page.id"
            :class="[
              'page-card',
              colorBorder[(page.fileIndex || 0) % colorBorder.length],
              {
                selected: page.selected,
                'ring-4': page.selected,
                [colorRing[(page.fileIndex || 0) % colorRing.length]]: page.selected,
              },
            ]"
            :draggable="selectedTool === 'select'"
            @click="handlePageClick(index, $event)"
            @dragstart="selectedTool === 'select' ? handleDragStart(index) : null"
            @dragend="selectedTool === 'select' ? handleDragEnd : null"
            @dragover.prevent
            @drop.prevent="selectedTool === 'select' ? handlePageDrop(index) : null"
            @contextmenu.prevent="showContextMenu($event, page, index)"
          >
            <div class="page-thumbnail">
              <canvas :ref="(el) => setPageCanvas(page.id, el)" class="page-canvas"></canvas>
              <div class="page-number-badge">{{ index + 1 }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="page-modal">

    </div>
    <!-- Context Menu -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <button @click="previewPage(contextMenu.pageIndex)" class="context-menu-item">
        <i class="fa-solid fa-magnifying-glass"></i>
        Preview Page
      </button>
      <div class="context-menu-divider"></div>
      <button @click="rotatePage(contextMenu.pageIndex, 90)" class="context-menu-item">
        <i class="fa-solid fa-rotate-right"></i>
        Rotate
      </button>
      <div class="context-menu-divider"></div>
      <button @click="duplicatePage(contextMenu.pageIndex)" class="context-menu-item">
        <i class="fa-solid fa-copy"></i>
        Duplicate
      </button>
      <button @click="addBlankPage(contextMenu.pageIndex + 1)" class="context-menu-item">
        <i class="fa-solid fa-plus"></i>
        Add Blank
      </button>
      <div class="context-menu-divider"></div>
      <button
        @click="deletePage(contextMenu.pageIndex)"
        class="context-menu-item danger"
        :disabled="pages.length === 1"
      >
        <i class="fa-solid fa-trash"></i>
        Delete
      </button>
    </div>
  </div>

  <!-- Toast Notification - Outside main container for better positioning -->

  <!-- Dynamic toast -->
  <div
    v-if="toast.show"
    style="
      position: fixed;
      top: 80px;
      right: 20px;
      background: #4ade80;
      color: white;
      padding: 16px;
      border-radius: 8px;
      z-index: 99999;
      min-width: 300px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    "
    @click="hideToast"
  >
    <div style="display: flex; align-items: center; justify-content: space-between">
      <span>{{ toast.message }}</span>
      <button
        @click.stop="hideToast"
        style="
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          margin-left: 10px;
        "
      >
        ×
      </button>
    </div>
  </div>
  <div v-if="previewModal.show" class="preview-modal-overlay" @click.self="closePreview">
      <button class="preview-close-btn" @click="closePreview">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <div class="preview-content">

        <button
          class="preview-nav-btn prev"
          :disabled="previewModal.pageIndex <= 0"
          @click.stop="prevPreviewPage"
        >
          <i class="fa-solid fa-chevron-left"></i>
        </button>

        <div class="preview-canvas-wrapper" @click.stop>
           <canvas ref="previewCanvasRef" class="preview-canvas"></canvas>
           <div class="preview-info">
             Page {{ previewModal.pageIndex + 1 }} / {{ pages.length }}
           </div>
        </div>

        <button
          class="preview-nav-btn next"
          :disabled="previewModal.pageIndex >= pages.length - 1"
          @click.stop="nextPreviewPage"
        >
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Split Dialog -->
    <SplitDialog
      :show="splitDialog.show"
      :totalPages="pages.length"
      @close="closeSplitDialog"
      @split="handleSplit"
    />

    <!-- Merge Dialog -->
    <MergeDialog
      :show="showMergeDialog"
      :initialFile="initialFile"
      @close="closeMergeDialog"
      @merge="handleMerge"
      :showToast="showToast"
    />
</template>

<script lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from "vue";
import { PDFOrganizer } from "./js/PDFOrganizer.js";
import SplitDialog from "./components/SplitDialog.vue";
import MergeDialog from "./components/MergeDialog.vue";

export default {
  name: "OrganizerApp",
  setup() {
    const fileInput = ref(null);
    const fileAppend = ref(null);
    const organizer = new PDFOrganizer();
    const pages = ref([]);
    const isLoaded = ref(false);
    const draggedIndex = ref(null);
    const draggedIndices = ref([]);
    const pagesPerRow = ref(6);
    const pageCanvasRefs = ref({});
    const contextMenu = ref({
      show: false,
      x: 0,
      y: 0,
      page: null,
      pageIndex: -1,
    });
    const toast = ref({
      show: false,
      message: "",
      type: "success",
      timeout: null,
    });

    const colorBorder = [
      "border-blue-300",
      "border-red-300",
      "border-green-300",
      "border-purple-300",
      "border-orange-300",
      "border-pink-300",
    ];

    const colorRing = [
      "ring-blue-300",
      "ring-red-300",
      "ring-green-300",
      "ring-purple-300",
      "ring-orange-300",
      "ring-pink-300",
    ];

    const selectedTool = ref('select');
    const selectedCount = ref(0);
    const allSelected = ref(false);
    const action = ref('Delete');
    const swapSourceIndex = ref(null);
    const pdfViewContainer = ref(null);
    const autoScrollInterval = ref(null);

    // Toast functions
    const showToast = (message, type = "success", duration = 3000) => {
      if (toast.value.timeout) clearTimeout(toast.value.timeout);

      toast.value = {
        show: true,
        message,
        type,
        timeout: setTimeout(() => hideToast(), duration),
      };
    };

    const hideToast = () => {
      toast.value.show = false;
      if (toast.value.timeout) {
        clearTimeout(toast.value.timeout);
        toast.value.timeout = null;
      }
    };

    // Tool selection
    const selectTool = (tool) => {
      selectedTool.value = tool;
      // Reset swap source when switching tools
      if (tool !== 'select' || tool !== 'swap') {
        pages.value.forEach(page => {
          page.selected = false;
        });
        updateSelectionCount();
      }
      if (tool !== 'swap') {
        swapSourceIndex.value = null;
      }
    };

    // Page selection handlers
    const handlePageClick = async (index, event) => {
      const page = pages.value[index];
      if (selectedTool.value === 'select') {
        // Toggle selection
        if (event.ctrlKey || event.metaKey) {
          // Clear other selections
          pages.value.forEach((p, idx) => {
            p.selected = idx === index;
          });
        } else if (event.shiftKey) {
          // Select range
          const lastIndex = pages.value.findIndex(p => p.selected);
          if (lastIndex !== -1) {
            const [start, end] = [lastIndex, index].sort((a, b) => a - b);
            for (let i = start; i <= end; i++) {
              pages.value[i].selected = true;
            }
          } else {
            page.selected = true;
          }
        } else {
          page.selected = !page.selected;
        }
        updateSelectionCount();
      } else if (selectedTool.value === 'delete') {
        // Delete page immediately
        deletePage(index);
      } else if (selectedTool.value === 'rotate') {
        // Rotate page immediately
        rotatePage(index, 90);
      } else if (selectedTool.value === 'duplicate') {
        // Duplicate page immediately
        duplicatePage(index);
      } else if (selectedTool.value === 'add-blank') {
        // Add blank page after clicked page
        addBlankPage(index + 1);
      } else if (selectedTool.value === 'swap') {
        // Swap tool
        page.selected = true;
        swapPages(index);
      }
    };

    const updateSelectionCount = () => {
      selectedCount.value = pages.value.filter(p => p.selected).length;
      allSelected.value = pages.value.length > 0 && selectedCount.value === pages.value.length;
    };

    const toggleSelectAll = () => {
      const shouldSelect = !allSelected.value;
      pages.value.forEach(page => {
        page.selected = shouldSelect;
      });
      updateSelectionCount();
    };

    const applyToSelected = async (actionType) => {
      const selectedIndices = [];
      pages.value.forEach((page, index) => {
        if (page.selected) selectedIndices.push(index);
      });

      if (selectedIndices.length === 0) return;

      if (actionType === 'Delete') {
        // Delete from highest index to lowest
        for (let i = selectedIndices.length - 1; i >= 0; i--) {
          organizer.deletePage(selectedIndices[i]);
        }
        pages.value = [...organizer.getPages()];
      } else if (actionType === 'Rotate') {
        // Rotate all selected pages
        for (const index of selectedIndices) {
          organizer.rotatePage(index, 90);
        }
        pages.value = [...organizer.getPages()];
        await nextTick();
        for (const index of selectedIndices) {
          await renderPage(index);
        }
      }

      updateSelectionCount();
    };

    // File handling
    const clickFileInput = () => {
      fileInput.value?.click();
    };

    const handleFileUpload = () => {
      const file = fileInput.value.files[0];
      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        showToast("Please select a PDF file.", "warning");
        return;
      }
      if (file) loadPDFFile(file);
    };

    // Append PDF logic
    const clickAppendFileInput = () => {
      fileAppend.value?.click();
    };

    const handleAppendFile = () => {
      const file = fileAppend.value.files[0];
      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        showToast("Please select a PDF file.", "warning");
        return;
      }
      if (file) loadPDFFile(file, false);
    };

    // Load PDF file
    const loadPDFFile = async (file, reset = true) => {
      if (file.type !== "application/pdf") {
        return;
      }
      try {
        const result = await organizer.loadPDFFile(file, reset);
        // Update pages with reactivity trigger
        pages.value = [...result.pages];
        isLoaded.value = true;

        // Wait for DOM to update and render
        await nextTick();

        // Render only the newly added pages
        for (let i = result.startId; i < result.endId; i++) {
          const pageIndex = pages.value.findIndex((p) => p.id === i);
          if (pageIndex !== -1) {
            await renderPage(pageIndex);
          }
        }
      } catch (err) {
        console.error("Error loading PDF:", err);
      }
    };
    // Page rendering
    const renderAllPages = async () => {
      for (let i = 0; i < pages.value.length; i++) {
        await renderPage(i);
      }
    };


    const renderPage = async (index) => {
      const page = pages.value[index];
      if (!page) return;
      let canvas = pageCanvasRefs.value[page.id];
      let attempts = 0;
      const maxAttempts = 20;
      while (!canvas && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        canvas = pageCanvasRefs.value[page.id];
        attempts++;
      }
      if (!canvas) {
        return;
      }
      try {
        if (page.isBlank) {
          organizer.renderBlankPage(canvas);
        } else {
          await organizer.renderPage(index, canvas);
        }
      } catch (err) {
        console.error("Error rendering page:", err);
      }
    };

    const setPageCanvas = (pageId, el) => {
      if (el) {
        pageCanvasRefs.value[pageId] = el;
      }
    };

    // Page preview
    const previewModal = ref({
      show: false,
      pageIndex: -1,
      scale: 2.0,
    });
    const previewCanvasRef = ref(null);

    // Split dialog state
    const splitDialog = ref({
      show: false,
    });

    // Merge dialog state
    const showMergeDialog = ref(false);
    const initialFile = ref([]);

    const previewPage = async (index) => {
      closeContextMenu();

      previewModal.value.pageIndex = index;
      previewModal.value.show = true;

      await nextTick();
      await renderPreview();
    };

    const renderPreview = async () => {
      const index = previewModal.value.pageIndex;
      const canvas = previewCanvasRef.value;

      if (index >= 0 && canvas) {
        try {
            await organizer.renderPage(index, canvas, previewModal.value.scale);
        } catch (e) {
            console.error("Preview render error", e);
        }
      }
    };

    const closePreview = () => {
      previewModal.value.show = false;
      previewModal.value.pageIndex = -1;
    };

    const nextPreviewPage = async () => {
      if (previewModal.value.pageIndex < pages.value.length - 1) {
        previewModal.value.pageIndex++;
        await nextTick();
        await renderPreview();
      }
    };

    const prevPreviewPage = async () => {
      if (previewModal.value.pageIndex > 0) {
        previewModal.value.pageIndex--;
        await nextTick();
        await renderPreview();
      }
    };

    // Page operations
    const rotatePage = async (index, degrees) => {
      organizer.rotatePage(index, degrees);
      pages.value = [...organizer.getPages()];

      await nextTick();
      await renderPage(index);
      closeContextMenu();
    };

    const duplicatePage = async (index) => {
      const newPage = organizer.duplicatePage(index);
      if (!newPage) return;

      pages.value = [...organizer.getPages()];
      await nextTick();
      await renderPage(index + 1);
      closeContextMenu();
    };

    const addBlankPage = async (index) => {
      const blankPage = organizer.addBlankPage(index);
      pages.value = [...organizer.getPages()];

      await nextTick();

      const canvas = pageCanvasRefs.value[blankPage.id];
      if (canvas) {
        organizer.renderBlankPage(canvas);
      }

      closeContextMenu();
    };

    const deletePage = (index) => {
      const success = organizer.deletePage(index);
      if (success) {
        pages.value = [...organizer.getPages()];
      }
      closeContextMenu();
    };

    const reversePages = async () => {
      organizer.reversePages();
      pages.value = [...organizer.getPages()];
      await nextTick();
      await renderAllPages();
    };

    const swapPages = async (index) => {
      if (swapSourceIndex.value === null) {
        swapSourceIndex.value = index;
      } else if (swapSourceIndex.value === index) {
        // Clicked the same page, reset
        pages.value[index].selected = false;
        swapSourceIndex.value = null;
        updateSelectionCount();
      } else {
        // Perform swap
        organizer.swapPages(swapSourceIndex.value, index);
        pages.value = [...organizer.getPages()];
        // Clear selected state after swap
        pages.value[swapSourceIndex.value].selected = false;
        pages.value[index].selected = false;
        await nextTick();
        await renderPage(swapSourceIndex.value);
        await renderPage(index);
        swapSourceIndex.value = null;
        updateSelectionCount();
      }
    };

    // Drag and drop
    const handleDragStart = (index) => {
      draggedIndex.value = index;

      // If dragging a selected page, drag all selected pages
      const draggedPage = pages.value[index];
      if (draggedPage.selected) {
        draggedIndices.value = [];
        pages.value.forEach((page, idx) => {
          if (page.selected) {
            draggedIndices.value.push(idx);
          }
        });
      } else {
        draggedIndices.value = [];
      }
    };

    const handleDragOver = (event) => {
      scrollToEditor();
      if (draggedIndex.value === null) return;

      const container = pdfViewContainer.value;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseY = event.clientY;
      const scrollThreshold = 100; // pixels from edge to trigger scroll
      const scrollSpeed = 10; // pixels per frame

      // Clear existing interval
      if (autoScrollInterval.value) {
        cancelAnimationFrame(autoScrollInterval.value);
        autoScrollInterval.value = null;
      }

      // Check if near top edge
      if (mouseY - rect.top < scrollThreshold) {
        const scroll = () => {
          if (container.scrollTop > 0) {
            container.scrollTop -= scrollSpeed;
            autoScrollInterval.value = requestAnimationFrame(scroll);
          }
        };
        autoScrollInterval.value = requestAnimationFrame(scroll);
      }
      // Check if near bottom edge
      else if (rect.bottom - mouseY < scrollThreshold) {
        const scroll = () => {
          if (container.scrollTop < container.scrollHeight - container.clientHeight) {
            container.scrollTop += scrollSpeed;
            autoScrollInterval.value = requestAnimationFrame(scroll);
          }
        };
        autoScrollInterval.value = requestAnimationFrame(scroll);
      }
    };

    const handleDragEnd = () => {
      if (autoScrollInterval.value) {
        cancelAnimationFrame(autoScrollInterval.value);
        autoScrollInterval.value = null;
      }
    };

    const handlePageDrop = (dropIndex) => {
      if (draggedIndex.value === null) return;

      // If dragging multiple selected pages
      if (draggedIndices.value.length > 1) {
        organizer.moveMultiplePages(draggedIndices.value, dropIndex);
      } else {
        // Single page drag
        organizer.movePage(draggedIndex.value, dropIndex);
      }
      // Update pages reference
      pages.value = [...organizer.getPages()];

      // Reset everything after drag and drop
      draggedIndex.value = null;
      draggedIndices.value = [];

      // Clear all selections
      pages.value.forEach(page => {
        page.selected = false;
      });
      updateSelectionCount();

      // Clean up auto scroll
      if (autoScrollInterval.value) {
        cancelAnimationFrame(autoScrollInterval.value);
        autoScrollInterval.value = null;
      }
    };

    // Context menu
    const showContextMenu = (event, page, index) => {
      contextMenu.value = {
        show: true,
        x: event.clientX,
        y: event.clientY,
        page,
        pageIndex: index,
      };
    };

    const closeContextMenu = () => {
      contextMenu.value.show = false;
    };

    const handleGlobalClick = () => {
      closeContextMenu();
    };

    // Download PDF
    const downloadPDF = async () => {

      try {
        const pdfBytes = await organizer.exportPDF();

        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `organized-pdf.pdf`;
        document.body.appendChild(a);
        await nextTick();
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

      } catch (err) {
        console.error("Error organizing PDF:", err);
      }
    };

    const scrollToEditor = () => {
      const pdfEditor = document.querySelector(".pdf-organizer");
      if (pdfEditor) {
        pdfEditor.scrollIntoView({
          block: "start",
          inline: "center",
        });
      } else {
        console.log("PDF editor container not found");
      }
    };

    // Split dialog methods
    const openSplitDialog = () => {
      if (!isLoaded.value || pages.value.length === 0) {
        showToast("Please load a PDF first", "error");
        return;
      }
      splitDialog.value.show = true;
    };

    const closeSplitDialog = () => {
      splitDialog.value.show = false;
    };

    const handleSplit = async (splitData) => {
      try {
        let result;

        if (splitData.mode === 'at-page') {
          result = await organizer.splitAtPage(splitData.splitAtPage);
          // Download two PDFs
          downloadPDFBytes(result[0], 'split-part-1.pdf');
          downloadPDFBytes(result[1], 'split-part-2.pdf');
          showToast(`PDF split into 2 files successfully!`, "success");
        } else if (splitData.mode === 'range') {
          result = await organizer.extractPageRange(splitData.rangeFrom, splitData.rangeTo);
          downloadPDFBytes(result, `pages-${splitData.rangeFrom}-to-${splitData.rangeTo}.pdf`);
          showToast(`Pages ${splitData.rangeFrom}-${splitData.rangeTo} extracted successfully!`, "success");
        } else if (splitData.mode === 'every') {
          result = await organizer.splitEveryNPages(splitData.everyNPages);
          // Download multiple PDFs
          result.forEach((pdfBytes, index) => {
            downloadPDFBytes(pdfBytes, `split-part-${index + 1}.pdf`);
          });
          showToast(`PDF split into ${result.length} files successfully!`, "success");
        }
      } catch (err) {
        console.error("Error splitting PDF:", err);
        showToast("Error splitting PDF", "error");
      }
    };

    // Merge dialog functions
    const openMergeDialog = async () => {
      if (isLoaded.value && pages.value.length > 0) {
        // Export current PDF as initial file for merge
        try {
          const pdfBytes = await organizer.exportPDF();
          const blob = new Blob([pdfBytes], { type: "application/pdf" });
          const currentFile = new File([blob], "current_organized.pdf", { type: "application/pdf" });
          initialFile.value = [currentFile];
        } catch (err) {
          console.error("Error preparing current PDF:", err);
          initialFile.value = [];
        }
      } else {
        initialFile.value = [];
      }
      showMergeDialog.value = true;
    };

    const closeMergeDialog = () => {
      showMergeDialog.value = false;
    };

    const handleMerge = async (blob) => {
      try {
        const file = new File([blob], "merged.pdf", { type: "application/pdf" });
        await loadPDFFile(file, true);
        showMergeDialog.value = false;
        showToast("Merged PDF loaded successfully!", "success");
      } catch (err) {
        console.error("Error loading merged PDF:", err);
        showToast("Error loading merged PDF", "error");
      }
    };
    const downloadPDFBytes = (pdfBytes, filename) => {
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    };

    // Export selected pages
    const exportSelected = async () => {
      const selectedIndices = [];
      try {
        pages.value.forEach((page, index) => {
          if (page.selected) selectedIndices.push(index);
        });
        const pdfBytes = await organizer.exportPDF(selectedIndices);
        const filename = selectedIndices.length === 1
          ? `page-${selectedIndices[0] + 1}.pdf`
          : `selected-pages-${selectedIndices.length}.pdf`;
        downloadPDFBytes(pdfBytes, filename);
      } catch (err) {
        showToast("Error exporting selected pages", "error");
      }
    };

    onMounted(() => {
      document.addEventListener("click", handleGlobalClick);
    });

    onUnmounted(() => {
      document.removeEventListener("click", handleGlobalClick);
    });

    return {
      fileInput,
      fileAppend,
      isLoaded,
      pages,
      contextMenu,
      toast,
      colorBorder,
      colorRing,
      pagesPerRow,
      selectedTool,
      selectedCount,
      allSelected,
      action,
      swapSourceIndex,
      clickFileInput,
      clickAppendFileInput,
      handleAppendFile,
      handleFileUpload,
      rotatePage,
      duplicatePage,
      addBlankPage,
      deletePage,
      reversePages,
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      handlePageDrop,
      showContextMenu,
      pdfViewContainer,
      downloadPDF,
      setPageCanvas,
      showToast,
      hideToast,
      selectTool,
      handlePageClick,
      toggleSelectAll,
      applyToSelected,
      updateSelectionCount,
      scrollToEditor,
      previewModal,
      previewCanvasRef,
      previewPage,
      closePreview,
      nextPreviewPage,
      prevPreviewPage,
      splitDialog,
      openSplitDialog,
      closeSplitDialog,
      handleSplit,
      showMergeDialog,
      initialFile,
      openMergeDialog,
      closeMergeDialog,
      handleMerge,
      exportSelected,
    };
  },
  components: {
    SplitDialog,
    MergeDialog
  }
};
</script>

<style scoped>
@reference "./css/tailwind.css";

.pdf-organizer {
  @apply bg-transparent;
}

.organize-body {
  @apply flex relative w-full p-4 pt-0;
  height: calc(100vh - 60px);
}

.organize-container {
  @apply w-full h-full max-h-full overflow-auto p-2.5 bg-gray-100;
}

.pages-grid {
  @apply grid gap-6;
}

.page-card {
  @apply bg-white border-2 rounded-lg p-4
         cursor-move transition-all duration-200;
}

.page-card:hover {
  @apply shadow-md;
}

.page-thumbnail {
  @apply relative mb-4 bg-gray-50 rounded overflow-hidden
         flex items-center justify-center aspect-[1/1.414];
}

.page-canvas {
  @apply max-w-full max-h-full object-contain;
}

.page-number-badge {
  @apply absolute top-2 right-2 bg-blue-500 text-white
         px-2 py-1 rounded text-sm font-semibold;
}

.page-actions {
  @apply flex gap-2 justify-center flex-wrap;
}


.context-menu {
  @apply fixed bg-white border border-gray-200 rounded-lg shadow-xl
         py-2 z-[10000] min-w-[200px];
}

.context-menu-item {
  @apply w-full px-4 py-3 text-left bg-transparent border-none
         cursor-pointer flex items-center gap-3
         transition-colors duration-200;
}

.context-menu-item:hover:not(:disabled) {
  @apply bg-gray-100;
}

.context-menu-item.danger {
  @apply text-red-500;
}

.context-menu-item.danger:hover:not(:disabled) {
  @apply bg-red-50;
}

.context-menu-item:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.context-menu-divider {
  @apply h-px bg-gray-200 my-2;
}

.toast {
  @apply fixed bottom-8 right-8 bg-white px-6 py-4 rounded-lg
         shadow-xl flex items-center gap-4 z-[10000]
         cursor-pointer animate-[slideIn_0.3s_ease-out];
}

.toast-success {
  @apply border-l-4 border-emerald-500;
}

.toast-error {
  @apply border-l-4 border-red-500;
}

.toast-close {
  @apply bg-transparent border-none text-2xl cursor-pointer
         text-gray-500 leading-none;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}



.page-card.selected {
  @apply shadow-lg;
}

.selection-indicator {
  @apply absolute top-2 left-2 bg-blue-500 text-white
         w-8 h-8 rounded-full flex items-center justify-center
         text-lg font-bold shadow-lg;
}

.badge {
  @apply bg-blue-500 text-white px-3 py-1 rounded-full
         text-sm font-semibold;
}

.organize-body[data-tool="delete"] .page-card {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'/%3E%3C/svg%3E") 12 12, auto;
}

.organize-body[data-tool="rotate"] .page-card {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z'/%3E%3C/svg%3E") 12 12, auto;
}

.organize-body[data-tool="duplicate"] .page-card {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z'/%3E%3C/svg%3E") 12 12, auto;
}

.organize-body[data-tool="add-blank"] .page-card {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'/%3E%3C/svg%3E") 12 12, auto;
}

.organize-body[data-tool="swap"] .page-card {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%236366f1' d='M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z'/%3E%3C/svg%3E") 12 12, auto;
}

.move-indicator {
  @apply absolute top-2 left-2 bg-indigo-500 text-white
         w-8 h-8 rounded-full flex items-center justify-center
         text-lg font-bold shadow-lg animate-pulse;
}


.preview-modal-overlay {
  @apply fixed inset-0 z-[10002] flex items-center justify-center;
  background-color: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

.preview-close-btn {
  @apply absolute top-4 right-6 text-white text-4xl cursor-pointer
         hover:text-gray-300 transition-colors z-[10003] bg-transparent border-none;
}

.preview-content {
  @apply flex items-center justify-center w-full h-full p-4 relative;
}

.preview-canvas-wrapper {
  @apply relative bg-white shadow-2xl max-h-[95vh] max-w-[95vw] rounded-sm overflow-hidden flex flex-col items-center;
}

.preview-canvas {
  @apply block object-contain max-h-[90vh] w-auto;
}

.preview-info {
  @apply bg-gray-900 text-white px-4 py-2 mt-0 w-full text-center text-sm font-medium;
}

.preview-nav-btn {
  @apply bg-white/10 text-white rounded-full w-12 h-12 flex items-center justify-center
         cursor-pointer transition-all border-none mx-4 hover:bg-white/20;
}

.preview-nav-btn:disabled {
  @apply opacity-30 cursor-not-allowed hover:bg-white/10;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (max-width: 768px) {
  .pages-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    @apply gap-4;
  }

  .organizer-toolbar {
    @apply flex-col gap-4;
  }


  .tools-section {
    @apply flex-row;
  }

  .body-tool {
    @apply w-10 h-10;
  }
}
</style>
