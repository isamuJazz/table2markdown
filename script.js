// Table data structure
let tableData = {
    headers: ['A', 'B', 'C'],
    rows: [
        ['1', '2', '3'],
        ['', '', '']
    ],
    alignments: ['left', 'left', 'left']
};

// Mode management
let currentMode = 'normal'; // 'normal' or 'insert'
let focusedCell = null;
let focusedRow = null;
let focusedCol = null;

// DOM elements
const tableWrapper = document.getElementById('tableWrapper');
const markdownOutput = document.getElementById('markdownOutput');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const notification = document.getElementById('copyNotification');
const modeIndicator = document.getElementById('modeIndicator');

// Initialize
renderTable();
updateMarkdown();
initializeMode();

// Event listeners
clearBtn.addEventListener('click', clearTable);
copyBtn.addEventListener('click', copyToClipboard);
modeIndicator.addEventListener('click', () => switchMode('normal'));

// Global keyboard listener
document.addEventListener('keydown', handleGlobalKeydown);

/**
 * Render the entire table with controls
 */
function renderTable() {
    const tableGrid = document.createElement('div');
    tableGrid.className = 'table-grid';

    // Column controls row
    const columnControlsRow = document.createElement('div');
    columnControlsRow.className = 'column-controls-row';

    const spacer = document.createElement('div');
    spacer.className = 'column-controls-spacer';
    columnControlsRow.appendChild(spacer);

    const columnControls = document.createElement('div');
    columnControls.className = 'column-controls';
    columnControls.style.gridTemplateColumns = `repeat(${tableData.headers.length}, minmax(120px, 1fr))`;
    columnControls.style.display = 'grid';
    columnControls.style.gap = '0';

    tableData.headers.forEach((_, colIndex) => {
        const controlGroup = document.createElement('div');
        controlGroup.className = 'column-control-group';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn-icon';
        addBtn.textContent = '+';
        addBtn.onclick = () => addColumn(colIndex);
        addBtn.title = 'Add column to the right';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-icon';
        removeBtn.textContent = '−';
        removeBtn.onclick = () => removeColumn(colIndex);
        removeBtn.title = 'Remove this column';

        controlGroup.appendChild(addBtn);
        controlGroup.appendChild(removeBtn);
        columnControls.appendChild(controlGroup);
    });

    columnControlsRow.appendChild(columnControls);
    tableGrid.appendChild(columnControlsRow);

    // Table header row
    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'row-wrapper';

    const headerRowControls = document.createElement('div');
    headerRowControls.className = 'row-controls';
    headerRowControls.style.visibility = 'hidden'; // No controls for header
    headerWrapper.appendChild(headerRowControls);

    const headerTable = document.createElement('table');
    headerTable.id = 'editableTable';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    tableData.headers.forEach((header, colIndex) => {
        const th = document.createElement('th');
        th.contentEditable = 'false'; // Normal mode by default
        th.textContent = header || '\u200B'; // Use zero-width space if empty
        th.dataset.row = '-1';
        th.dataset.col = colIndex;
        th.tabIndex = 0; // Make focusable

        // Add alignment class
        th.className = `align-${tableData.alignments[colIndex]}`;

        // Add alignment buttons (left, center, right)
        const alignBtns = createAlignButtons(colIndex);
        alignBtns.forEach(btn => th.appendChild(btn));

        th.addEventListener('input', (e) => handleCellInput(e, -1, colIndex));
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    headerTable.appendChild(thead);

    // Table body rows
    const tbody = document.createElement('tbody');
    tableData.rows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        row.forEach((cell, colIndex) => {
            const td = document.createElement('td');
            td.contentEditable = 'false'; // Normal mode by default
            td.textContent = cell || '\u200B'; // Use zero-width space if empty
            td.dataset.row = rowIndex;
            td.dataset.col = colIndex;
            td.tabIndex = 0; // Make focusable

            // Add alignment class
            td.className = `align-${tableData.alignments[colIndex]}`;

            td.addEventListener('input', (e) => handleCellInput(e, rowIndex, colIndex));
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    headerTable.appendChild(tbody);
    headerWrapper.appendChild(headerTable);
    tableGrid.appendChild(headerWrapper);

    // Data rows with controls
    tableData.rows.forEach((row, rowIndex) => {
        const rowWrapper = document.createElement('div');
        rowWrapper.className = 'row-wrapper';
        rowWrapper.style.display = 'none'; // Hide since we're using the table tbody above
        tableGrid.appendChild(rowWrapper);
    });

    // Add row controls to the side
    const bodyRowWrappers = [];
    tableData.rows.forEach((row, rowIndex) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'row-controls-wrapper';
        wrapper.style.display = 'flex';
        wrapper.style.gap = '8px';
        wrapper.style.alignItems = 'start';

        const rowControls = document.createElement('div');
        rowControls.className = 'row-controls';

        const addBtn = document.createElement('button');
        addBtn.className = 'btn-icon';
        addBtn.textContent = '+';
        addBtn.onclick = () => addRow(rowIndex);
        addBtn.title = 'Add row below';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-icon';
        removeBtn.textContent = '−';
        removeBtn.onclick = () => removeRow(rowIndex);
        removeBtn.title = 'Remove this row';

        rowControls.appendChild(addBtn);
        rowControls.appendChild(removeBtn);

        bodyRowWrappers.push({ controls: rowControls, rowIndex });
    });

    // Actually rebuild with row controls properly positioned
    tableGrid.innerHTML = '';
    tableGrid.appendChild(columnControlsRow);

    // Create table with row controls on the side
    const mainTableWrapper = document.createElement('div');
    mainTableWrapper.style.display = 'grid';
    mainTableWrapper.style.gridTemplateColumns = 'auto 1fr';
    mainTableWrapper.style.gap = '8px';

    const allRowControls = document.createElement('div');
    allRowControls.style.display = 'flex';
    allRowControls.style.flexDirection = 'column';
    allRowControls.style.gap = '0';
    allRowControls.style.paddingTop = '68px'; // Align with first data row (48px + 20px for grip space)

    bodyRowWrappers.forEach(({ controls }) => {
        const controlWrapper = document.createElement('div');
        controlWrapper.style.height = '45px'; // Match row height
        controlWrapper.style.display = 'flex';
        controlWrapper.style.flexDirection = 'column';
        controlWrapper.style.justifyContent = 'center';
        controlWrapper.style.gap = '4px';
        controlWrapper.appendChild(controls);
        allRowControls.appendChild(controlWrapper);
    });

    mainTableWrapper.appendChild(allRowControls);
    mainTableWrapper.appendChild(headerTable);
    tableGrid.appendChild(mainTableWrapper);

    // Replace old content
    tableWrapper.innerHTML = '';
    tableWrapper.appendChild(tableGrid);

    // Re-initialize mode and draggable functionality after rendering
    const table = document.getElementById('editableTable');
    if (table) {
        if (currentMode === 'normal') {
            table.classList.add('normal-mode');
        } else {
            table.classList.add('insert-mode');
        }
        makeCellsDraggable();

        // Restore focus if there was a focused cell
        if (focusedRow !== null && focusedCol !== null) {
            const selector = `[data-row="${focusedRow}"][data-col="${focusedCol}"]`;
            const cell = document.querySelector(selector);
            if (cell) {
                focusedCell = cell;
                cell.classList.add('focused');
                if (currentMode === 'insert') {
                    cell.contentEditable = 'true';
                }
            }
        }
    }
}

/**
 * Handle cell input
 */
function handleCellInput(e, rowIndex, colIndex) {
    let value = e.target.textContent;
    // Remove zero-width space if that's the only character
    if (value === '\u200B') {
        value = '';
    }
    if (rowIndex === -1) {
        tableData.headers[colIndex] = value;
    } else {
        tableData.rows[rowIndex][colIndex] = value;
    }
    updateMarkdown();
}

/**
 * Handle keyboard navigation in cells
 */
function handleCellKeydown(e) {
    const currentCell = e.target;
    const currentRow = parseInt(currentCell.dataset.row);
    const currentCol = parseInt(currentCell.dataset.col);

    let nextCell = null;

    switch(e.key) {
        case 'Tab':
            e.preventDefault();
            if (e.shiftKey) {
                // Shift + Tab: Move left
                nextCell = findCell(currentRow, currentCol - 1);
            } else {
                // Tab: Move right
                nextCell = findCell(currentRow, currentCol + 1);
            }
            break;

        case 'ArrowUp':
            e.preventDefault();
            nextCell = findCell(currentRow - 1, currentCol);
            break;

        case 'ArrowDown':
            e.preventDefault();
            nextCell = findCell(currentRow + 1, currentCol);
            break;

        case 'ArrowLeft':
            // Only prevent default if cursor is at start
            if (window.getSelection().anchorOffset === 0) {
                e.preventDefault();
                nextCell = findCell(currentRow, currentCol - 1);
            }
            break;

        case 'ArrowRight':
            // Only prevent default if cursor is at end
            const textLength = currentCell.textContent.length;
            if (window.getSelection().anchorOffset === textLength) {
                e.preventDefault();
                nextCell = findCell(currentRow, currentCol + 1);
            }
            break;
    }

    if (nextCell) {
        nextCell.focus();
        // Place cursor at the end
        const range = document.createRange();
        const sel = window.getSelection();
        if (nextCell.childNodes.length > 0) {
            range.setStart(nextCell.childNodes[0], nextCell.textContent.length);
        } else {
            range.setStart(nextCell, 0);
        }
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

/**
 * Find a cell by row and column index
 */
function findCell(row, col) {
    if (col < 0 || col >= tableData.headers.length) {
        return null;
    }
    if (row < -1 || row >= tableData.rows.length) {
        return null;
    }

    const selector = `[data-row="${row}"][data-col="${col}"]`;
    return document.querySelector(selector);
}

/**
 * Add a column after the specified index
 */
function addColumn(afterIndex) {
    // Add to headers
    tableData.headers.splice(afterIndex + 1, 0, '');

    // Add to alignments
    tableData.alignments.splice(afterIndex + 1, 0, 'left');

    // Add to each row
    tableData.rows.forEach(row => {
        row.splice(afterIndex + 1, 0, '');
    });

    renderTable();
    updateMarkdown();
}

/**
 * Remove a column at the specified index
 */
function removeColumn(index) {
    if (tableData.headers.length <= 1) {
        alert('At least one column is required');
        return;
    }

    tableData.headers.splice(index, 1);
    tableData.alignments.splice(index, 1);
    tableData.rows.forEach(row => {
        row.splice(index, 1);
    });

    renderTable();
    updateMarkdown();
}

/**
 * Add a row after the specified index
 */
function addRow(afterIndex) {
    const newRow = new Array(tableData.headers.length).fill('');
    tableData.rows.splice(afterIndex + 1, 0, newRow);

    renderTable();
    updateMarkdown();
}

/**
 * Remove a row at the specified index
 */
function removeRow(index) {
    if (tableData.rows.length <= 1) {
        alert('At least one row is required');
        return;
    }

    tableData.rows.splice(index, 1);

    renderTable();
    updateMarkdown();
}

/**
 * Clear the entire table
 */
function clearTable() {
    if (confirm('Clear all table contents?')) {
        tableData.headers = tableData.headers.map(() => '');
        tableData.rows = tableData.rows.map(row => row.map(() => ''));

        renderTable();
        updateMarkdown();
    }
}

/**
 * Convert table to Markdown
 */
function tableToMarkdown() {
    if (tableData.headers.length === 0) {
        return '';
    }

    // Header row
    const headers = tableData.headers.map(h => {
        const cleaned = h.replace(/\u200B/g, '').trim();
        return cleaned || ' ';
    });
    let markdown = '| ' + headers.join(' | ') + ' |\n';

    // Separator row with alignment
    const separators = tableData.alignments.map(align => {
        switch(align) {
            case 'right':
                return '---:';
            case 'center':
                return ':---:';
            case 'left':
            default:
                return '---';
        }
    });
    markdown += '| ' + separators.join(' | ') + ' |\n';

    // Data rows
    tableData.rows.forEach(row => {
        const cells = row.map(cell => {
            let content = cell.replace(/\u200B/g, '').trim();
            content = content.replace(/\|/g, '\\|');
            return content || ' ';
        });
        markdown += '| ' + cells.join(' | ') + ' |\n';
    });

    return markdown;
}

/**
 * Update Markdown output
 */
function updateMarkdown() {
    const markdown = tableToMarkdown();
    markdownOutput.textContent = markdown;
}

/**
 * Copy to clipboard
 */
async function copyToClipboard() {
    const markdown = markdownOutput.textContent;

    try {
        await navigator.clipboard.writeText(markdown);
        showNotification();
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = markdown;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            showNotification();
        } catch (err) {
            alert('Failed to copy');
        }

        document.body.removeChild(textArea);
    }
}

/**
 * Show copy notification
 */
function showNotification() {
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// ============================================
// Drag & Drop Functionality
// ============================================

let draggedCell = null;
let draggedRow = null;
let draggedCol = null;

/**
 * Create cell grip for drag & drop
 */
function createCellGrip(row, col) {
    const grip = document.createElement('div');
    grip.className = 'cell-grip';
    grip.draggable = true;
    grip.contentEditable = 'false';
    grip.dataset.row = row;
    grip.dataset.col = col;

    // Prevent grip from triggering cell focus
    grip.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    grip.addEventListener('dragstart', handleDragStart);
    grip.addEventListener('dragend', handleDragEnd);

    return grip;
}

/**
 * Handle drag start
 */
function handleDragStart(e) {
    const grip = e.target;
    draggedRow = parseInt(grip.dataset.row);
    draggedCol = parseInt(grip.dataset.col);
    draggedCell = grip.parentElement;

    draggedCell.classList.add('dragging');

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedCell.innerHTML);

    setupDropTargets();
}

/**
 * Handle drag end
 */
function handleDragEnd(e) {
    draggedCell.classList.remove('dragging');

    document.querySelectorAll('.drop-target').forEach(cell => {
        cell.classList.remove('drop-target');
    });

    draggedCell = null;
    draggedRow = null;
    draggedCol = null;
}

/**
 * Setup drop targets
 */
function setupDropTargets() {
    const allCells = document.querySelectorAll('#editableTable th, #editableTable td');

    allCells.forEach(cell => {
        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('dragenter', handleDragEnter);
        cell.addEventListener('dragleave', handleDragLeave);
        cell.addEventListener('drop', handleDrop);
    });
}

/**
 * Handle drag over
 */
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

/**
 * Handle drag enter
 */
function handleDragEnter(e) {
    if (e.target !== draggedCell && (e.target.tagName === 'TH' || e.target.tagName === 'TD')) {
        e.target.classList.add('drop-target');
    }
}

/**
 * Handle drag leave
 */
function handleDragLeave(e) {
    if (e.target.tagName === 'TH' || e.target.tagName === 'TD') {
        e.target.classList.remove('drop-target');
    }
}

/**
 * Handle drop
 */
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const targetCell = e.target.tagName === 'TH' || e.target.tagName === 'TD'
        ? e.target
        : e.target.closest('th, td');

    if (!targetCell || targetCell === draggedCell) {
        return false;
    }

    const targetRow = parseInt(targetCell.dataset.row);
    const targetCol = parseInt(targetCell.dataset.col);

    swapCells(draggedRow, draggedCol, targetRow, targetCol);

    return false;
}

/**
 * Swap cells content
 */
function swapCells(row1, col1, row2, col2) {
    let temp;

    if (row1 === -1 && row2 === -1) {
        // Both headers
        temp = tableData.headers[col1];
        tableData.headers[col1] = tableData.headers[col2];
        tableData.headers[col2] = temp;
    } else if (row1 === -1 || row2 === -1) {
        // One header, one data cell - not allowed
        alert('Cannot swap header with data cell');
        return;
    } else {
        // Both data cells
        temp = tableData.rows[row1][col1];
        tableData.rows[row1][col1] = tableData.rows[row2][col2];
        tableData.rows[row2][col2] = temp;
    }

    renderTable();
    updateMarkdown();
}

// ============================================
// Alignment Functionality
// ============================================

/**
 * Create alignment buttons
 */
function createAlignButtons(colIndex) {
    const leftBtn = document.createElement('button');
    leftBtn.className = 'align-btn align-btn-left';
    leftBtn.contentEditable = 'false';
    leftBtn.dataset.col = colIndex;
    leftBtn.dataset.align = 'left';
    leftBtn.title = 'Align left';
    leftBtn.addEventListener('click', (e) => handleAlignClick(e, colIndex, 'left'));

    if (tableData.alignments[colIndex] === 'left') {
        leftBtn.classList.add('active');
    }

    const centerBtn = document.createElement('button');
    centerBtn.className = 'align-btn align-btn-center';
    centerBtn.contentEditable = 'false';
    centerBtn.dataset.col = colIndex;
    centerBtn.dataset.align = 'center';
    centerBtn.title = 'Align center';
    centerBtn.addEventListener('click', (e) => handleAlignClick(e, colIndex, 'center'));

    if (tableData.alignments[colIndex] === 'center') {
        centerBtn.classList.add('active');
    }

    const rightBtn = document.createElement('button');
    rightBtn.className = 'align-btn align-btn-right';
    rightBtn.contentEditable = 'false';
    rightBtn.dataset.col = colIndex;
    rightBtn.dataset.align = 'right';
    rightBtn.title = 'Align right';
    rightBtn.addEventListener('click', (e) => handleAlignClick(e, colIndex, 'right'));

    if (tableData.alignments[colIndex] === 'right') {
        rightBtn.classList.add('active');
    }

    return [leftBtn, centerBtn, rightBtn];
}

/**
 * Handle alignment button click
 */
function handleAlignClick(e, colIndex, alignment) {
    e.preventDefault();
    e.stopPropagation();

    e.target.blur();

    tableData.alignments[colIndex] = alignment;

    renderTable();
    updateMarkdown();
}

// ============================================
// Modal Editing Functionality (Vim-inspired)
// ============================================

/**
 * Initialize mode system
 */
function initializeMode() {
    const table = document.getElementById('editableTable');
    if (table) {
        table.classList.add('normal-mode');
        makeCellsDraggable();
    }
}

/**
 * Switch between normal and insert mode
 */
function switchMode(mode) {
    currentMode = mode;
    const table = document.getElementById('editableTable');
    
    if (mode === 'normal') {
        // Normal mode
        modeIndicator.textContent = 'セルモード';
        modeIndicator.classList.remove('insert-mode');
        table.classList.remove('insert-mode');
        table.classList.add('normal-mode');
        
        if (focusedCell) {
            focusedCell.contentEditable = 'false';
        }
        
    } else if (mode === 'insert') {
        // Insert mode
        modeIndicator.textContent = '編集モード';
        modeIndicator.classList.add('insert-mode');
        table.classList.remove('normal-mode');
        table.classList.add('insert-mode');
        
        if (focusedCell) {
            focusedCell.contentEditable = 'true';
            focusedCell.focus();
            // Place cursor at end
            const range = document.createRange();
            const sel = window.getSelection();
            if (focusedCell.childNodes.length > 0) {
                const textNode = focusedCell.childNodes[0];
                range.setStart(textNode, textNode.length);
            } else {
                range.setStart(focusedCell, 0);
            }
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
}

/**
 * Handle global keyboard events
 */
function handleGlobalKeydown(e) {
    const table = document.getElementById('editableTable');
    if (!table) return;
    
    // Escape key: switch to normal mode
    if (e.key === 'Escape' && currentMode === 'insert') {
        e.preventDefault();
        switchMode('normal');
        return;
    }
    
    // 'i' key: switch to insert mode (only in normal mode with focused cell)
    if (e.key === 'i' && currentMode === 'normal' && focusedCell) {
        e.preventDefault();
        switchMode('insert');
        return;
    }
    
    // Navigation in normal mode
    if (currentMode === 'normal') {
        handleNormalModeNavigation(e);
    }
}

/**
 * Handle navigation in normal mode
 */
function handleNormalModeNavigation(e) {
    if (!focusedCell) return;
    
    let nextRow = focusedRow;
    let nextCol = focusedCol;
    let shouldMove = false;
    
    switch(e.key) {
        case 'ArrowUp':
            e.preventDefault();
            nextRow = focusedRow - 1;
            shouldMove = true;
            break;
        case 'ArrowDown':
            e.preventDefault();
            nextRow = focusedRow + 1;
            shouldMove = true;
            break;
        case 'ArrowLeft':
            e.preventDefault();
            nextCol = focusedCol - 1;
            shouldMove = true;
            break;
        case 'ArrowRight':
            e.preventDefault();
            nextCol = focusedCol + 1;
            shouldMove = true;
            break;
        case 'Tab':
            e.preventDefault();
            if (e.shiftKey) {
                nextCol = focusedCol - 1;
            } else {
                nextCol = focusedCol + 1;
            }
            shouldMove = true;
            break;
    }
    
    if (shouldMove) {
        focusCell(nextRow, nextCol);
    }
}

/**
 * Focus a specific cell
 */
function focusCell(row, col) {
    // Validate coordinates
    if (col < 0 || col >= tableData.headers.length) return;
    if (row < -1 || row >= tableData.rows.length) return;
    
    // Remove previous focus
    if (focusedCell) {
        focusedCell.classList.remove('focused');
    }
    
    // Find and focus new cell
    const selector = `[data-row="${row}"][data-col="${col}"]`;
    const cell = document.querySelector(selector);
    
    if (cell) {
        cell.classList.add('focused');
        focusedCell = cell;
        focusedRow = row;
        focusedCol = col;
        cell.focus();
    }
}

/**
 * Make all cells draggable in normal mode
 */
function makeCellsDraggable() {
    const cells = document.querySelectorAll('#editableTable th, #editableTable td');
    cells.forEach(cell => {
        cell.draggable = true;
        cell.addEventListener('dragstart', handleCellDragStart);
        cell.addEventListener('dragend', handleCellDragEnd);
        cell.addEventListener('dragover', handleCellDragOver);
        cell.addEventListener('drop', handleCellDrop);
        cell.addEventListener('click', handleCellClick);
    });
}

/**
 * Handle cell click
 */
function handleCellClick(e) {
    const cell = e.currentTarget;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    focusCell(row, col);

    if (currentMode === 'insert') {
        // Re-enable editing in insert mode
        cell.contentEditable = 'true';
        cell.focus();
        // Place cursor at end
        const range = document.createRange();
        const sel = window.getSelection();
        if (cell.childNodes.length > 0) {
            const textNode = cell.childNodes[0];
            range.setStart(textNode, textNode.length);
        } else {
            range.setStart(cell, 0);
        }
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

let draggedCellData = null;

/**
 * Handle cell drag start
 */
function handleCellDragStart(e) {
    if (currentMode !== 'normal') {
        e.preventDefault();
        return;
    }
    
    const cell = e.currentTarget;
    draggedCellData = {
        row: parseInt(cell.dataset.row),
        col: parseInt(cell.dataset.col)
    };
    
    cell.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', cell.innerHTML);
}

/**
 * Handle cell drag end
 */
function handleCellDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.drop-target').forEach(c => c.classList.remove('drop-target'));
    draggedCellData = null;
}

/**
 * Handle cell drag over
 */
function handleCellDragOver(e) {
    if (currentMode !== 'normal' || !draggedCellData) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const cell = e.currentTarget;
    if (cell.tagName === 'TH' || cell.tagName === 'TD') {
        cell.classList.add('drop-target');
    }
}

/**
 * Handle cell drop
 */
function handleCellDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const targetCell = e.currentTarget;
    if (!targetCell || !draggedCellData) return;
    
    const targetRow = parseInt(targetCell.dataset.row);
    const targetCol = parseInt(targetCell.dataset.col);
    
    swapCells(draggedCellData.row, draggedCellData.col, targetRow, targetCol);
}

