<template>
  <div
    v-if="show"
    class="image-dialog-overlay"
    @click="handleOverlayClick"
    @dragenter.stop
    @dragover.stop
    @drop.stop
  >
    <div class="organize-dialog" @click.stop>
      <div class="image-dialog-header">
        <h3>Organize PDF Pages</h3>
        <button @click="closeDialog" class="dialog-close-btn">&times;</button>
      </div>

      <div class="organize-dialog-content">
        <!-- Upload Section (shown when no PDF loaded) -->
        <div v-if="!pdfDocument" class="image-upload-section">
          <div
            class="upload-area"
            @click="triggerFileInput"
            @dragover.prevent
            @drop.prevent="handleDrop"
          >
            <input
              type="file"
              ref="fileInput"
              accept="application/pdf"
              @change="handleFileUpload"
              style="display: none"
            />
            <i class="fa-solid fa-cloud-upload-alt upload-icon"></i>
            <p>Click to upload or drag and drop a PDF file</p>
            <p class="upload-hint">Select a PDF to organize its pages</p>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="loading" class="loading-container">
          <div class="spinner"></div>
          <p>Loading PDF pages...</p>
        </div>

        <!-- Error message -->
        <div v-if="error" class="merge-error">
          <i class="fa-solid fa-exclamation-circle"></i>
          <p>{{ error }}</p>
        </div>

        <!-- Pages Grid (shown when PDF is loaded) -->
        <div v-if="pdfDocument && pages.length > 0 && !loading" class="pages-section">
          <div class="pages-header">
            <h4>{{ pages.length }} Pages</h4>
            <div class="pages-actions">
              <button @click="selectAllPages" class="btn-icon" title="Select All">
                <i class="fa-solid fa-check-double"></i>
              </button>
              <button
                @click="deleteSelectedPages"
                :disabled="selectedPages.size === 0"
                class="btn-icon btn-danger"
                title="Delete Selected"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
              <button @click="loadNewPDF" class="btn-icon" title="Load New PDF">
                <i class="fa-solid fa-file-arrow-up"></i>
              </button>
            </div>
          </div>

          <p class="organize-hint">
            <i class="fa-solid fa-info-circle"></i>
            Drag pages to reorder • Click to select • Right-click for options
          </p>

          <div class="pages-grid">
            <template v-for="(page, index) in pages" :key="page.id">
              <div
                class="page-item"
                :class="{ selected: selectedPages.has(page.id) }"
                draggable="true"
                @dragstart="handleDragStart(index)"
                @dragover.prevent
                @drop.prevent="handleDropReorder(index)"
                @click="togglePageSelection(page.id)"
                @contextmenu.prevent="showPageContextMenu($event, page, index)"
              >
                <div class="page-thumbnail">
                  <canvas
                    :ref="(el) => setPageCanvas(page.id, el)"
                    class="page-canvas"
                    :style="{ transform: `rotate(${page.rotation}deg)` }"
                  ></canvas>
                  <div v-if="selectedPages.has(page.id)" class="page-selected-indicator">
                    <i class="fa-solid fa-check-circle"></i>
                  </div>
                </div>
                <div class="page-info">
                  <span class="page-number">Page {{ index + 1 }}</span>
                  <div class="page-actions">
                    <button
                      @click.stop="rotatePage(index, 90)"
                      class="btn-page-action"
                      title="Rotate"
                    >
                      <i class="fa-solid fa-rotate-right"></i>
                    </button>
                    <button
                      @click.stop="duplicatePage(index)"
                      class="btn-page-action"
                      title="Duplicate"
                    >
                      <i class="fa-solid fa-copy"></i>
                    </button>
                    <button
                      @click="addBlankPage(index + 1)"
                      class="btn-page-action"
                      title="Add Blank Page"
                    >
                      <i class="fa-solid fa-plus"></i>
                    </button>
                    <button
                      @click.stop="deletePage(index)"
                      class="btn-page-action btn-delete"
                      title="Delete"
                    >
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Progress -->
        <div v-if="progress > 0" class="progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <p>Processing PDF... {{ progress }}%</p>
        </div>
      </div>

      <div class="image-dialog-footer">
        <button @click="closeDialog" class="btn-secondary" :disabled="processing">Cancel</button>
        <button
          v-if="pdfDocument && pages.length > 0"
          @click="applyChanges"
          :disabled="processing || pages.length === 0"
          class="btn-primary"
        >
          <i class="fa-solid fa-check"></i>
          Apply Changes ({{ pages.length }} pages)
        </button>
      </div>
    </div>

    <!-- Context Menu -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="rotatePage(contextMenu.pageIndex, 90)">
        <i class="fa-solid fa-rotate-right"></i>
        Rotate
      </div>
      <div class="context-menu-item" @click="duplicatePage(contextMenu.pageIndex)">
        <i class="fa-solid fa-copy"></i>
        Duplicate Page
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item danger" @click="deletePage(contextMenu.pageIndex)">
        <i class="fa-solid fa-trash"></i>
        Delete Page
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted, shallowRef, toRaw } from "vue";

