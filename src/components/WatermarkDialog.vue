<template>
  <div v-if="show">
    <BaseDialog :show="show" title="Add watermark" @close="closeDialog">
      <div class="watermark-content">
        <!-- Text Input -->
        <div class="form-group">
          <label class="form-label">Text</label>
          <div class="input-wrapper">
            <textarea
              v-model="watermarkData.text"
              class="form-input"
              placeholder="Enter watermark text"
              rows="3"
            ></textarea>
            <button v-if="watermarkData.text" @click="clearText" class="clear-btn" style="top: 10px; transform: none;">×</button>
          </div>
        </div>
                <!-- Apply to -->
        <div class="form-group">
          <label class="form-label">Apply to</label>
          <div class="radio-group">
            <label class="radio-label">
              <input v-model="watermarkData.applyTo" type="radio" value="all" class="radio-input" />
              <span class="radio-text">All</span>
            </label>
            <label class="radio-label">
              <input
                v-model="watermarkData.applyTo"
                type="radio"
                value="range"
                class="radio-input"
              />
              <span class="radio-text">Page Range</span>
            </label>
          </div>
          <input
            v-if="watermarkData.applyTo === 'range'"
            v-model="watermarkData.pageRange"
            type="text"
            class="form-input mt-2"
            placeholder="e.g., 1-3, 5, 7-9"
          />
        </div>
        <!-- Font Styles -->
        <div class="form-group">
          <label class="form-label">Font Style & Alignment</label>
          <div class="font-style-buttons">
            <button
              :class="['font-style-btn', { active: watermarkData.bold }]"
              @click="watermarkData.bold = !watermarkData.bold"
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              :class="['font-style-btn', { active: watermarkData.italic }]"
              @click="watermarkData.italic = !watermarkData.italic"
              title="Italic"
            >
              <em>I</em>
            </button>
            <button
              :class="['font-style-btn', { active: watermarkData.underline }]"
              @click="watermarkData.underline = !watermarkData.underline"
              title="Underline"
            >
              <u>U</u>
            </button>

            <div class="w-px h-12 bg-gray-300 mx-1"></div>

            <label class="font-style-btn color-picker-btn" title="Color Picker">
              <i class="fa-solid fa-fill" :style="{ color: watermarkData.color }"></i>
              <input v-model="watermarkData.color" type="color" class="color-input-hidden" />
            </label>

            <div class="w-px h-12 bg-gray-300 mx-1"></div>

            <button
              :class="['font-style-btn', { active: watermarkData.alignment === 'left' }]"
              @click="watermarkData.alignment = 'left'"
              title="Align Left"
            >
              <i class="fa-solid fa-align-left"></i>
            </button>
            <button
              :class="['font-style-btn', { active: watermarkData.alignment === 'center' }]"
              @click="watermarkData.alignment = 'center'"
              title="Align Center"
            >
              <i class="fa-solid fa-align-center"></i>
            </button>
            <button
              :class="['font-style-btn', { active: watermarkData.alignment === 'right' }]"
              @click="watermarkData.alignment = 'right'"
              title="Align Right"
            >
              <i class="fa-solid fa-align-right"></i>
            </button>
          </div>
        </div>

        <!-- Font and Rotation -->
        <div class="form-group">
          <div class="dual-select-row">
            <!-- Font Selector -->
            <div class="select-wrapper">
              <label class="form-label">Font</label>
              <select v-model="watermarkData.fontFamily" class="form-select">
                <option v-for="font in fontOptions" :key="font.value" :value="font.value">
                  {{ font.label }}
                </option>
              </select>
            </div>

            <!-- Rotation Selector -->
            <div class="select-wrapper">
              <label class="form-label">Rotation</label>
              <select v-model="watermarkData.rotation" class="form-select">
                <option
                  v-for="rotation in rotationOptions"
                  :key="rotation.value"
                  :value="rotation.value"
                >
                  {{ rotation.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Size -->
        <div class="form-group">
          <label class="form-label">Size</label>
          <div class="slider-group">
            <input
              v-model.number="watermarkData.size"
              type="range"
              min="8"
              max="200"
              step="1"
              class="slider"
            />
            <input
              v-model.number="watermarkData.size"
              type="number"
              min="8"
              max="200"
              class="value-input"
            />
            <span class="unit">pt</span>
          </div>
        </div>

        <!-- Opacity -->
        <div class="form-group">
          <label class="form-label">Opacity</label>
          <div class="slider-group">
            <input
              v-model.number="watermarkData.opacity"
              type="range"
              min="0"
              max="100"
              step="1"
              class="slider"
            />
            <input
              v-model.number="watermarkData.opacity"
              type="number"
              min="0"
              max="100"
              class="value-input"
            />
            <span class="unit">%</span>
          </div>
        </div>

        <!-- Position -->
        <div class="form-group">
          <label class="form-label">Position</label>
          <div class="position-grid-container">
            <div class="position-grid">
              <button
                v-for="pos in positions"
                :key="pos.value"
                :class="['position-cell', { active: watermarkData.position === pos.value }]"
                @click="watermarkData.position = pos.value"
                :title="pos.label"
              >
                <div class="position-dot"></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <button v-if="editData" @click="deleteWatermark" class="btn-danger mr-auto">Delete</button>
        <button @click="closeDialog" class="btn-secondary">Cancel</button>
        <button @click="confirmWatermark" class="btn-primary">{{ editData ? 'Update' : 'Add' }} Watermark</button>
      </template>
    </BaseDialog>

    <!-- Preview Pane -->
    <div v-if="previewImage" class="preview-pane-wrapper">
      <div class="preview-container" :style="previewContainerStyle">
        <img :src="previewImage" alt="Page Preview" class="preview-image" />
        <!-- Watermark Overlay -->
        <div class="watermark-overlay" v-if="watermarkData.text">
          <!-- Single Preview -->
          <div class="watermark-text-instance" :style="[watermarkStyles, watermarkPositionStyle]">
            {{ watermarkData.text }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import BaseDialog from "./BaseDialog.vue";

export default {
  name: "WatermarkDialog",
  components: {
    BaseDialog,
  },
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    previewImage: {
      type: String,
      default: null,
    },
    pageWidth: {
      type: Number,
      default: 0,
    },
    pageHeight: {
      type: Number,
      default: 0,
    },
    editData: {
      type: Object,
      default: null,
    },
  },
  emits: ["close", "confirm", "delete"],
  data() {
    return {
      watermarkData: {
        text: "",
        fontFamily: "Helvetica",
        rotation: 0,
        size: 70,
        opacity: 50,
        color: "#1E1E1E",
        bold: false,
        italic: false,
        underline: false,
        alignment: "center",
        position: "center",
        applyTo: "all",
        pageRange: "",
      },
      fontOptions: [
        { value: "Helvetica", label: "Helvetica" },
        { value: "Helvetica-Bold", label: "Helvetica Bold" },
        { value: "Times-Roman", label: "Times Roman" },
        { value: "Times-Bold", label: "Times Bold" },
        { value: "Courier", label: "Courier" },
        { value: "Courier-Bold", label: "Courier Bold" },
      ],
      rotationOptions: [
        { value: 0, label: "Do not rotate" },
        { value: 45, label: "45 degrees" },
        { value: 90, label: "90 degrees" },
        { value: 315, label: "135 degrees" },
        { value: 180, label: "180 degrees" },
        { value: 270, label: "270 degrees" },
      ],
      positions: [
        { value: "top-left", label: "Top Left" },
        { value: "top-center", label: "Top Center" },
        { value: "top-right", label: "Top Right" },
        { value: "middle-left", label: "Middle Left" },
        { value: "center", label: "Center" },
        { value: "middle-right", label: "Middle Right" },
        { value: "bottom-left", label: "Bottom Left" },
        { value: "bottom-center", label: "Bottom Center" },
        { value: "bottom-right", label: "Bottom Right" },
      ],
      showColorPicker: false,
    };
  },
  computed: {
    previewScale() {
      if (!this.pageWidth || !this.pageHeight) return 0.3;
      const maxWidth = 300;
      const maxHeight = window.innerHeight;
      const scaleX = maxWidth / this.pageWidth;
      const scaleY = maxHeight / this.pageHeight;
      return Math.min(scaleX, scaleY, 1);
    },
    previewContainerStyle() {
      return {
        width: `${this.pageWidth * this.previewScale}px`,
        height: `${this.pageHeight * this.previewScale}px`,
      };
    },
    watermarkStyles() {
      return {
        fontSize: `${this.watermarkData.size * this.previewScale}pt`,
        color: this.watermarkData.color,
        opacity: this.watermarkData.opacity / 100,
        fontFamily: this.watermarkData.fontFamily,
        fontWeight: this.watermarkData.bold ? "bold" : "normal",
        fontStyle: this.watermarkData.italic ? "italic" : "normal",
        textDecoration: this.watermarkData.underline ? "underline" : "none",
        whiteSpace: "pre",
        textAlign: this.watermarkData.alignment,
      };
    },
    watermarkPositionStyle() {
      const positionMap = {
        "top-left": { top: "5%", left: "5%", transform: `rotate(${this.watermarkData.rotation}deg)` },
        "top-center": {
          top: "5%",
          left: "50%",
          transform: `translateX(-50%) rotate(${this.watermarkData.rotation}deg)`,
        },
        "top-right": { top: "5%", right: "5%", transform: `rotate(${this.watermarkData.rotation}deg)` },
        "middle-left": {
          top: "50%",
          left: "5%",
          transform: `translateY(-50%) rotate(${this.watermarkData.rotation}deg)`,
        },
        center: {
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) rotate(${this.watermarkData.rotation}deg)`,
        },
        "middle-right": {
          top: "50%",
          right: "5%",
          transform: `translateY(-50%) rotate(${this.watermarkData.rotation}deg)`,
        },
        "bottom-left": { bottom: "5%", left: "5%", transform: `rotate(${this.watermarkData.rotation}deg)` },
        "bottom-center": {
          bottom: "5%",
          left: "50%",
          transform: `translateX(-50%) rotate(${this.watermarkData.rotation}deg)`,
        },
        "bottom-right": { bottom: "5%", right: "5%", transform: `rotate(${this.watermarkData.rotation}deg)` },
      };
      return positionMap[this.watermarkData.position] || positionMap.center;
    },
  },
  watch: {
    show(val) {
      if (val) {
        if (this.editData) {
          this.watermarkData = { ...this.watermarkData, ...this.editData };
        } else {
          this.resetForm();
        }
      }
    },
  },
  methods: {
    clearText() {
      this.watermarkData.text = "";
    },
    closeDialog() {
      this.$emit("close");
    },
    deleteWatermark() {
      if (confirm("Are you sure you want to delete this watermark?")) {
        this.$emit("delete");
      }
    },
    confirmWatermark() {
      if (!this.watermarkData.text.trim()) {
        alert("Please enter watermark text");
        return;
      }

      // Parse page range if "range" is selected
      let pages = [];
      if (this.watermarkData.applyTo === "range") {
        pages = this.parsePageRange(this.watermarkData.pageRange);
        if (pages.length === 0) {
          alert("Please enter a valid page range");
          return;
        }
      }

      this.$emit("confirm", {
        ...this.watermarkData,
        pages: this.watermarkData.applyTo === "all" ? "all" : pages,
      });
      this.resetForm();
    },
    parsePageRange(rangeStr) {
      const pages = new Set();
      const parts = rangeStr.split(",");

      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes("-")) {
          const [start, end] = trimmed.split("-").map((n) => parseInt(n.trim()));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start; i <= end; i++) {
              pages.add(i);
            }
          }
        } else {
          const page = parseInt(trimmed);
          if (!isNaN(page)) {
            pages.add(page);
          }
        }
      }

      return Array.from(pages).sort((a, b) => a - b);
    },
    resetForm() {
      this.watermarkData = {
        text: "",
        fontFamily: "Helvetica",
        rotation: 0,
        size: 70,
        opacity: 50,
        color: "#1E1E1E",
        bold: false,
        italic: false,
        underline: false,
        alignment: "center",
        position: "center",
        applyTo: "all",
        pageRange: "",
      };
    },
  },
};
</script>

<style scoped>
@reference "../css/tailwind.css";

.preview-pane-wrapper {
  @apply fixed top-1/2 right-32 -translate-y-1/2 z-10001 bg-white rounded-lg shadow-2xl flex flex-col;
}

.preview-header {
  @apply flex items-center justify-between p-3 border-b border-gray-200;
}

.close-preview-btn {
  @apply w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xl leading-none rounded-full hover:bg-gray-100;
}

.preview-container {
  @apply relative m-4 overflow-hidden bg-gray-100 self-center;
}

.preview-image {
  @apply absolute top-0 left-0 w-full h-full;
}

.watermark-overlay {
  @apply absolute inset-0 pointer-events-none;
}

.watermark-text-instance {
  @apply absolute;
}

.watermark-content {
  @apply space-y-5;
}

.form-group {
  @apply flex flex-col gap-2;
}

.form-label {
  @apply text-sm font-medium text-gray-700;
}

.input-wrapper {
  @apply relative;
}

.form-input {
  @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.clear-btn {
  @apply absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xl leading-none;
}

.slider-group {
  @apply flex items-center gap-3;
}

.slider {
  @apply flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer;
}

.slider::-webkit-slider-thumb {
  @apply appearance-none w-5 h-5 bg-blue-500 rounded-full cursor-pointer;
}

.slider::-moz-range-thumb {
  @apply w-5 h-5 bg-blue-500 rounded-full cursor-pointer border-0;
}

.value-input {
  @apply w-16 px-2 py-1 border border-gray-300 rounded text-center;
}

.unit {
  @apply text-sm text-gray-600 w-6;
}

.color-picker {
  @apply flex items-center gap-3;
}

.color-presets {
  @apply flex flex-wrap gap-2 flex-1;
}

.color-btn {
  @apply w-10 h-10 rounded-lg border-2 border-gray-300 cursor-pointer transition-all relative hover:scale-110;
}

.color-btn.active {
  @apply border-gray-800 ring-2 ring-gray-800 ring-offset-2;
}

.checkmark {
  @apply absolute inset-0 flex items-center justify-center text-white font-bold text-lg;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.color-actions {
  @apply flex gap-2;
}

.icon-btn {
  @apply w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors relative;
}

.color-input {
  @apply absolute inset-0 w-full h-full opacity-0 cursor-pointer;
}

.radio-group {
  @apply flex gap-4;
}

.radio-label {
  @apply flex items-center gap-2 cursor-pointer;
}

.radio-input {
  @apply w-5 h-5 text-blue-500 focus:ring-2 focus:ring-blue-500;
}

.radio-text {
  @apply text-sm text-gray-700;
}



/* Font Style Buttons */
.font-style-buttons {
  @apply flex gap-2;
}

.font-style-btn {
  @apply w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-lg font-bold;
}

.font-style-btn.active {
  @apply border-blue-500 bg-blue-50 text-blue-600;
}

.color-picker-btn {
  @apply cursor-pointer relative;
}

.color-picker-btn i {
  @apply text-xl transition-colors;
}

.color-input-hidden {
  @apply absolute inset-0 w-full h-full opacity-0 cursor-pointer;
}

/* Dual Select Row */
.dual-select-row {
  @apply flex gap-4;
}

.select-wrapper {
  @apply flex-1 flex flex-col gap-2;
}

.form-select {
  @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer;
}

/* Position Grid */
.position-grid-container {
  @apply flex items-center gap-4;
}

.position-grid {
  @apply grid grid-cols-3 w-[120px] h-[120px] gap-1 p-2 border-2 border-gray-300 rounded-lg bg-gray-50;
}

.position-cell {
  @apply flex items-center justify-center border border-gray-300 rounded bg-white hover:bg-blue-50 transition-colors cursor-pointer;
}

.position-cell.active {
  @apply bg-blue-500 border-blue-600;
}

.position-cell.active .position-dot {
  @apply bg-white;
}

.position-dot {
  @apply w-3 h-3 rounded-full bg-blue-500;
}

.btn-danger {
  @apply px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium;
}

</style>
