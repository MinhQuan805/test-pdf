export class TextSelection {
  constructor() {
    this.currentSelectionRange = null;
  }

  // Select text within rectangle area
  selectTextInRectangle(rect, pageElement) {
    if (!pageElement) return false;

    const textLayer = pageElement.querySelector('.textLayer');
    if (!textLayer) return false;

    const textSpans = textLayer.querySelectorAll('span');
    if (textSpans.length === 0) return false;

    const selection = window.getSelection();
    selection.removeAllRanges();

    const selectionRect = {
      left: Math.min(rect.startX, rect.endX),
      right: Math.max(rect.startX, rect.endX),
      top: Math.min(rect.startY, rect.endY),
      bottom: Math.max(rect.startY, rect.endY)
    };

    // Helper to get offset from point with better accuracy
    const getOffsetFromPoint = (span, x) => {
      const spanRect = span.getBoundingClientRect();
      const centerY = (spanRect.top + spanRect.bottom) / 2;
      const textNode = span.firstChild;

      if (!textNode || textNode.nodeType !== 3) return null;

      // If x is before span, return 0
      if (x <= spanRect.left) return 0;
      // If x is after span, return text length
      if (x >= spanRect.right) return textNode.length;

      // Clamp x within span bounds for accurate hit testing
      const testX = Math.max(spanRect.left + 1, Math.min(spanRect.right - 1, x));

      if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(testX, centerY);
        if (pos && pos.offsetNode === textNode) return pos.offset;
      } else if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(testX, centerY);
        if (range && range.startContainer === textNode) return range.startOffset;
      }

      return null;
    };

    // Collect spans with their precise selection boundaries
    const spanSelections = [];
    textSpans.forEach(span => {
      const spanRect = span.getBoundingClientRect();

      // Check for intersection
      if (spanRect.left < selectionRect.right &&
          spanRect.right > selectionRect.left &&
          spanRect.top < selectionRect.bottom &&
          spanRect.bottom > selectionRect.top) {

        const textNode = span.firstChild;
        if (!textNode || textNode.nodeType !== 3) return;

        // Calculate precise start and end offsets for this span
        let startOffset = 0;
        let endOffset = textNode.length;

        // If selection starts within this span
        if (selectionRect.left > spanRect.left) {
          const offset = getOffsetFromPoint(span, selectionRect.left);
          if (offset !== null) startOffset = offset;
        }

        // If selection ends within this span
        if (selectionRect.right < spanRect.right) {
          const offset = getOffsetFromPoint(span, selectionRect.right);
          if (offset !== null) endOffset = offset;
        }

        // Only add if there's something to select
        if (startOffset < endOffset) {
          spanSelections.push({
            span,
            textNode,
            startOffset,
            endOffset,
            top: spanRect.top
          });
        }
      }
    });

    if (spanSelections.length === 0) return false;

    // Sort by vertical position (top to bottom), then horizontal (left to right)
    spanSelections.sort((a, b) => {
      const topDiff = a.top - b.top;
      if (Math.abs(topDiff) > 5) return topDiff; // Different lines
      return a.span.getBoundingClientRect().left - b.span.getBoundingClientRect().left;
    });

    try {
      const range = document.createRange();
      const firstSelection = spanSelections[0];
      const lastSelection = spanSelections[spanSelections.length - 1];

      // Set start point with precise offset
      range.setStart(firstSelection.textNode, firstSelection.startOffset);

      // Set end point with precise offset
      range.setEnd(lastSelection.textNode, lastSelection.endOffset);

      selection.addRange(range);
      this.currentSelectionRange = range;

      return true;
    } catch (error) {
      console.error('Error selecting text:', error);
      return false;
    }
  }

  // Check if two rectangles intersect
  isIntersecting(rect1, rect2) {
    return !(rect1.right < rect2.left ||
             rect1.left > rect2.right ||
             rect1.bottom < rect2.top ||
             rect1.top > rect2.bottom);
  }

  handleSelection(e, toolbarSelector = '.text-selection-toolbar', pageSelector = '.pdf-page') {
    if (e.target.closest(toolbarSelector)) return null;

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      let container = range.commonAncestorContainer;
      if (container.nodeType === 3) container = container.parentNode;

      if (container.closest(pageSelector)) {
        const rect = range.getBoundingClientRect();
        this.currentSelectionRange = range;

        let top = rect.top - 50 + window.scrollY;
        let left = rect.left + (rect.width / 2) - 150;

        if (left < 10) left = 10;
        if (top < 10) top = rect.bottom + 10 + window.scrollY;

        return {
            show: true,
            position: { top, left },
            range
        };
      }
    }

    this.currentSelectionRange = null;
    return { show: false, position: { top: 0, left: 0 }, range: null };
  }

  copyText() {
    if (this.currentSelectionRange) {
      const text = this.currentSelectionRange.toString();
      navigator.clipboard.writeText(text);
      window.getSelection().removeAllRanges();
      return true;
    }
    return false;
  }

  // Check if two rectangles intersect (used for removing effects)
  rectsIntersect(r1, r2) {
    return !(r2.x >= r1.right ||
             r2.right <= r1.x ||
             r2.y >= r1.bottom ||
             r2.bottom <= r1.y);
  }

  applyAction(actionType, pdfEditor, zoomLevel, callbacks = {}) {
      if (!this.currentSelectionRange || !pdfEditor) return false;

      const range = this.currentSelectionRange;
      const rects = range.getClientRects();
      const zoom = zoomLevel;

      let container = range.commonAncestorContainer;
      if (container.nodeType === 3) container = container.parentNode;
      const pageEl = container.closest('.pdf-page');

      if (pageEl) {
        const pageObj = pdfEditor.pdfPages.find(p => p.container === pageEl);
        if (pageObj) {
          const pageRect = pageEl.getBoundingClientRect();

          if (actionType === 'link') {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            let hasValidRect = false;
            for (const rect of rects) {
                 if (rect.width <= 0 || rect.height <= 0) continue;

                 const x = (rect.left - pageRect.left) / zoom;
                 const y = (rect.top - pageRect.top) / zoom;
                 const w = rect.width / zoom;
                 const h = rect.height / zoom;
                 minX = Math.min(minX, x);
                 minY = Math.min(minY, y);
                 maxX = Math.max(maxX, x + w);
                 maxY = Math.max(maxY, y + h);
                 hasValidRect = true;
             }
             if (hasValidRect && callbacks.openLinkDialog) {
                 const id = `link-${Date.now()}`;
                 callbacks.openLinkDialog(pageObj, id, minX, minY, maxX - minX, maxY - minY);
                 return false;
             }
          } else if (actionType === 'remove') {
             // Get list of rectangles in selection area
             const selectionRects = Array.from(rects).map(rect => ({
                x: (rect.left - pageRect.left) / zoom,
                y: (rect.top - pageRect.top) / zoom,
                width: rect.width / zoom,
                height: rect.height / zoom,
                right: (rect.right - pageRect.left) / zoom,
                bottom: (rect.bottom - pageRect.top) / zoom
              })).filter(r => r.width > 0 && r.height > 0);

              const components = pageEl.getElementsByClassName('component');
              const componentsToRemove = [];

              // Find components (highlight, underline, strikethrough) that intersect with selection area
              Array.from(components).forEach(el => {
                if (!el.component) return;
                const op = el.component.getOperation();
                const isEffect = ['highlight', 'underline', 'strikethrough'].includes(op.subType) || op.type === 'link';

                if (isEffect) {
                    const compRect = {
                        x: op.x,
                        y: op.y,
                        width: op.width,
                        height: op.height,
                        right: op.x + op.width,
                        bottom: op.y + op.height
                    };

                    for (const selRect of selectionRects) {
                        if (this.rectsIntersect(compRect, selRect)) {
                            componentsToRemove.push(el.component);
                            break;
                        }
                    }
                }
              });

              componentsToRemove.forEach(comp => comp.deleteComponent());

              if (callbacks.showToast && componentsToRemove.length <= 0) {
                  callbacks.showToast("No effects found in selection", "info");
              }
          } else {
            // Create rectangles for highlight, underline, strikethrough
            const pageRects = Array.from(rects).map(rect => ({
              x: (rect.left - pageRect.left) / zoom,
              y: (rect.top - pageRect.top) / zoom,
              width: rect.width / zoom,
              height: rect.height / zoom,
              bottom: (rect.bottom - pageRect.top) / zoom,
              right: (rect.right - pageRect.left) / zoom
            })).filter(r => r.width > 0 && r.height > 0);

            // Sort rectangles from top to bottom, left to right
            pageRects.sort((a, b) => {
              if (Math.abs(a.y - b.y) > 5) return a.y - b.y;
              return a.x - b.x;
            });

            const mergedRects = [];

            // Merge adjacent rectangles on the same line
            for (const rect of pageRects) {
              let merged = false;
              for (let i = mergedRects.length - 1; i >= 0; i--) {
                const existing = mergedRects[i];
                const verticalOverlap = Math.min(rect.bottom, existing.bottom) - Math.max(rect.y, existing.y);
                const minHeight = Math.min(rect.height, existing.height);

                // Check if there is vertical overlap (same line)
                if (verticalOverlap > minHeight * 0.5) {
                   const gap = Math.max(rect.x, existing.x) - Math.min(rect.right, existing.right);
                   if (gap < 2) {
                     // Merge two rectangles
                     existing.x = Math.min(rect.x, existing.x);
                     existing.y = Math.min(rect.y, existing.y);
                     existing.right = Math.max(rect.right, existing.right);
                     existing.bottom = Math.max(rect.bottom, existing.bottom);
                     existing.width = existing.right - existing.x;
                     existing.height = existing.bottom - existing.y;
                     merged = true;
                     break;
                   }
                }
              }
              if (!merged) mergedRects.push(rect);
            }

            // Create components corresponding to action
            for (const rect of mergedRects) {
              const { x, y, width, height } = rect;
              const id = `annot-${Date.now()}-${Math.random()}`;

              if (actionType === 'highlight') {
                pageObj.createComponentWithDimensions('rectangle', { subType: 'highlight', fill: '#FFFF00', opacity: 0.5 }, id, x, y, width, height);
              } else if (actionType === 'underline') {
                const underlineHeight = 1;
                pageObj.createComponentWithDimensions('rectangle', { fill: '#000000', opacity: 1, subType: 'underline' }, id, x, y + height - underlineHeight, width, underlineHeight);
              } else if (actionType === 'strikethrough') {
                const strikeHeight = 1;
                pageObj.createComponentWithDimensions('rectangle', { fill: '#FF0000', opacity: 1, subType: 'strikethrough' }, id, x, y + (height / 2) - (strikeHeight / 2), width, strikeHeight);
              }
            }
          }
        }
      }

      window.getSelection().removeAllRanges();
      return true;
  }
}

export const textSelection = new TextSelection();