export default {
  name: "OrganizeDialog",
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    initialFile: {
      type: Array,
      default: () => [],
    },
    showToast: {
      type: Function,
      default: null,
    },
  },
  emits: ["close", "organize"],
  setup(props, { emit }) {
    const pdfDocument = shallowRef(null);
    const pages = ref([]);
    const fileInput = ref(null);
    const error = ref("");
    const loading = ref(false);
    const processing = ref(false);
    const progress = ref(0);
    const draggedIndex = ref(null);
    const selectedPages = ref(new Set());
    const pageCanvasRefs = ref({});
    const contextMenu = ref({
      show: false,
      x: 0,
      y: 0,
      page: null,
      pageIndex: -1,
    });

    let nextPageId = 0;

    // Set error message with auto-clear
    const setError = (msg) => {
      error.value = msg;
      if (msg) {
        setTimeout(() => {
          error.value = "";
        }, 3000);
      }
    };

    // Reset state when dialog is opened/closed
    watch(
      () => props.show,
      async (newValue) => {
        if (newValue) {
          resetState();
          if (props.initialFile.length > 0) {
            await loadPDFFile(props.initialFile[0]);
          }
        } else {
          closeContextMenu();
        }
      },
    );

    const resetState = () => {
      pdfDocument.value = null;
      pages.value = [];
      error.value = "";
      loading.value = false;
      processing.value = false;
      progress.value = 0;
      draggedIndex.value = null;
      selectedPages.value = new Set();
      pageCanvasRefs.value = {};
      nextPageId = 0;
    };

    const handleOverlayClick = () => {
      if (!loading.value && !processing.value) {
        closeDialog();
      }
    };

    const closeDialog = () => {
      if (!loading.value && !processing.value) {
        emit("close");
      }
    };

    const triggerFileInput = () => {
      fileInput.value?.click();
    };

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        loadPDFFile(file);
      }
      event.target.value = "";
    };

    const handleDrop = (event) => {
      const file = event.dataTransfer.files[0];
      if (!file) return;

      if (file.type !== "application/pdf") {
        setError("Please select a PDF file.");
        return;
      }

      loadPDFFile(file);
    };

    const loadPDFFile = async (file) => {
      if (file.type !== "application/pdf") {
        setError("Please select a PDF file.");
        return;
      }

      loading.value = true;
      error.value = "";

      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        pdfDocument.value = pdf;
        pages.value = [];
        nextPageId = 0;

        // Load all pages
        for (let i = 1; i <= pdf.numPages; i++) {
          pages.value.push({
            id: nextPageId++,
            pageNumber: i,
            rotation: 0,
            originalPageNumber: i,
          });
        }

        loading.value = false;

        // Render thumbnails
        await nextTick();
        await renderAllPages();
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF. Please make sure the file is a valid PDF document.");
        loading.value = false;
      }
    };

    const renderAllPages = async () => {
      for (let i = 0; i < pages.value.length; i++) {
        await renderPage(i);
      }
    };

    const renderPage = async (index) => {
      const page = pages.value[index];
      const canvas = pageCanvasRefs.value[page.id];

      if (!canvas || !pdfDocument.value) return;

      try {
        const pdfInstance = toRaw(pdfDocument.value);
        const pdfPage = await pdfInstance.getPage(page.pageNumber);
        const viewport = pdfPage.getViewport({ scale: 0.5, rotation: page.rotation });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext("2d");
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await pdfPage.render(renderContext).promise;
      } catch (err) {
        console.error("Error rendering page:", err);
      }
    };

    const setPageCanvas = (pageId, el) => {
      if (el) {
        pageCanvasRefs.value[pageId] = el;
      }
    };

    const rotatePage = async (index, degrees) => {
      pages.value[index].rotation = (pages.value[index].rotation + degrees) % 360;
      if (pages.value[index].rotation < 0) {
        pages.value[index].rotation += 360;
      }
      await nextTick();
      await renderPage(index);
      closeContextMenu();
    };

    const duplicatePage = async (index) => {
      const originalPage = pages.value[index];
      const newPage = {
        id: nextPageId++,
        pageNumber: originalPage.pageNumber,
        rotation: originalPage.rotation,
        originalPageNumber: originalPage.originalPageNumber,
      };
      pages.value.splice(index + 1, 0, newPage);
      await nextTick();
      await renderPage(index + 1);
      closeContextMenu();
    };

    const addBlankPage = async (index) => {
      const blankPage = {
        id: nextPageId++,
        pageNumber: null, // null indicates a blank page
        rotation: 0,
        originalPageNumber: null,
        isBlank: true,
      };
      pages.value.splice(index, 0, blankPage);
      await nextTick();
      // Render blank page
      const canvas = pageCanvasRefs.value[blankPage.id];
      if (canvas) {
        canvas.width = 612;
        canvas.height = 792;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    const deletePage = (index) => {
      if (pages.value.length <= 1) {
        setError("Cannot delete the last page.");
        closeContextMenu();
        return;
      }
      const pageId = pages.value[index].id;
      selectedPages.value.delete(pageId);
      pages.value.splice(index, 1);
      closeContextMenu();
    };

    const deleteSelectedPages = () => {
      if (selectedPages.value.size === 0) return;

      if (pages.value.length - selectedPages.value.size < 1) {
        setError("Cannot delete all pages. At least one page must remain.");
        return;
      }

      pages.value = pages.value.filter((page) => !selectedPages.value.has(page.id));
      selectedPages.value.clear();
    };

    const togglePageSelection = (pageId) => {
      if (selectedPages.value.has(pageId)) {
        selectedPages.value.delete(pageId);
      } else {
        selectedPages.value.add(pageId);
      }
      // Force reactivity update
      selectedPages.value = new Set(selectedPages.value);
    };

    const selectAllPages = () => {
      selectedPages.value = new Set(pages.value.map((p) => p.id));
    };

    const handleDragStart = (index) => {
      draggedIndex.value = index;
    };

    const handleDropReorder = async (dropIndex) => {
      if (draggedIndex.value === null) return;
      const draggedPage = pages.value[draggedIndex.value];
      pages.value.splice(draggedIndex.value, 1);
      pages.value.splice(dropIndex, 0, draggedPage);
      draggedIndex.value = null;
    };

    const showPageContextMenu = (event, page, index) => {
      contextMenu.value = {
        show: true,
        x: event.clientX,
        y: event.clientY,
        page: page,
        pageIndex: index,
      };
    };

    const closeContextMenu = () => {
      contextMenu.value.show = false;
    };

    const loadNewPDF = () => {
      resetState();
      nextTick(() => {
        triggerFileInput();
      });
    };

    const applyChanges = async () => {
      if (pages.value.length === 0) {
        setError("No pages to process.");
        return;
      }

      processing.value = true;
      progress.value = 0;

      try {
        const { PDFDocument, degrees } = window.PDFLib;

        // Load the original PDF
        const arrayBuffer = await pdfDocument.value.getData();
        const srcDoc = await PDFDocument.load(arrayBuffer);

        // Create a new PDF document
        const newPdf = await PDFDocument.create();
        progress.value = 10;

        const totalPages = pages.value.length;
        const progressPerPage = 80 / totalPages;

        // Process each page
        for (let i = 0; i < totalPages; i++) {
          const pageInfo = pages.value[i];

          if (pageInfo.isBlank) {
            // Add a blank page
            const blankPage = newPdf.addPage([612, 792]); // A4 size at 72 DPI
            // Apply rotation if needed
            if (pageInfo.rotation !== 0) {
              blankPage.setRotation(degrees(pageInfo.rotation));
            }
          } else {
            // Copy the page from source document
            const [copiedPage] = await newPdf.copyPages(srcDoc, [pageInfo.pageNumber - 1]);

            // Apply rotation if needed
            if (pageInfo.rotation !== 0) {
              const currentRotation = copiedPage.getRotation().angle;
              copiedPage.setRotation(degrees(currentRotation + pageInfo.rotation));
            }

            newPdf.addPage(copiedPage);
          }

          progress.value = 10 + Math.round((i + 1) * progressPerPage);
        }

        progress.value = 90;

        // Save the new PDF
        const pdfBytes = await newPdf.save();
        progress.value = 100;

        // Create blob and emit
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        emit("organize", blob);

        if (props.showToast) {
          props.showToast("PDF organized successfully!", "success");
        }

        processing.value = false;
        progress.value = 0;
        closeDialog();
      } catch (err) {
        console.error("Error organizing PDF:", err);
        setError("Failed to organize PDF. Please try again.");
        processing.value = false;
        progress.value = 0;
      }
    };

    // Close context menu when clicking anywhere
    const handleGlobalClick = () => {
      closeContextMenu();
    };

    onMounted(() => {
      document.addEventListener("click", handleGlobalClick);
    });

    onUnmounted(() => {
      document.removeEventListener("click", handleGlobalClick);
    });

    return {
      pdfDocument,
      pages,
      fileInput,
      error,
      loading,
      processing,
      progress,
      selectedPages,
      contextMenu,
      handleOverlayClick,
      closeDialog,
      triggerFileInput,
      handleFileUpload,
      handleDrop,
      rotatePage,
      duplicatePage,
      addBlankPage,
      deletePage,
      deleteSelectedPages,
      togglePageSelection,
      selectAllPages,
      handleDragStart,
      handleDropReorder,
      showPageContextMenu,
      loadNewPDF,
      applyChanges,
      setPageCanvas,
    };
  },
};
</script>

