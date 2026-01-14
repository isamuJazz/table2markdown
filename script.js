// DOM要素の取得
const table = document.getElementById('editableTable');
const markdownOutput = document.getElementById('markdownOutput');
const addRowBtn = document.getElementById('addRowBtn');
const addColBtn = document.getElementById('addColBtn');
const removeRowBtn = document.getElementById('removeRowBtn');
const removeColBtn = document.getElementById('removeColBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const notification = document.getElementById('copyNotification');

// 初期表示
updateMarkdown();

// イベントリスナー
addRowBtn.addEventListener('click', addRow);
addColBtn.addEventListener('click', addColumn);
removeRowBtn.addEventListener('click', removeRow);
removeColBtn.addEventListener('click', removeColumn);
clearBtn.addEventListener('click', clearTable);
copyBtn.addEventListener('click', copyToClipboard);

// テーブルの変更を監視
table.addEventListener('input', updateMarkdown);
table.addEventListener('blur', updateMarkdown, true);

/**
 * 行を追加
 */
function addRow() {
    const tbody = table.querySelector('tbody');
    const headerCells = table.querySelectorAll('thead th');
    const newRow = document.createElement('tr');

    headerCells.forEach(() => {
        const cell = document.createElement('td');
        cell.contentEditable = 'true';
        cell.textContent = '';
        newRow.appendChild(cell);
    });

    tbody.appendChild(newRow);
    updateMarkdown();
}

/**
 * 列を追加
 */
function addColumn() {
    // ヘッダーに列を追加
    const thead = table.querySelector('thead tr');
    const newHeader = document.createElement('th');
    newHeader.contentEditable = 'true';
    newHeader.textContent = '';
    thead.appendChild(newHeader);

    // 各行に列を追加
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const newCell = document.createElement('td');
        newCell.contentEditable = 'true';
        newCell.textContent = '';
        row.appendChild(newCell);
    });

    updateMarkdown();
}

/**
 * 最後の行を削除
 */
function removeRow() {
    const tbody = table.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');

    if (rows.length > 1) {
        rows[rows.length - 1].remove();
        updateMarkdown();
    } else {
        alert('最低1行は必要です');
    }
}

/**
 * 最後の列を削除
 */
function removeColumn() {
    const headerCells = table.querySelectorAll('thead th');

    if (headerCells.length > 1) {
        // ヘッダーから列を削除
        headerCells[headerCells.length - 1].remove();

        // 各行から列を削除
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                cells[cells.length - 1].remove();
            }
        });

        updateMarkdown();
    } else {
        alert('最低1列は必要です');
    }
}

/**
 * テーブルをクリア
 */
function clearTable() {
    if (confirm('テーブルの内容をクリアしますか？')) {
        // ヘッダーをクリア
        const headerCells = table.querySelectorAll('thead th');
        headerCells.forEach(cell => cell.textContent = '');

        // ボディをクリア
        const bodyCells = table.querySelectorAll('tbody td');
        bodyCells.forEach(cell => cell.textContent = '');

        updateMarkdown();
    }
}

/**
 * テーブルからMarkdownを生成
 */
function tableToMarkdown() {
    const headerCells = Array.from(table.querySelectorAll('thead th'));
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    if (headerCells.length === 0) {
        return '';
    }

    // ヘッダー行を作成
    const headers = headerCells.map(cell => cell.textContent.trim() || ' ');
    let markdown = '| ' + headers.join(' | ') + ' |\n';

    // セパレーター行を作成
    const separators = headerCells.map(() => '---');
    markdown += '| ' + separators.join(' | ') + ' |\n';

    // データ行を作成
    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const cellContents = cells.map(cell => {
            let content = cell.textContent.trim();
            // パイプ文字をエスケープ
            content = content.replace(/\|/g, '\\|');
            return content || ' ';
        });
        markdown += '| ' + cellContents.join(' | ') + ' |\n';
    });

    return markdown;
}

/**
 * Markdownの表示を更新
 */
function updateMarkdown() {
    const markdown = tableToMarkdown();
    markdownOutput.textContent = markdown;
}

/**
 * クリップボードにコピー
 */
async function copyToClipboard() {
    const markdown = markdownOutput.textContent;

    try {
        await navigator.clipboard.writeText(markdown);
        showNotification();
    } catch (err) {
        // フォールバック: 古いブラウザ用
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
            alert('コピーに失敗しました');
        }

        document.body.removeChild(textArea);
    }
}

/**
 * コピー完了通知を表示
 */
function showNotification() {
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    // Ctrl+C または Cmd+C でMarkdownをコピー（テーブル外の場合）
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selection = window.getSelection();
        if (!selection.toString() && !table.contains(document.activeElement)) {
            e.preventDefault();
            copyToClipboard();
        }
    }
});
