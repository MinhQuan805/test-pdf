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
          <button @click="clickAppendFileInput" class="btn" :disabled="processing">
            <i class="fa-solid fa-file-circle-plus mr-2"></i>
            Add file
          </button>
          <div class="option-element">
            <button @click="reversePages" class="btn" title="Reverse page order">
              <i class="fa-solid fa-sort mr-2"></i>
              Sort
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
          <div v-if="selectedCount > 0">
            <button @click="applyActionToSelected" class="btn" title="Apply action to selected pages">
              <i class="fa-solid fa-bolt"></i>
              Apply to Selected
            </button>
          </div>
          <div v-if="selectedCount > 0">
            <select v-model="action" class="btn btn-xs" title="Action">
              <option value="Delete">Delete</option>
              <option value="Rotate">Rotate</option>
              <option value="Duplicate">Duplicate</option>
            </select>
          </div>
          <div>
            <button @click="toggleSelectAll" class="btn">
              <i class="fa-solid fa-check-double"></i>
              {{ allSelected ? 'Deselect All' : 'Select All' }}
            </button>
          </div>
          <div v-if="selectedCount > 0">
            <span class="badge">{{ selectedCount }} selected</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!isLoaded" class="pdf-body">
      <div ref="pdfViewContainer" id="body-pdf-view" class="body-pdf-view">
        <!-- Placeholder content for when no PDF is loaded -->
        <div class="pdf-placeholder">
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
      </div>
    </div>

    <!-- Main Content Area -->
    <div v-if="isLoaded" class="organize-body p-8" :data-tool="selectedTool">
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
        </div>
      </div>
      <!-- Pages Grid -->
      <div class="organize-container">
        <div class="pages-grid" :style="{ gridTemplateColumns: `repeat(${pagesPerRow}, 1fr)` }">
          <div
            v-for="(page, index) in pages"
            :key="page.id"
            :class="[
              'page-card',
              colorBorder[(page.fileIndex || 0) % colorBorder.length],
              { selected: page.selected },
            ]"
            draggable="true"
            @click="handlePageClick(index, $event)"
            @dragstart="handleDragStart(index)"
            @dragover.prevent
            @drop.prevent="handlePageDrop(index)"
            @contextmenu.prevent="showContextMenu($event, page, index)"
          >
            <div class="page-thumbnail">
              <canvas :ref="(el) => setPageCanvas(page.id, el)" class="page-canvas"></canvas>
              <div class="page-number-badge">{{ index + 1 }}</div>
              <div v-if="page.selected" class="selection-indicator">
                <i class="fa-solid fa-check"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Processing State -->
      <div v-if="processing" class="processing-overlay">
        <div class="processing-content">
          <div class="spinner large"></div>
          <p class="text-lg font-medium text-gray-700 mt-4">Processing PDF...</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <p class="text-gray-600 mt-2">{{ progress }}%</p>
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
      <button @click="rotatePage(contextMenu.pageIndex, 90)" class="context-menu-item">
        <i class="fa-solid fa-rotate-right"></i>
        Rotate Clockwise
      </button>
      <!-- <button @click="rotatePage(contextMenu.pageIndex, -90)" class="context-menu-item">
        <i class="fa-solid fa-rotate-left"></i>
        Rotate Counter-clockwise
      </button> -->
      <div class="context-menu-divider"></div>
      <button @click="duplicatePage(contextMenu.pageIndex)" class="context-menu-item">
        <i class="fa-solid fa-copy"></i>
        Duplicate Page
      </button>
      <button @click="addBlankPage(contextMenu.pageIndex + 1)" class="context-menu-item">
        <i class="fa-solid fa-plus"></i>
        Add Blank Page
      </button>
      <div class="context-menu-divider"></div>
      <button
        @click="deletePage(contextMenu.pageIndex)"
        class="context-menu-item danger"
        :disabled="pages.length === 1"
      >
        <i class="fa-solid fa-trash"></i>
        Delete Page
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
</template>

<script lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from "vue";
import { PDFOrganizer } from "./js/PDFOrganizer.js";

