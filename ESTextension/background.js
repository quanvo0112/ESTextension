chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "download") {
        const blob = new Blob([request.content], {type: 'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
            url: url,
            filename: 'table_extract.txt',
            saveAs: true
        });
    }
});