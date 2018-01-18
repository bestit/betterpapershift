// Saves options to chrome.storage
function save_options() {
    var timeformat = document.getElementById('timeformat').value;

    chrome.storage.sync.set({
        timeformat: timeformat
    }, function () {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function () {
            status.textContent = '';
        }, 750);
    });
}

function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get({
        timeformat: 'decimal'
    }, function (items) {
        document.getElementById('timeformat').value = items.timeformat;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);