export default {
  name: "OrganizerApp",
  setup() {
    const fileInput = ref(null);
    const fileAppend = ref(null);
    const organizer = new PDFOrganizer();
    const pages = ref([]);
    const processing = ref(false);
    const progress = ref(0);
    const isLoaded = ref(false);
    const draggedIndex = ref(null);
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

    const selectedTool = ref('select');
    const selectedCount = ref(0);
    const allSelected = ref(false);
    const action = ref('Delete');

    // Tool selection
    const selectTool = (tool) => {
      selectedTool.value = tool;
    };

    // Page selection handlers
    const handlePageClick = (index, event) => {
      const page = pages.value[index];

      if (selectedTool.value === 'select') {
        // Toggle selection
        page.selected = !page.selected;
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

    const applyActionToSelected = async () => {
      const selectedIndices = [];
      pages.value.forEach((page, index) => {
        if (page.selected) selectedIndices.push(index);
      });

      if (selectedIndices.length === 0) return;

      if (action.value === 'Delete') {
        // Delete from highest index to lowest
        for (let i = selectedIndices.length - 1; i >= 0; i--) {
          organizer.deletePage(selectedIndices[i]);
        }
        pages.value = [...organizer.getPages()];
      } else if (action.value === 'Rotate') {
        // Rotate all selected pages
        for (const index of selectedIndices) {
          organizer.rotatePage(index, 90);
        }
        pages.value = [...organizer.getPages()];
        await nextTick();
        for (const index of selectedIndices) {
          await renderPage(index);
        }
      } else if (action.value === 'Duplicate') {
        // Duplicate from highest index to lowest to maintain positions
        for (let i = selectedIndices.length - 1; i >= 0; i--) {
          organizer.duplicatePage(selectedIndices[i]);
        }
        pages.value = [...organizer.getPages()];
        await nextTick();
        await renderAllPages();
      }

      updateSelectionCount();
    };

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

    // File handling
    const clickFileInput = () => {
      fileInput.value?.click();
    };

    const handleFileUpload = () => {
      const file = fileInput.value.files[0];
      if (file) loadPDFFile(file);
    };

    // Append PDF logic
    const clickAppendFileInput = () => {
      fileAppend.value?.click();
    };

    const handleAppendFile = () => {
      const file = fileAppend.value.files[0];
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

    // Drag and drop
    const handleDragStart = (index) => {
      draggedIndex.value = index;
    };

    const handlePageDrop = (dropIndex) => {
      if (draggedIndex.value === null) return;

      organizer.movePage(draggedIndex.value, dropIndex);
      pages.value = [...organizer.getPages()];
      draggedIndex.value = null;
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
      processing.value = true;
      progress.value = 0;

      try {
        const pdfBytes = await organizer.exportPDF((p) => {
          progress.value = p;
        });

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

        processing.value = false;
        progress.value = 0;
      } catch (err) {
        console.error("Error organizing PDF:", err);
        processing.value = false;
        progress.value = 0;
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
      processing,
      progress,
      pages,
      contextMenu,
      toast,
      colorBorder,
      pagesPerRow,
      selectedTool,
      selectedCount,
      allSelected,
      action,
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
      handlePageDrop,
      showContextMenu,
      downloadPDF,
      setPageCanvas,
      showToast,
      hideToast,
      selectTool,
      handlePageClick,
      toggleSelectAll,
      applyActionToSelected,
    };
  },
};
</script>

<style scoped>
@reference "./css/tailwind.css";

.pdf-organizer {
  @apply bg-transparent;
}

.organize-body {
  @apply relative w-full p-4 pt-0;
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

.processing-overlay {
  @apply fixed inset-0 bg-black/50 flex items-center justify-center z-[9999];
}

.processing-content {
  @apply bg-white p-8 rounded-lg text-center min-w-[300px];
}

.progress-bar {
  @apply w-full h-2 bg-gray-200 rounded overflow-hidden mt-4;
}

.progress-fill {
  @apply h-full bg-gradient-to-r from-blue-500 to-blue-600
         transition-all duration-300;
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


.tools-section {
  @apply flex flex-col gap-2;
}

.body-tool {
  @apply w-12 h-12 flex items-center justify-center
         rounded-lg cursor-pointer transition-all
         hover:bg-blue-50 text-gray-700
         border-2 border-transparent;
}

.body-tool.active {
  @apply bg-blue-500 text-white border-blue-600;
}

.body-tool i {
  @apply text-xl;
}

.page-card.selected {
  @apply ring-4 ring-blue-500 shadow-lg;
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
  @apply cursor-not-allowed;
}

.organize-body[data-tool="rotate"] .page-card {
  @apply cursor-alias;
}

.organize-body[data-tool="duplicate"] .page-card {
  @apply cursor-copy;
}

.organize-body[data-tool="add-blank"] .page-card {
  @apply cursor-cell;
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
