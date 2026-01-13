<template>
  <BaseDialog :show="show" title="Add watermark" @close="closeDialog">
    <div class="watermark-content">
      <!-- Text Input -->
      <div class="form-group">
        <label class="form-label">Text</label>
        <div class="input-wrapper">
          <input
            v-model="watermarkData.text"
            type="text"
            class="form-input"
            placeholder="Enter watermark text"
          />
          <button v-if="watermarkData.text" @click="clearText" class="clear-btn">×</button>
        </div>
      </div>

      <!-- Orientation -->
      <div class="form-group">
        <label class="form-label">Orientation</label>
        <div class="orientation-buttons">
          <button
            v-for="orientation in orientations"
            :key="orientation.value"
            :class="[
              'orientation-btn',
              { active: watermarkData.orientation === orientation.value },
            ]"
            @click="watermarkData.orientation = orientation.value"
          >
            <span :style="{ transform: orientation.transform }">abc</span>
          </button>
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

      <!-- Color -->
      <div class="form-group">
        <label class="form-label">Color</label>
        <div class="color-picker">
          <div class="color-presets">
            <button
              v-for="color in colorPresets"
              :key="color"
              :class="['color-btn', { active: watermarkData.color === color }]"
              :style="{ backgroundColor: color }"
              @click="watermarkData.color = color"
            >
              <span v-if="watermarkData.color === color" class="checkmark">✓</span>
            </button>
          </div>
          <div class="color-actions">
            <button class="icon-btn" @click="showColorPicker = !showColorPicker" title="Add color">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </button>
            <button class="icon-btn" title="Custom color">
              <input
                v-model="watermarkData.color"
                type="color"
                class="color-input"
              />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Apply to -->
      <div class="form-group">
        <label class="form-label">Apply to</label>
        <div class="radio-group">
          <label class="radio-label">
            <input
              v-model="watermarkData.applyTo"
              type="radio"
              value="all"
              class="radio-input"
            />
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
    </div>

    <template #footer>
      <button @click="closeDialog" class="btn btn-cancel">Cancel</button>
      <button @click="confirmWatermark" class="btn btn-confirm">Add Watermark</button>
    </template>
  </BaseDialog>
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
  },
  emits: ["close", "confirm"],
  data() {
    return {
      watermarkData: {
        text: "",
        orientation: "horizontal",
        size: 126,
        opacity: 50,
        color: "#1E1E1E",
        applyTo: "all",
        pageRange: "",
      },
      orientations: [
        { value: "diagonal", transform: "rotate(-45deg)" },
        { value: "horizontal", transform: "rotate(0deg)" },
        { value: "vertical", transform: "rotate(90deg)" },
      ],
      colorPresets: [
        "#1E1E1E",
        "#E74C3C",
        "#F39C12",
        "#F1C40F",
        "#2ECC71",
        "#48C9B0",
        "#3498DB",
        "#5DADE2",
        "#9B59B6",
      ],
      showColorPicker: false,
    };
  },
  methods: {
    clearText() {
      this.watermarkData.text = "";
    },
    closeDialog() {
      this.$emit("close");
      this.resetForm();
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
        orientation: "horizontal",
        size: 126,
        opacity: 50,
        color: "#1E1E1E",
        applyTo: "all",
        pageRange: "",
      };
    },
  },
};
</script>

<style scoped>
@reference "../css/tailwind.css";

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

.orientation-buttons {
  @apply flex gap-2;
}

.orientation-btn {
  @apply flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium;
}

.orientation-btn.active {
  @apply border-blue-500 bg-blue-50 text-blue-600;
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

.mt-2 {
  @apply mt-2;
}

.btn {
  @apply px-6 py-2 rounded-lg font-medium transition-colors;
}

.btn-cancel {
  @apply bg-gray-200 hover:bg-gray-300 text-gray-700;
}

.btn-confirm {
  @apply bg-blue-500 hover:bg-blue-600 text-white;
}
</style>
