// Saves options to chrome.storage
function save_options() {
    var timeformat = document.getElementById('timeformat').value;
    var minPause = document.getElementById('forced-pause').value;
    var minPauseHours = document.getElementById('forced-pause-hours').value;

    var mondayStart = document.getElementById('monday-start').value;
    var mondayEnd = document.getElementById('monday-end').value;
    var mondayPause = document.getElementById('monday-pause').value;

    var tuesdayStart = document.getElementById('tuesday-start').value;
    var tuesdayEnd = document.getElementById('tuesday-end').value;
    var tuesdayPause = document.getElementById('tuesday-pause').value;

    var wednesdayStart = document.getElementById('wednesday-start').value;
    var wednesdayEnd = document.getElementById('wednesday-end').value;
    var wednesdayPause = document.getElementById('wednesday-pause').value;

    var thursdayStart = document.getElementById('thursday-start').value;
    var thursdayEnd = document.getElementById('thursday-end').value;
    var thursdayPause = document.getElementById('thursday-pause').value;

    var fridayStart = document.getElementById('friday-start').value;
    var fridayEnd = document.getElementById('friday-end').value;
    var fridayPause = document.getElementById('friday-pause').value;

    chrome.storage.sync.set({
        timeformat: timeformat,
        minPause: minPause,
        minPauseHours: minPauseHours,
        mondayStart: mondayStart,
        mondayEnd: mondayEnd,
        mondayPause: mondayPause,
        tuesdayStart: tuesdayStart,
        tuesdayEnd: tuesdayEnd,
        tuesdayPause: tuesdayPause,
        wednesdayStart: wednesdayStart,
        wednesdayEnd: wednesdayEnd,
        wednesdayPause: wednesdayPause,
        thursdayStart: thursdayStart,
        thursdayEnd: thursdayEnd,
        thursdayPause: thursdayPause,
        fridayStart: fridayStart,
        fridayEnd: fridayEnd,
        fridayPause: fridayPause
    }, function () {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.innerHTML = '<div class="alert alert-success" role="alert">Settings were saved!</div>';
        setTimeout(function () {
            status.innerHTML = '';
        }, 1000);
    });
}

function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get({
        timeformat: 'decimal',
        minPause: '0',
        minPauseHours: '6',
        mondayStart: '',
        mondayEnd: '',
        mondayPause: '',
        tuesdayStart: '',
        tuesdayEnd: '',
        tuesdayPause: '',
        wednesdayStart: '',
        wednesdayEnd: '',
        wednesdayPause: '',
        thursdayStart: '',
        thursdayEnd: '',
        thursdayPause: '',
        fridayStart: '',
        fridayEnd: '',
        fridayPause: ''
    }, function (items) {
        document.getElementById('timeformat').value = items.timeformat;
        document.getElementById('forced-pause').value = items.minPause;
        document.getElementById('forced-pause-hours').value = items.minPauseHours;

        document.getElementById('monday-start').value = items.mondayStart;
        document.getElementById('monday-end').value = items.mondayEnd;
        document.getElementById('monday-pause').value = items.mondayPause;

        document.getElementById('tuesday-start').value = items.tuesdayStart;
        document.getElementById('tuesday-end').value = items.tuesdayEnd;
        document.getElementById('tuesday-pause').value = items.tuesdayPause;

        document.getElementById('wednesday-start').value = items.wednesdayStart;
        document.getElementById('wednesday-end').value = items.wednesdayEnd;
        document.getElementById('wednesday-pause').value = items.wednesdayPause;

        document.getElementById('thursday-start').value = items.thursdayStart;
        document.getElementById('thursday-end').value = items.thursdayEnd;
        document.getElementById('thursday-pause').value = items.thursdayPause;

        document.getElementById('friday-start').value = items.fridayStart;
        document.getElementById('friday-end').value = items.fridayEnd;
        document.getElementById('friday-pause').value = items.fridayPause;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);