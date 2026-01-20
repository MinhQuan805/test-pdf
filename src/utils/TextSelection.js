export class TextSelection {
  constructor() {
    this.currentSelectionRange = null;
  }

  // Utility to check intersection between 2 rectangles
  rectsIntersect(r1, r2) {
    return !(
      r2.left >= r1.right ||
      r2.right <= r1.left ||
      r2.top >= r1.bottom ||
      r2.bottom <= r1.top
    );
  }

  // Utility to get text offset from coordinates
  getOffset(span, x) {
    const rect = span.getBoundingClientRect();
    const textNode = span.firstChild;
    // Clamp x within span limits
    const testX = Math.max(rect.left, Math.min(rect.right - 1, x));

    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(testX, (rect.top + rect.bottom) / 2);
      if (pos) {
        if (pos.offsetNode === textNode) return pos.offset;
        if (pos.offsetNode === span) return pos.offset === 0 ? 0 : textNode?.length || 0;
      }
    }
    return null;
  }

  selectTextInRectangle(rect, pageElement) {
    if (!pageElement) return false;
    const textLayer = pageElement.querySelector(".textLayer");
    if (!textLayer) return false;

    // Find spans located within the selection area
    const spans = Array.from(textLayer.querySelectorAll("span"));
    const selRect = {
      left: Math.min(rect.startX, rect.endX),
      right: Math.max(rect.startX, rect.endX),
      top: Math.min(rect.startY, rect.endY),
      bottom: Math.max(rect.startY, rect.endY),
    };

    const spansInRect = spans
      .filter((span) => this.rectsIntersect(selRect, span.getBoundingClientRect()))
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    if (spansInRect.length === 0) return false;

    try {
      const range = document.createRange();
      const first = spansInRect[0];
      const last = spansInRect[spansInRect.length - 1];

      let startOffset = 0;
      let endOffset = (last.firstChild || last).length || 0;

      // Calculate precise offset if selection crosses the first/last span
      if (selRect.left > first.getBoundingClientRect().left) {
        const off = this.getOffset(first, selRect.left);
        if (off !== null) startOffset = off;
      }
      if (selRect.right < last.getBoundingClientRect().right) {
        const off = this.getOffset(last, selRect.right);
        if (off !== null) endOffset = off;
      }

      range.setStart(first.firstChild || first, startOffset);
      range.setEnd(last.firstChild || last, endOffset);

      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      this.currentSelectionRange = range;
      return true;
    } catch (e) {
      console.error("Error selecting text:", e);
      return false;
    }
  }

  handleSelection(e, toolbarSelector = ".text-selection-toolbar", pageSelector = ".pdf-page") {
    if (e.target.closest(toolbarSelector)) return null;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      this.currentSelectionRange = null;
      return { show: false, position: { top: 0, left: 0 }, range: null };
    }

    const range = sel.getRangeAt(0);
    const container =
      range.commonAncestorContainer.nodeType === 3
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;

    if (container.closest(pageSelector)) {
      const rect = range.getBoundingClientRect();
      this.currentSelectionRange = range;

      let top = rect.top - 50 + window.scrollY;
      let left = rect.left + rect.width / 2 - 150;

      // Keep toolbar within the screen
      if (left < 10) left = 10;
      if (top < 10) top = rect.bottom + 10 + window.scrollY;

      return { show: true, position: { top, left }, range };
    }
    return null;
  }

  copyText() {
    if (!this.currentSelectionRange) return false;
    navigator.clipboard.writeText(this.currentSelectionRange.toString());
    window.getSelection().removeAllRanges();
    return true;
  }

  applyAction(actionType, pdfEditor, zoom, callbacks = {}) {
    if (!this.currentSelectionRange || !pdfEditor) return false;

    const range = this.currentSelectionRange;
    const container =
      range.commonAncestorContainer.nodeType === 3
        ? range.commonAncestorContainer.parentNode
        : range.commonAncestorContainer;
    const pageEl = container.closest(".pdf-page");
    const pageObj = pageEl ? pdfEditor.pdfPages.find((p) => p.container === pageEl) : null;

    if (!pageObj) return false;

    const pageRect = pageEl.getBoundingClientRect();
    // Helper to convert DOM coordinates to PDF coordinates
    const toPdfRect = (r) => ({
      x: (r.left - pageRect.left) / zoom,
      y: (r.top - pageRect.top) / zoom,
      width: r.width / zoom,
      height: r.height / zoom,
      right: (r.right - pageRect.left) / zoom,
      bottom: (r.bottom - pageRect.top) / zoom,
    });

    // Get list of rects from range
    const rawRects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);

    // Handle link creation
    if (actionType === "link") {
      if (!callbacks.openLinkDialog) return false;
      // Calculate bounding box (Union) of all rects
      const bounds = rawRects.reduce(
        (acc, r) => {
          const p = toPdfRect(r);
          return {
            minX: Math.min(acc.minX, p.x),
            minY: Math.min(acc.minY, p.y),
            maxX: Math.max(acc.maxX, p.right),
            maxY: Math.max(acc.maxY, p.bottom),
          };
        },
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
      );

      if (bounds.minX !== Infinity) {
        callbacks.openLinkDialog(
          pageObj,
          `link-${Date.now()}`,
          bounds.minX,
          bounds.minY,
          bounds.maxX - bounds.minX,
          bounds.maxY - bounds.minY,
        );
        window.getSelection().removeAllRanges();
        return true;
      }
    }

    // Handle removal of effects
    if (actionType === "remove") {
      const selectionRects = rawRects.map(toPdfRect);
      const componentsToRemove = Array.from(pageEl.getElementsByClassName("component"))
        .map((el) => el.component)
        .filter((comp) => {
          if (!comp) return false;
          const op = comp.getOperation();
          const isEffect =
            ["highlight", "underline", "strikethrough"].includes(op.subType) || op.type === "link";
          if (!isEffect) return false;

          const compRect = {
            left: op.x,
            top: op.y,
            right: op.x + op.width,
            bottom: op.y + op.height,
          };
          // Check intersection with any rect in the selection area (using PDF coordinate logic)
          return selectionRects.some((sel) =>
            this.rectsIntersect(compRect, {
              left: sel.x,
              top: sel.y,
              right: sel.right,
              bottom: sel.bottom,
            }),
          );
        });

      componentsToRemove.forEach((c) => c.deleteComponent());
      if (callbacks.showToast && !componentsToRemove.length)
        callbacks.showToast("No effects found in selection", "info");
      window.getSelection().removeAllRanges();
      return true;
    }

    // Convert and Sort rects (top to bottom, left to right)
    const sortedRects = rawRects
      .map(toPdfRect)
      .sort((a, b) => (Math.abs(a.y - b.y) > 5 ? a.y - b.y : a.x - b.x));

    // Merge adjacent rects on the same line
    const mergedRects = [];
    for (const rect of sortedRects) {
      let merged = false;
      // Iterate backwards to find the nearest mergeable rect
      for (let i = mergedRects.length - 1; i >= 0; i--) {
        const exist = mergedRects[i];
        // Check same line (vertical overlap > 50% of min height)
        const verticalOverlap = Math.min(rect.bottom, exist.bottom) - Math.max(rect.y, exist.y);
        const minH = Math.min(rect.height, exist.height);

        if (verticalOverlap > minH * 0.5) {
          // Check horizontal adjacency
          const gap = Math.max(rect.x, exist.x) - Math.min(rect.right, exist.right);
          if (gap < 2) {
            exist.x = Math.min(rect.x, exist.x);
            exist.y = Math.min(rect.y, exist.y);
            exist.right = Math.max(rect.right, exist.right);
            exist.bottom = Math.max(rect.bottom, exist.bottom);
            exist.width = exist.right - exist.x;
            exist.height = exist.bottom - exist.y;
            merged = true;
            break;
          }
        }
      }
      if (!merged) mergedRects.push(rect);
    }

    // Create corresponding component
    const configs = {
      highlight: (r) => ({
        subType: "highlight",
        fill: "#FFFF00",
        opacity: 0.5,
        y: r.y,
        h: r.height,
      }),
      underline: (r) => ({
        subType: "underline",
        fill: "#000000",
        opacity: 1,
        y: r.y + r.height - 1,
        h: 1,
      }),
      strikethrough: (r) => ({
        subType: "strikethrough",
        fill: "#FF0000",
        opacity: 1,
        y: r.y + r.height / 2 - 0.5,
        h: 1,
      }),
    };

    mergedRects.forEach((r) => {
      if (configs[actionType]) {
        const conf = configs[actionType](r);
        pageObj.createComponentWithDimensions(
          "rectangle",
          { ...conf },
          `annot-${Date.now()}-${Math.random()}`,
          r.x,
          conf.y,
          r.width,
          conf.h,
        );
      }
    });

    window.getSelection().removeAllRanges();
    return true;
  }
}

export const textSelection = new TextSelection();
