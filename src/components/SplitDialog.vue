<template>
  <div v-if="show" class="dialog-overlay" @click.self="closeDialog">
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 class="dialog-title">
          <i class="fa-solid fa-scissors"></i>
          Split PDF
        </h2>
        <button @click="closeDialog" class="dialog-close-btn">
          &times;
        </button>
      </div>

      <div class="dialog-body">
        <div class="info-box">
          <i class="fa-solid fa-info-circle"></i>
          <span>Total pages: {{ totalPages }}</span>
        </div>

        <div class="split-mode-section">
          <label class="input-label">
            <i class="fa-solid fa-scissors"></i>
            Split mode:
          </label>
          <select v-model="splitMode" class="split-mode-dropdown">
            <option value="range">Extract page range</option>
            <option value="at-page">Split at page</option>
            <option value="every">Split every N pages</option>
          </select>
          <p class="mode-description">
            <span v-if="splitMode === 'range'">Extract specific pages from the PDF</span>
            <span v-if="splitMode === 'at-page'">Split the PDF into two parts at a specific page number</span>
            <span v-if="splitMode === 'every'">Split the PDF into multiple parts, each with N pages</span>
          </p>
        </div>

        <!-- Split at page input -->
        <div v-if="splitMode === 'at-page'" class="input-section">
          <label class="input-label">Split after page:</label>
          <input
            type="number"
            v-model.number="splitAtPage"
            :min="1"
            :max="totalPages - 1"
            class="input-field"
            placeholder="Enter page number"
          />
          <p class="input-hint">
            This will create two PDFs: pages 1-{{ splitAtPage }} and pages {{ splitAtPage + 1 }}-{{ totalPages }}
          </p>
        </div>

        <!-- Range input -->
        <div v-if="splitMode === 'range'" class="input-section">
          <div class="range-inputs">
            <div class="input-group">
              <label class="input-label">From page:</label>
              <input
                type="number"
                v-model.number="rangeFrom"
                :min="1"
                :max="totalPages"
                class="input-field"
              />
            </div>
            <div class="input-group">
              <label class="input-label">To page:</label>
              <input
                type="number"
                v-model.number="rangeTo"
                :min="rangeFrom"
                :max="totalPages"
                class="input-field"
              />
            </div>
          </div>
          <p class="input-hint">
            Extract pages {{ rangeFrom }} to {{ rangeTo }} ({{ rangeTo - rangeFrom + 1 }} pages)
          </p>
        </div>

        <!-- Every N pages input -->
        <div v-if="splitMode === 'every'" class="input-section">
          <label class="input-label">Pages per split:</label>
          <input
            type="number"
            v-model.number="everyNPages"
            :min="1"
            :max="totalPages"
            class="input-field"
            placeholder="Enter number of pages"
          />
          <p class="input-hint">
            This will create {{ Math.ceil(totalPages / everyNPages) }} PDF files
          </p>
        </div>
      </div>

      <div class="dialog-footer">
        <button @click="closeDialog" class="btn-secondary">
          Cancel
        </button>
        <button @click="handleSplit" class="btn-primary" :disabled="!isValid">
          <i class="fa-solid fa-scissors"></i>
          Split PDF
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SplitDialog',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    totalPages: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      splitMode: 'at-page',
      splitAtPage: 1,
      rangeFrom: 1,
      rangeTo: 2,
      everyNPages: 1
    };
  },
  computed: {
    isValid() {
      if (this.splitMode === 'at-page') {
        return this.splitAtPage >= 1 && this.splitAtPage < this.totalPages;
      } else if (this.splitMode === 'range') {
        return this.rangeFrom >= 1 && this.rangeTo <= this.totalPages && this.rangeFrom <= this.rangeTo;
      } else if (this.splitMode === 'every') {
        return this.everyNPages >= 1 && this.everyNPages <= this.totalPages;
      }
      return false;
    }
  },
  methods: {
    closeDialog() {
      this.$emit('close');
    },
    handleSplit() {
      if (!this.isValid) return;

      const splitData = {
        mode: this.splitMode,
        splitAtPage: this.splitAtPage,
        rangeFrom: this.rangeFrom,
        rangeTo: this.rangeTo,
        everyNPages: this.everyNPages
      };

      this.$emit('split', splitData);
      this.closeDialog();
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        // Reset to defaults when dialog opens
        this.splitMode = 'range';
        this.splitAtPage = Math.floor(this.totalPages / 2);
        this.rangeFrom = 1;
        this.rangeTo = Math.min(2, this.totalPages);
        this.everyNPages = 1;
      }
    }
  }
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.dialog-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;

  h3 {
    margin: 0;
    color: #333;
    font-size: 18px;
    font-weight: 600;
  }
}

.dialog-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.dialog-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.dialog-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

.info-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1e40af;
  font-weight: 500;
}

.info-box i {
  font-size: 18px;
}

.split-mode-section {
  margin-bottom: 24px;
}

.split-mode-dropdown {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.split-mode-dropdown:hover {
  border-color: #93c5fd;
  background-color: #f9fafb;
}

.split-mode-dropdown:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.split-mode-dropdown option {
  padding: 10px;
  font-size: 14px;
}

.mode-description {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

.input-section {
  margin-top: 24px;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  font-size: 14px;
}

.input-label i {
  color: #3b82f6;
  font-size: 16px;
}

.input-field {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.input-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
}

.range-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 8px;
}

.input-group {
  display: flex;
  flex-direction: column;
}

</style>
