<template>
  <BaseDialog :show="show" title="Note Details" @close="close">
    <div class="note-form">
      <div class="form-group">
        <label for="noteAuthor">Author:</label>
        <input
          id="noteAuthor"
          v-model="localAuthor"
          type="text"
          class="form-input"
          placeholder="Enter author name..."
        />
      </div>

      <div class="form-group">
        <label for="noteContent">Content:</label>
        <textarea
          id="noteContent"
          v-model="localText"
          class="form-textarea"
          rows="5"
          placeholder="Enter note content..."
        ></textarea>
      </div>
    </div>

    <template #footer>
      <button @click="close" class="btn-secondary">Cancel</button>
      <button @click="confirm" class="btn-primary">Save</button>
    </template>
  </BaseDialog>
</template>

<script>
import { ref, watch } from 'vue';
import BaseDialog from './BaseDialog.vue';

export default {
  name: 'NoteDialog',
  components: {
    BaseDialog,
  },
  props: {
    show: Boolean,
    text: String,
    author: String
  },
  emits: ['close', 'confirm'],
  setup(props, { emit }) {
    const localText = ref('');
    const localAuthor = ref('');

    watch(() => props.show, (newVal) => {
      if (newVal) {
        localText.value = props.text || '';
        localAuthor.value = props.author || 'User';
      }
    });

    const close = () => {
      emit('close');
    };

    const confirm = () => {
      emit('confirm', {
        text: localText.value,
        author: localAuthor.value
      });
    };

    return {
      localText,
      localAuthor,
      close,
      confirm
    };
  }
}
</script>
<style scoped>
.note-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-textarea {
  min-height: 100px;
  resize: vertical;
}

</style>
