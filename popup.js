document.getElementById('extractButton').addEventListener('click', async () => {
    const fileType = document.getElementById('fileType').value;
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = 'Extracting...';
  
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Execute content script directly in the tab
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                const table = document.querySelector('table');
                const headerCells = table.querySelectorAll('th');
                const headers = Array.from(headerCells).map(cell => cell.textContent.trim());
                
                const rows = table.querySelectorAll('tr');
                const data = [];
                
                // Skip header row, start from index 1
                for (let i = 1; i < rows.length; i++) {
                    const cells = rows[i].querySelectorAll('td');
                    const rowData = {};
                    headers.forEach((header, index) => {
                        rowData[header] = cells[index]?.textContent.trim() || '';
                    });
                    data.push(rowData);
                }
                
                return { headers, data };
            }
        });
        
        const { headers, data } = result[0].result;
        
        let content;
        if (fileType === 'txt') {
            // Create header row with tab separation
            content = headers.join('\t') + '\t\n';
            
            // Add each row with tab separation using the same order as headers
            data.forEach(item => {
                content += headers.map(header => item[header] || 'N/A').join('\t') + '\t\n';
            });
        } else {
            content = JSON.stringify(data, null, 2);
        }

        const blob = new Blob([content], { 
            type: fileType === 'json' ? 'application/json' : 'text/plain' 
        });
        const url = URL.createObjectURL(blob);
        
        await chrome.downloads.download({
            url: url,
            filename: `extracted_table.${fileType}`,
            saveAs: true
        });
        
        statusDiv.textContent = 'Table extracted successfully!';
        statusDiv.className = 'success';
    } catch (error) {
        statusDiv.textContent = 'Error: ' + error.message;
        statusDiv.className = 'error';
    }
});