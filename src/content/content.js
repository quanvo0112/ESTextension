chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action !== 'extract-table') {
    return false;
  }

  globalThis.SubjectTableExtractor.extractFirstTable(request.options)
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        success: false,
        message: error.message
      });
    });

  return true;
});
