document.getElementById('extractButton').addEventListener('click', async () => {
    const fileType = document.getElementById('fileType').value;
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = 'Extracting...';
  
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const response = await chrome.tabs.sendMessage(tab.id, { action: "extract" });
        
        if (response.success) {
            // Prepare content based on file type
            const content = fileType === 'json' 
                ? JSON.stringify(response.content, null, 2)
                : response.content;
  
            // Create blob with appropriate type
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
        } else {
            statusDiv.textContent = response.message || 'Extraction failed';
            statusDiv.className = 'error';
        }
    } catch (error) {
        statusDiv.textContent = 'Error: ' + error.message;
        statusDiv.className = 'error';
    }
});