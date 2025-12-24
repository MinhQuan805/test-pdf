I have a PDF Organizer application built with Vue.js that handles management, editing, and organization of PDF pages. The application structure includes:

PDFOrganizer.js (Core logic class)

Organize.vue (Main component)

SplitDialog.vue (Split PDF dialog)

MergeDialog.vue (Merge PDF dialog)

Testing Requirements
1. BASIC TESTS (MANDATORY - CRITICAL)
A. Load & Display PDF
Load a PDF file and display all pages as thumbnails
Load multiple PDF files sequentially (append mode)
Validate file type (accept PDF only)

Validate file size (limit 50MB per file)

Handle PDFs with varying page counts (1 page, 10 pages, 100+ pages)

Load PDFs that have existing rotation metadata

B. Page Operations
Rotate Page:

Rotate a page 90 degrees clockwise

Rotate a page -90 degrees counter-clockwise

Rotate consecutively 4 times (360 degrees) returning to 0

Rotate a page with a base rotation other than 0

Duplicate Page:

Duplicate any specific page

Ensure duplicated page is inserted immediately after the original page

Ensure duplicated page has a unique ID

Duplicate a blank page

Delete Page:

Delete any specific page

Prevent deletion of the last remaining page (last page protection)

Delete multiple consecutive pages

Add Blank Page:

Add a blank page at any index

Ensure blank page has correct properties (isBlank=true, rotation=0)

Render blank page on canvas (white background)

C. Page Movement
Move a page from one index to another

Drag and drop a page

Drag and drop multiple selected pages

Swap two pages

D. Export PDF
Export all pages into a single PDF

Export a specific range of pages

Export pages that have been rotated

Export blank pages

Export mixed content (normal pages + blank pages)

Trigger download of the exported file

2. ADVANCED FUNCTIONALITY TESTS (MANDATORY - IMPORTANT)
A. Multi-Selection & Batch Operations
Selection:

Click to select a single page

Ctrl+Click to multi-select

Shift+Click to select a range

"Select All" functionality

"Deselect All" functionality

Visual indicator for selected pages (checkbox, highlight)

Batch Operations on Selected:

Delete multiple selected pages (but not all pages)

Rotate multiple selected pages simultaneously

Duplicate multiple selected pages

Reverse order of selected pages (sortSelectedPages)

Export only selected pages

B. Split PDF Operations
Split at Page:

Split PDF into 2 parts at a specific page number

Validate page number (must be between 1 and totalPages-1)

Trigger download for both split files

Extract Page Range:

Extract pages from fromPage to toPage

Validate range (fromPage <= toPage)

Extract a single page

Extract all pages

Split Every N Pages:

Split PDF into multiple parts, each containing N pages

Handle cases where total pages are not divisible by N

Trigger download for all split parts

C. Merge PDF Operations
Select multiple PDF files to merge

Drag and drop PDF files into the merge dialog

Reorder files before merging (drag & drop in list)

Remove a file from the merge list

Validate file types (PDF only)

Display progress bar during merge process

Trigger download of merged PDF

Add merged PDF back into the organizer

D. Preview & Zoom
Preview page at a larger scale

Navigate next/previous page within preview

Zoom in/out within preview

Zoom lens (magnifying glass effect)

Close preview modal

Perform actions from preview (rotate, duplicate, delete)

3. UI/UX TESTS (NICE TO HAVE)
A. Drag & Drop Interface
Visual feedback when dragging a page

Drop indicator line displaying correct position

Auto-scroll when dragging near edges

Cancel drag operation with ESC key

Drag multiple selected pages

B. Context Menu
Right-click displays context menu

Context menu items are correct (Preview, Rotate, Duplicate, Add Blank, Delete)

Click outside to close context menu

Disable "Delete" option if only 1 page remains

C. Toast Notifications
Success toast displays when operation succeeds

Error toast displays when an error occurs

Toast automatically hides after duration

Click toast to dismiss immediately

D. Toolbar & Tools
Switch between tools (Select, Delete, Rotate, Duplicate, Add Blank, Swap)

Cursor changes according to the selected tool

Tool icon shows active state

Actions menu dropdown

Export menu dropdown

4. EDGE CASE TESTS (MANDATORY - CRITICAL)
A. Boundary Conditions
Load PDF with 0 pages (should fail gracefully)

