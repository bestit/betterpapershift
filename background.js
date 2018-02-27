// Called when the user clicks on the browser action icon.
chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.storage.sync.get({
        active: false
    }, function (items) {
        var active = items.active;

        chrome.storage.sync.set({
            active: !active
        }, function () {
            var code = 'window.location.reload();';
            chrome.tabs.executeScript(tab.id, {code: code});
        });
    });
});