<style scoped>
@reference "../css/tailwind.css";

.organize-dialog {
  @apply bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col;
}

.organize-dialog-content {
  @apply p-6 overflow-y-auto flex-1;
}

.loading-container {
  @apply flex flex-col items-center justify-center py-12;
}

.spinner {
  @apply w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4;
}

.pages-section {
  @apply space-y-4;
}

.pages-header {
  @apply flex items-center justify-between mb-4;
}

.pages-header h4 {
  @apply text-lg font-semibold text-gray-700;
}

.pages-actions {
  @apply flex gap-2;
}

.btn-icon {
  @apply px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors flex items-center gap-2 text-sm;
}

.btn-icon:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.btn-icon.btn-danger {
  @apply border-red-300 text-red-600 hover:bg-red-50;
}

.organize-hint {
  @apply text-sm text-gray-500 flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200;
}

.pages-grid {
  @apply grid grid-cols-4 gap-4;
}

.add-page-divider {
  @apply flex items-center justify-center;
  grid-column: span 1;
}

.btn-add-page:hover {
  @apply scale-110;
}

.page-item {
  @apply border-2 border-gray-200 rounded-lg p-3 cursor-move hover:border-blue-400 transition-all bg-white;
}

.page-item.selected {
  @apply border-blue-500 bg-blue-50;
}