Load PDF with exactly 1 page

Load PDF with 1000+ pages (performance check)

File size = 0 bytes

File size > 50MB (should reject)

Rotate page -360 degrees (should normalize to 0)

Move page from index 0 to last index

Move page from last index to first

B. Invalid Inputs
Load non-PDF file (should reject with error)

Load corrupted PDF file

rotatePage with non-existent index (should return undefined)

duplicatePage with non-existent index (should return null)

deletePage with negative index

movePage with null fromIndex or toIndex

Split at invalid page number

Extract range where fromPage > toPage

C. State Management
Clear all pages and reset state

Load new PDF with reset=true (clear previous data)

Load new PDF with reset=false (append data)

Verify nextPageId increments correctly after operations

Verify fileCounter increments correctly when loading multiple files

Verify pageCanvasRefs are cleaned up upon clearing

D. Concurrent Operations
Render multiple pages simultaneously

Quick successive operations (spam clicking)

Perform operation while merging/splitting is in progress

Load new file while export is in progress

5. ERROR HANDLING TESTS (MANDATORY - IMPORTANT)
A. Loading Errors
PDF.js getDocument fails -> throw error

ArrayBuffer read fails

Network timeout (if loading from URL)

Memory limit exceeded

B. Rendering Errors
Canvas is null/undefined

Page has no externalPdfDoc

PDF.js render fails -> throw error

Invalid rotation value

C. Export Errors
Export empty pages array

Export with null pages

PDFLib load fails

PDFLib save fails

D. Split/Merge Errors
Split with less than 2 pages

Merge with less than 2 files

Merge with invalid file in list

Progress callback fails

6. PERFORMANCE TESTS (NICE TO HAVE)
Load PDF with 100+ pages in under 5 seconds

Render 50 thumbnails simultaneously

Export PDF with 100+ pages in under 10 seconds

Drag & drop is responsive (no lag)

Memory usage does not increase continuously (no memory leaks)

Multiple operations do not block the UI

7. INTEGRATION TESTS (NICE TO HAVE)
A. Component Integration
Organize.vue <-> PDFOrganizer.js communication

SplitDialog emits correct events

MergeDialog emits correct events

Props passing correctly between components

B. External Libraries
PDF.js integration (rendering)

PDFLib integration (manipulation)

toRaw from Vue (avoid reactivity issues)

C. Browser Compatibility
Chrome/Edge (latest)

Firefox (latest)

Safari (latest)

Mobile browsers (responsive check)

8. REGRESSION TESTS (NICE TO HAVE)
Run entire existing test suite in utils.test.js

Verify no breaking changes

Verify backward compatibility

REQUESTED FORMAT
For each test case, write using the following format:

JavaScript

describe("Feature Name", () => {
  it("should [expected behavior] when [condition]", async () => {
    // Arrange
    // Act
    // Assert
  });
});
PRIORITIES
CRITICAL (Must Pass):

Load & Display PDF

Core operations (rotate, duplicate, delete, move)

Export PDF

Edge cases & Error handling

IMPORTANT (Should Pass):

Multi-selection

Split/Merge operations

Preview

NICE-TO-HAVE:

UI/UX polish

Performance optimization

Browser compatibility

EXPECTED RESULTS
Write a full coverage test suite for all cases listed above.

Use Vitest framework (consistent with current utils.test.js).

Mock PDF.js and PDFLib where necessary.

Organize tests by logic groups.

Add comments explaining complex test cases.

Aim for > 90% coverage for PDFOrganizer.js.

IMPORTANT NOTES
Mock Data: Use mock PDF data instead of real PDF files to speed up tests.

Async Operations: Remember to await all async operations.

State Cleanup: Reset organizer state between tests (beforeEach).

Vue Reactivity: Test toRaw() wrappers to avoid reactivity issues with complex objects.

Error Messages: Verify specific error messages, do not just check if an error is thrown.

DELIVERABLES
New test file: src/testing/organizer.comprehensive.test.js

Updates to utils.test.js if necessary

Test coverage report

List of bugs/issues found (if any)

Please begin writing the comprehensive test suite based on the requirements above. Prioritize CRITICAL tests first, followed by IMPORTANT and NICE-TO-HAVE.