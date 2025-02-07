function extractTable() {
    const tables = document.getElementsByTagName('table');
    if (tables.length === 0) {
        return { success: false, message: 'No tables found on this page' };
    }

    const table = tables[0];
    const headers = [];
    const rows = [];

    // Get headers
    const headerRow = table.querySelector('tr');
    if (headerRow) {
        const headerCells = headerRow.querySelectorAll('th');
        headerCells.forEach(cell => {
            headers.push(cell.innerText.trim());
        });
    }

    // Get data rows
    const dataRows = table.querySelectorAll('tr:not(:first-child)');
    dataRows.forEach(row => {
        const rowData = [];
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
            rowData.push(cell.innerText.trim());
        });
        if (rowData.length > 0) {
            rows.push(rowData);
        }
    });

    // Create text content
    let content = headers.join('\t') + '\n';
    rows.forEach(row => {
        content += row.join('\t') + '\n';
    });

    return {
        success: true,
        content: content
    };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract") {
        const result = extractTable();
        sendResponse(result);
    }
    return true;
});