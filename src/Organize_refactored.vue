<template>
  <div class="pdf-organizer" @dragenter.stop @dragover.stop @drop.stop>
    <div class="p-2">
      <div class="header-actions">
        <div class="element-container ml-2">
          <div class="element-upload element-default">
            <label>
              <i class="fa-solid fa-file-pdf"></i>
              <input
                ref="fileInput"
                type="file"
                accept="application/pdf"
                @change="handleFileUpload"
                class="file-input"
              />
            </label>
          </div>
          <button @click="clickFileInput" class="element-button element-primary">
            <i class="fa-solid fa-file-pdf"></i>
            Open PDF
          </button>
          <button
            @click="clickAppendFileInput"
            :disabled="!isLoaded"
            class="element-button element-primary"
          >
            <i class="fa-solid fa-file-circle-plus"></i>
            Append PDF
          </button>
          <input
            ref="fileAppend"
            type="file"
            accept="application/pdf"
            @change="handleAppendFile"
            class="file-input"
          />
          <button @click="openMergeDialog" class="element-button element-primary">
            <i class="fa-solid fa-code-merge"></i>
            Merge PDFs
          </button>
          <button
            @click="openSplitDialog"
            :disabled="!isLoaded"
            class="element-button element-primary"
          >
            <i class="fa-solid fa-scissors"></i>
            Split PDF
          </button>
          <button
            @click="reversePages"
            :disabled="!isLoaded"
            class="element-button element-primary"
          >
            <i class="fa-solid fa-arrows-rotate"></i>
            Reverse
          </button>
          <div class="relative">
            <button
              @click.stop="showExportMenu = !showExportMenu"
              :disabled="!isLoaded"
              class="element-button element-success"
            >
              <i class="fa-solid fa-download"></i>
              Download
            </button>
            <div v-if="showExportMenu" class="dropdown-menu">
              <button @click="handleExport('all')" class="dropdown-item">
                <i class="fa-solid fa-file-pdf"></i>
                All Pages
              </button>
              <button
                @click="handleExport('selected')"
                :disabled="selectedCount === 0"
                class="dropdown-item"
              >
                <i class="fa-solid fa-file-circle-check"></i>
                Selected Pages ({{ selectedCount }})
              </button>
            </div>
          </div>
          <button
            @click="sendToPDFEditor"
            :disabled="!isLoaded"
            class="element-button element-primary"
          >
            <i class="fa-solid fa-pen-to-square"></i>
            Send to Editor
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="organize-body p-8" :data-tool="selectedTool">
      <!-- Floating Toolbar -->
      <div class="floating-toolbar">
        <div class="tools-section">
          <button
            :class="['body-tool', { active: selectedTool === 'select' }]"
            @click="selectTool('select')"
            title="Select tool"
          >
            <i class="fa-solid fa-hand-pointer"></i>
          </button>
          <button
            :class="['body-tool', { active: selectedTool === 'delete' }]"
            @click="selectTool('delete')"
            title="Delete tool"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
          <button
            :class="['body-tool', { active: selectedTool === 'rotate' }]"
            @click="selectTool('rotate')"
            title="Rotate tool"
          >
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <button
            :class="['body-tool', { active: selectedTool === 'duplicate' }]"
            @click="selectTool('duplicate')"
            title="Duplicate tool"
          >
            <i class="fa-solid fa-copy"></i>
          </button>
          <button
            :class="['body-tool', { active: selectedTool === 'add-blank' }]"
            @click="selectTool('add-blank')"
            title="Add blank page"
          >
            <i class="fa-solid fa-file-circle-plus"></i>
          </button>
          <button
            :class="['body-tool', { active: selectedTool === 'swap' }]"
            @click="selectTool('swap')"
            title="Swap pages"
          >
            <i class="fa-solid fa-arrow-right-arrow-left"></i>
          </button>
        </div>
        <div v-if="selectedTool === 'select' && isLoaded" class="selection-controls">
          <button @click="toggleSelectAll" class="select-btn" title="Select all">
            <i :class="allSelected ? 'fa-solid fa-square-check' : 'fa-regular fa-square'"></i>
            {{ allSelected ? "Deselect All" : "Select All" }}
          </button>
          <span v-if="selectedCount > 0" class="badge">{{ selectedCount }} selected</span>
          <div v-if="selectedCount > 0" class="relative">
            <button @click.stop="showActionMenu = !showActionMenu" class="action-btn">
              {{ action }}
              <i class="fa-solid fa-chevron-down ml-1"></i>
            </button>
            <div v-if="showActionMenu" class="dropdown-menu">
              <button @click="applyToSelected('Delete')" class="dropdown-item text-red-600">
                <i class="fa-solid fa-trash"></i>
                Delete
              </button>
              <button @click="applyToSelected('Rotate')" class="dropdown-item">
                <i class="fa-solid fa-rotate-right"></i>
                Rotate
              </button>
              <button @click="applyToSelected('Sort')" class="dropdown-item">
                <i class="fa-solid fa-arrow-down-up-across-line"></i>
                Sort (Reverse)
              </button>
            </div>
          </div>
        </div>
      </div>
      <div ref="pdfViewContainer" id="body-pdf-view" class="body-pdf-view">
        <!-- Placeholder content for when no PDF is loaded -->
        <div v-if="!isLoaded" class="pdf-placeholder">
          <div class="placeholder-content">
            <i class="fa-solid fa-file-pdf placeholder-icon"></i>
            <h3 class="placeholder-title">No PDF Loaded</h3>
            <p class="placeholder-text">Click "Open PDF" to get started</p>
            <button @click="clickFileInput" class="placeholder-button">
              <i class="fa-solid fa-upload"></i>
              Open PDF File
            </button>
          </div>
        </div>
        <!-- Pages Grid -->
        <div
          v-if="isLoaded"
          class="pages-grid"
          :style="{ gridTemplateColumns: `repeat(${pagesPerRow}, 1fr)` }"
          @dragover.prevent="handleDragOver"
        >
          <div
            v-for="(page, index) in pages"
            :key="page.id"
            :class="['page-card', { selected: page.selected }]"
            @click="handlePageClick(index, $event)"
            @contextmenu.prevent="showContextMenu($event, page, index)"
            @dragstart="handleDragStart(index)"
            @dragend="handleDragEnd"
            @drop.prevent="handlePageDrop(index)"
            draggable="true"
          >
            <div class="page-thumbnail">
              <canvas :ref="(el) => setPageCanvas(page.id, el)" class="page-canvas"></canvas>
              <div :class="['page-number-badge', colorPage[page.fileIndex % colorPage.length]]">
                {{ page.pageNumber || "Blank" }}
              </div>
              <div class="current-number">Page {{ index + 1 }}</div>
            </div>
            <div v-if="page.selected" class="selection-indicator">
              <i class="fa-solid fa-check"></i>
            </div>
            <div v-if="swapSourceIndex === index && selectedTool === 'swap'" class="move-indicator">
              1
            </div>
          </div>
        </div>
      </div>
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
    </div>
  </div>

  <div v-if="previewModal.show" class="preview-modal-overlay" @click.self="closePreview">
    <button class="preview-close-btn" @click="closePreview">
      <i class="fa-solid fa-xmark"></i>
    </button>

    <div class="preview-content">
      <div class="preview-canvas-wrapper" @click.stop>
        <div
          class="preview-image-container"
          @mousemove="zoomEnabled && ((showZoomLens = true), handleZoomMove($event))"
          @mouseenter="zoomEnabled && (showZoomLens = true)"
          @mouseleave="showZoomLens = false"
        >
          <canvas ref="previewCanvasRef" class="preview-canvas"></canvas>
          <div v-if="showZoomLens && zoomEnabled" class="zoom-lens" :style="zoomLensStyle"></div>
        </div>
        <div v-if="showZoomLens && zoomEnabled" class="zoom-result" :style="zoomResultStyle"></div>
        <div class="preview-controls">
          <button
            @click="prevPreviewPage"
            :disabled="previewModal.pageIndex === 0"
            class="preview-control-btn"
            title="Previous page"
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <span class="preview-page-info"
            >{{ previewModal.pageIndex + 1 }} / {{ pages.length }}</span
          >
          <button
            @click="nextPreviewPage"
            :disabled="previewModal.pageIndex === pages.length - 1"
            class="preview-control-btn"
            title="Next page"
          >
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <div class="preview-divider"></div>
          <button
            @click="handlePreviewAction('toggleZoom')"
            :class="['preview-control-btn', { active: zoomEnabled }]"
            title="Toggle zoom"
          >
            <i class="fa-solid fa-magnifying-glass-plus"></i>
          </button>
          <button
            @click="handlePreviewAction('rotatePage')"
            class="preview-control-btn"
            title="Rotate page"
          >
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <button
            @click="handlePreviewAction('deletePage')"
            class="preview-control-btn"
            title="Delete page"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </div>

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
          background: transparent;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          margin-left: 10px;
        "
      >
        ×
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
  components: { SplitDialog, MergeDialog },
  setup() {
    // Refs
    const fileInput = ref(null);
    const fileAppend = ref(null);
    const organizer = new PDFOrganizer();
    const pages = ref([]);
    const isLoaded = ref(false);
    const draggedIndex = ref(null);
    const draggedIndices = ref([]);
    const pagesPerRow = ref(6);
    const pageCanvasRefs = ref({});
    const contextMenu = ref({ show: false, x: 0, y: 0, page: null, pageIndex: -1 });
    const toast = ref({ show: false, message: "", type: "success", timeout: null });
    const selectedTool = ref("select");
    const selectedCount = ref(0);
    const allSelected = ref(false);
    const action = ref("Delete");
    const swapSourceIndex = ref(null);
    const pdfViewContainer = ref(null);
    const autoScrollInterval = ref(null);
    const showActionMenu = ref(false);
    const showExportMenu = ref(false);
    const previewModal = ref({ show: false, pageIndex: -1, scale: 2.0 });
    const previewCanvasRef = ref(null);
    const showZoomLens = ref(false);
    const zoomLensStyle = ref({});
    const zoomResultStyle = ref({});
    const zoomEnabled = ref(false);
    const splitDialog = ref({ show: false });
    const showMergeDialog = ref(false);
    const initialFile = ref([]);
    let lastSelectedIndex = -1;

    const colorPage = [
      "bg-blue-400 border-blue-300 ring-blue-300",
      "bg-red-400 border-red-300 ring-red-300",
      "bg-green-400 border-green-300 ring-green-300",
      "bg-purple-400 border-purple-300 ring-purple-300",
      "bg-orange-400 border-orange-300 ring-orange-300",
      "bg-pink-400 border-pink-300 ring-pink-300",
    ];

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

    // Helper functions
    const updateSelectionCount = () => {
      selectedCount.value = pages.value.filter((p) => p.selected).length;
      allSelected.value = pages.value.length > 0 && selectedCount.value === pages.value.length;
    };

    const closeContextMenu = () => {
      contextMenu.value.show = false;
    };

    const updatePages = async (indices = null) => {
      pages.value = [...organizer.getPages()];
      await nextTick();
      if (indices) {
        for (const idx of indices) await renderPage(idx);
      }
    };

    const resetIfEmpty = () => {
      if (pages.value.length === 0) {
        isLoaded.value = false;
        if (fileInput.value) fileInput.value.value = "";
      }
    };

    const getSelectedIndices = () =>
      pages.value.map((page, index) => (page.selected ? index : null)).filter((i) => i !== null);

    const validatePDF = (file) => {
      if (!file || (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) {
        showToast("Please select a PDF file.", "warning");
        return false;
      }
      return true;
    };

    const clearAutoScroll = () => {
      if (autoScrollInterval.value) {
        cancelAnimationFrame(autoScrollInterval.value);
        autoScrollInterval.value = null;
      }
    };

    // Tool selection
    const selectTool = (tool) => {
      selectedTool.value = tool;
      if (tool !== "select") {
        pages.value.forEach((page) => (page.selected = false));
        updateSelectionCount();
      }
      if (tool !== "swap") swapSourceIndex.value = null;
    };

    // Tool actions map
    const toolActions = {
      select: (index, event) => setSelectedPage(index, event),
      delete: (index) => deletePage(index),
      rotate: (index) => rotatePage(index, 90),
      duplicate: (index) => duplicatePage(index),
      "add-blank": (index) => addBlankPage(index + 1),
      swap: (index) => {
        pages.value[index].selected = true;
        swapPages(index);
      },
    };

    const handlePageClick = async (index, event) => {
      const action = toolActions[selectedTool.value];
      if (action) action(index, event);
    };

    const setSelectedPage = (index, event) => {
      const page = pages.value[index];
      if (event.ctrlKey || event.metaKey) {
        pages.value.forEach((p, idx) => (p.selected = idx === index));
      } else if (event.shiftKey && lastSelectedIndex !== -1) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        pages.value.forEach((p, idx) => (p.selected = idx >= start && idx <= end));
      } else {
        page.selected = !page.selected;
        lastSelectedIndex = index;
      }
      updateSelectionCount();
    };

    // Page operations
    const rotatePage = async (index, degrees) => {
      organizer.rotatePage(index, degrees);
      await updatePages([index]);
      closeContextMenu();
    };

    const duplicatePage = async (index) => {
      if (!organizer.duplicatePage(index)) return;
      await updatePages([index + 1]);
      closeContextMenu();
    };

    const addBlankPage = async (index) => {
      const blankPage = organizer.addBlankPage(index);
      pages.value = [...organizer.getPages()];
      await nextTick();
      const canvas = pageCanvasRefs.value[blankPage.id];
      if (canvas) organizer.renderBlankPage(canvas);
      closeContextMenu();
    };

    const deletePage = (index) => {
      organizer.deletePage(index);
      pages.value = [...organizer.getPages()];
      resetIfEmpty();
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
        pages.value[index].selected = false;
        swapSourceIndex.value = null;
        updateSelectionCount();
      } else {
        organizer.swapPages(swapSourceIndex.value, index);
        await updatePages([swapSourceIndex.value, index]);
        pages.value[swapSourceIndex.value].selected = false;
        pages.value[index].selected = false;
        swapSourceIndex.value = null;
        updateSelectionCount();
      }
    };

    const toggleSelectAll = () => {
      const shouldSelect = !allSelected.value;
      pages.value.forEach((page) => (page.selected = shouldSelect));
      updateSelectionCount();
    };

    const applyToSelected = async (actionType) => {
      showActionMenu.value = false;
      const selectedIndices = getSelectedIndices();
      if (selectedIndices.length === 0) {
        showToast("No pages selected", "warning");
        return;
      }

      if (actionType === "Delete") {
        for (let i = selectedIndices.length - 1; i >= 0; i--) {
          organizer.deletePage(selectedIndices[i]);
        }
        pages.value = [...organizer.getPages()];
        resetIfEmpty();
      } else if (actionType === "Rotate") {
        for (const index of selectedIndices) {
          organizer.rotatePage(index, 90);
        }
        await updatePages(selectedIndices);
      } else if (actionType === "Sort") {
        organizer.sortSelectedPages(selectedIndices);
        await updatePages(selectedIndices);
      }
      updateSelectionCount();
    };

    // File handling
    const clickFileInput = () => fileInput.value?.click();
    const clickAppendFileInput = () => fileAppend.value?.click();

    const handleFileUpload = () => {
      const file = fileInput.value.files[0];
      if (validatePDF(file)) {
        loadPDFFile(file);
        fileInput.value.value = "";
      }
    };

    const handleAppendFile = () => {
      const file = fileAppend.value.files[0];
      if (validatePDF(file)) {
        loadPDFFile(file, false);
        fileAppend.value.value = "";
      }
    };

    const loadPDFFile = async (file, reset = true) => {
      if (!validatePDF(file)) return;
      try {
        const result = await organizer.loadPDFFile(file, reset);
        pages.value = [...result.pages];
        isLoaded.value = true;
        await nextTick();
        for (let i = result.startId; i < result.endId; i++) {
          const page = pages.value.find((p) => p.id === i);
          if (page) await renderPage(pages.value.indexOf(page));
        }
      } catch (err) {
        showToast("Error loading PDF");
      }
    };

    // Page rendering
    const renderAllPages = async () => {
      for (let i = 0; i < pages.value.length; i++) await renderPage(i);
    };

    const renderPage = async (index) => {
      const page = pages.value[index];
      if (!page) return;
      let canvas = pageCanvasRefs.value[page.id];
      let attempts = 0;
      while (!canvas && attempts < 20) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        canvas = pageCanvasRefs.value[page.id];
        attempts++;
      }
      if (!canvas) return;
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
      if (el) pageCanvasRefs.value[pageId] = el;
    };

    // Preview modal
    const previewPage = async (index) => {
      closeContextMenu();
      previewModal.value.pageIndex = index;
      previewModal.value.show = true;
      await nextTick();
      await renderPreview();
    };

    const renderPreview = async () => {
      const { pageIndex } = previewModal.value;
      const canvas = previewCanvasRef.value;
      if (pageIndex >= 0 && canvas) {
        try {
          await organizer.renderPage(pageIndex, canvas, previewModal.value.scale);
        } catch (e) {
          console.error("Error rendering preview:", e);
        }
      }
    };

    const closePreview = () => {
      previewModal.value.show = false;
      previewModal.value.pageIndex = -1;
      zoomEnabled.value = false;
      showZoomLens.value = false;
    };

    const navigatePreview = async (direction) => {
      const newIndex = previewModal.value.pageIndex + direction;
      if (newIndex >= 0 && newIndex < pages.value.length) {
        previewModal.value.pageIndex = newIndex;
        await nextTick();
        await renderPreview();
      }
    };

    const nextPreviewPage = () => navigatePreview(1);
    const prevPreviewPage = () => navigatePreview(-1);

    const toggleZoom = () => {
      zoomEnabled.value = !zoomEnabled.value;
      if (!zoomEnabled.value) showZoomLens.value = false;
    };

    const handleZoomMove = (event) => {
      const canvas = previewCanvasRef.value;
      if (!canvas) return;

      const container = event.currentTarget;
      const rect = container.getBoundingClientRect();
      const lensSize = 100;
      const zoomLevel = 2;
      const zoomResultSize = 200;
      const offset = 20;

      let x = Math.max(
        lensSize / 2,
        Math.min(event.clientX - rect.left, rect.width - lensSize / 2),
      );
      let y = Math.max(
        lensSize / 2,
        Math.min(event.clientY - rect.top, rect.height - lensSize / 2),
      );

      zoomLensStyle.value = {
        left: `${x - lensSize / 2}px`,
        top: `${y - lensSize / 2}px`,
        width: `${lensSize}px`,
        height: `${lensSize}px`,
      };

      let zoomResultX = event.clientX + offset;
      let zoomResultY = event.clientY - zoomResultSize - offset;
      if (zoomResultX + zoomResultSize > window.innerWidth) {
        zoomResultX = event.clientX - zoomResultSize - offset;
      }
      if (zoomResultY < 0) zoomResultY = event.clientY + offset;

      const bgPosX = -(x * zoomLevel - zoomResultSize / 2);
      const bgPosY = -(y * zoomLevel - zoomResultSize / 2);

      zoomResultStyle.value = {
        left: `${zoomResultX}px`,
        top: `${zoomResultY}px`,
        backgroundImage: `url(${canvas.toDataURL()})`,
        backgroundSize: `${rect.width * zoomLevel}px ${rect.height * zoomLevel}px`,
        backgroundPosition: `${bgPosX}px ${bgPosY}px`,
        backgroundRepeat: "no-repeat",
      };
    };

    const previewActions = {
      toggleZoom: () => toggleZoom(),
      deletePage: () => {
        deletePage(previewModal.value.pageIndex);
        nextPreviewPage();
      },
      rotatePage: () => {
        rotatePage(previewModal.value.pageIndex, 90);
        renderPreview();
      },
    };

    const handlePreviewAction = (actionType) => {
      const action = previewActions[actionType];
      if (action) action();
    };

    // Drag and drop
    const handleDragStart = (index) => {
      draggedIndex.value = index;
      const draggedPage = pages.value[index];
      if (draggedPage.selected) {
        draggedIndices.value = getSelectedIndices();
      } else {
        draggedIndices.value = [];
      }
    };

    const setupAutoScroll = (mouseY, rect) => {
      const scrollThreshold = 100;
      const scrollSpeed = 10;
      const container = pdfViewContainer.value;

      if (mouseY - rect.top < scrollThreshold) {
        const scroll = () => {
          container.scrollTop -= scrollSpeed;
          if (container.scrollTop > 0) autoScrollInterval.value = requestAnimationFrame(scroll);
        };
        autoScrollInterval.value = requestAnimationFrame(scroll);
      } else if (rect.bottom - mouseY < scrollThreshold) {
        const scroll = () => {
          container.scrollTop += scrollSpeed;
          if (container.scrollTop < container.scrollHeight - container.clientHeight) {
            autoScrollInterval.value = requestAnimationFrame(scroll);
          }
        };
        autoScrollInterval.value = requestAnimationFrame(scroll);
      }
    };

    const handleDragOver = (event) => {
      scrollToEditor();
      if (draggedIndex.value === null) return;
      const container = pdfViewContainer.value;
      if (!container) return;

      clearAutoScroll();
      const rect = container.getBoundingClientRect();
      setupAutoScroll(event.clientY, rect);
    };

    const handleDragEnd = () => clearAutoScroll();

    const handlePageDrop = (dropIndex) => {
      if (draggedIndex.value === null) return;

      if (draggedIndices.value.length > 1) {
        organizer.moveMultiplePages(draggedIndices.value, dropIndex);
      } else {
        organizer.movePage(draggedIndex.value, dropIndex);
      }

      pages.value = [...organizer.getPages()];
      draggedIndex.value = null;
      draggedIndices.value = [];
      pages.value.forEach((page) => (page.selected = false));
      updateSelectionCount();
      clearAutoScroll();
    };

    const showContextMenu = (event, page, index) => {
      contextMenu.value = {
        show: true,
        x: event.clientX,
        y: event.clientY,
        page,
        pageIndex: index,
      };
    };

    const scrollToEditor = () => {
      const pdfEditor = document.querySelector(".pdf-organizer");
      if (pdfEditor) {
        pdfEditor.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    };

    // Split dialog
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

    const downloadPDFBytes = async (pdfBytes, filename) => {
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      await nextTick();
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    const handleSplit = async (splitData) => {
      try {
        let result;
        if (splitData.mode === "at-page") {
          result = await organizer.splitAtPage(splitData.pageNumber);
          downloadPDFBytes(result[0], "split-part-1.pdf");
          downloadPDFBytes(result[1], "split-part-2.pdf");
        } else if (splitData.mode === "range") {
          result = await organizer.extractPageRange(splitData.fromPage, splitData.toPage);
          downloadPDFBytes(result, `splited_pdf.pdf`);
        } else if (splitData.mode === "every") {
          result = await organizer.splitEveryNPages(splitData.everyNPages);
          result.forEach((pdf, i) => downloadPDFBytes(pdf, `split-part-${i + 1}.pdf`));
        }
      } catch (err) {
        console.error("Error splitting PDF:", err);
        showToast("Error splitting PDF", "error");
      }
    };

    // Merge dialog
    const openMergeDialog = async () => {
      if (isLoaded.value && pages.value.length > 0) {
        try {
          const pdfBytes = await organizer.exportPDF();
          const currentFile = { name: "current.pdf", data: pdfBytes };
          initialFile.value = [currentFile];
        } catch (err) {
          console.error("Error exporting current PDF:", err);
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

    // Export functions
    const downloadPDF = async () => {
      try {
        const pdfBytes = await organizer.exportPDF();
        await downloadPDFBytes(pdfBytes, "organized_pdf.pdf");
      } catch (err) {
        console.error("Error downloading PDF:", err);
      }
    };

    const exportSelected = async () => {
      const selectedIndices = getSelectedIndices();
      if (selectedIndices.length === 0) {
        showToast("No pages selected", "warning");
        return;
      }
      try {
        const pdfBytes = await organizer.exportPDF(selectedIndices);
        const filename = `selected_pages_${selectedIndices.length}.pdf`;
        downloadPDFBytes(pdfBytes, filename);
      } catch (err) {
        console.error("Error exporting selected pages:", err);
      }
    };

    const handleExport = async (value) => {
      showExportMenu.value = false;
      if (value === "all") {
        await downloadPDF();
      } else if (value === "selected") {
        await exportSelected();
      }
    };

    const handleGlobalClick = () => {
      closeContextMenu();
      showActionMenu.value = false;
      showExportMenu.value = false;
    };

    const sendToPDFEditor = async () => {
      try {
        const pdfBytes = await organizer.exportPDF();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const reader = new FileReader();
        reader.onload = (e) => {
          const arrayBuffer = e.target.result;
          window.parent.postMessage(
            {
              type: "loadPDFFromOrganizer",
              pdfData: arrayBuffer,
              fileName: "organized.pdf",
            },
            "*",
          );
        };
        reader.readAsArrayBuffer(blob);
      } catch (err) {
        console.error("Error sending to PDF Editor:", err);
        showToast("Error sending to PDF Editor", "error");
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
      colorPage,
      pagesPerRow,
      selectedTool,
      selectedCount,
      allSelected,
      action,
      swapSourceIndex,
      showExportMenu,
      showActionMenu,
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
      showZoomLens,
      zoomLensStyle,
      zoomResultStyle,
      handleZoomMove,
      zoomEnabled,
      toggleZoom,
      handlePreviewAction,
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
      handleExport,
      sendToPDFEditor,
    };
  },
};
</script>

<style>
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
  @apply relative bg-white border-2 rounded-lg p-4
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
  @apply absolute top-2 right-2 text-white
         px-2 py-1 rounded text-sm font-semibold;
}

.current-number {
  @apply absolute bottom-2 left-1/2 -translate-x-1/2 text-gray-700
         rounded text-xs font-semibold;
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
  cursor:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'/%3E%3C/svg%3E")
      12 12,
    auto;
}

.organize-body[data-tool="rotate"] .page-card {
  cursor:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z'/%3E%3C/svg%3E")
      12 12,
    auto;
}

.organize-body[data-tool="duplicate"] .page-card {
  cursor:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z'/%3E%3C/svg%3E")
      12 12,
    auto;
}

.organize-body[data-tool="add-blank"] .page-card {
  cursor:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'/%3E%3C/svg%3E")
      12 12,
    auto;
}

.organize-body[data-tool="swap"] .page-card {
  cursor:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%236366f1' d='M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z'/%3E%3C/svg%3E")
      12 12,
    auto;
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
  @apply relative shadow-2xl max-h-[95vh] max-w-[95vw] rounded-sm overflow-hidden flex flex-col items-center;
}

.preview-image-container {
  @apply relative;
}

.preview-canvas {
  @apply block object-contain max-h-[85vh] w-auto;
}

.zoom-lens {
  @apply absolute border-2 border-white;
  cursor: none;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  z-index: 10;
}

.zoom-result {
  @apply fixed border-2 border-white;
  width: 200px;
  height: 200px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  z-index: 10004;
  border-radius: 4px;
}

.preview-controls {
  @apply bg-white text-black px-4 py-2 mt-2 text-center text-sm font-medium
         flex items-center justify-center gap-2;
}

.preview-page-info {
  @apply text-sm font-medium min-w-[60px] text-center;
}

.preview-control-btn {
  @apply bg-transparent text-black w-8 h-8 rounded flex items-center justify-center
         cursor-pointer transition-all border-none hover:bg-gray-100;
}

.preview-control-btn:disabled {
  @apply opacity-30 cursor-not-allowed hover:bg-transparent;
}

.preview-control-btn.active {
  @apply bg-gray-200 hover:bg-gray-300;
}

.preview-divider {
  @apply w-px h-6 bg-gray-600 mx-1;
}

.preview-nav-btn {
  @apply bg-white/10 text-white rounded-full w-12 h-12 flex items-center justify-center
         cursor-pointer transition-all border-none mx-4 hover:bg-white/20;
}

.preview-nav-btn:disabled {
  @apply opacity-30 cursor-not-allowed hover:bg-white/10;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
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
