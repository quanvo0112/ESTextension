const EXTRACTOR_SCRIPT = 'src/shared/table-extractor.js';

const extractButton = document.getElementById('extractButton');
const fileTypeSelect = document.getElementById('fileType');
const statusElement = document.getElementById('status');

function setStatus(message, className = '') {
  statusElement.textContent = message;
  statusElement.className = className;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return tab;
}

async function extractTableFromTab(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [EXTRACTOR_SCRIPT],
    world: 'MAIN'
  });

  const [executionResult] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: () => globalThis.SubjectTableExtractor.extractFirstTable({
      enrichInteractiveCells: true
    })
  });

  return executionResult.result;
}

function buildTextFile(headers, data) {
  const lines = [
    headers.join('\t'),
    ...data.map((item) => headers.map((header) => item[header] || 'N/A').join('\t'))
  ];

  return `${lines.join('\n')}\n`;
}

function buildDownloadContent(fileType, tableData) {
  if (fileType === 'txt') {
    return buildTextFile(tableData.headers, tableData.data);
  }

  return JSON.stringify(tableData.data, null, 2);
}

async function downloadContent(fileType, content) {
  const blob = new Blob([content], {
    type: fileType === 'json' ? 'application/json' : 'text/plain'
  });
  const url = URL.createObjectURL(blob);

  await chrome.downloads.download({
    url,
    filename: `extracted_table.${fileType}`,
    saveAs: true
  });
}

extractButton.addEventListener('click', async () => {
  setStatus('Extracting...');

  try {
    const tab = await getActiveTab();
    const tableData = await extractTableFromTab(tab.id);

    if (!tableData.success) {
      throw new Error(tableData.message);
    }

    const fileType = fileTypeSelect.value;
    const content = buildDownloadContent(fileType, tableData);

    await downloadContent(fileType, content);
    setStatus('Table extracted successfully!', 'success');
  } catch (error) {
    setStatus(`Error: ${error.message}`, 'error');
  }
});