.page-thumbnail {
  @apply relative mb-2 bg-gray-100 rounded overflow-hidden flex items-center justify-center;
  aspect-ratio: 1 / 1.414;
}

.page-canvas {
  @apply max-w-full h-9 object-contain;
}

.page-selected-indicator {
  @apply absolute top-2 right-2 text-blue-600 text-2xl;
}

.page-info {
  @apply flex items-center justify-between;
}

.page-number {
  @apply text-sm font-medium text-gray-700;
}

.page-actions {
  @apply flex gap-1;
}

.btn-page-action {
  @apply p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-600 text-xs;
}

.context-menu {
  @apply fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 min-w-[180px];
}

.context-menu-item {
  @apply px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm;
}

.context-menu-item.danger {
  @apply text-red-600 hover:bg-red-50;
}

.context-menu-divider {
  @apply h-px bg-gray-200 my-1;
}

.progress {
  @apply mt-4 space-y-2;
}

.progress-bar {
  @apply w-full bg-gray-200 rounded-full h-3 overflow-hidden;
}

.progress-fill {
  @apply h-full bg-blue-600 transition-all duration-300 rounded-full;
}

.progress p {
  @apply text-sm text-gray-600 text-center;
}

@media (max-width: 1024px) {
  .pages-grid {
    @apply grid-cols-3;
  }
}

@media (max-width: 768px) {
  .pages-grid {
    @apply grid-cols-2;
  }
}

@media (max-width: 480px) {
  .pages-grid {
    @apply grid-cols-1;
  }
}
</style>
