// TODO: Save Abwesendheiten in Cookie and Consider in timetracking

// get settings
chrome.storage.sync.get({
    timeformat: 'decimal',
    minPause: '0',
    minPauseHours: undefined
}, function (items) {
    var settings = {
        timeformat: items.timeformat,
        minPause: items.minPause,
        minPauseHours: items.minPauseHours
    };

    // check with an interval if the table is rendered
    var checkInterval = setInterval(function(){
        var currentTable = document.getElementById("time_trackings_list");
        if(currentTable){
            clearInterval(checkInterval);
            parse(currentTable, settings);

            // observe table changes to react on table filtering
            var observer = new MutationObserver(function(){
                var newTable = document.getElementById("time_trackings_list");
                if(currentTable !== newTable){
                    parse(newTable, settings);
                    currentTable = newTable;
                }
            });

            observer.observe(document.getElementById('trackings_list'), { attributes: false, childList: true });
        }
    }, 50);
});

var weekdays = ['Mo','Di','Mi','Do','Fr','Sa','So'];

function parse(table, settings){
    var rows = table.getElementsByClassName("entry");
    var weeks = [];
    var totalHoursInWeek = 0;

    // parse row data
    if(rows){
        var week = [];
        for(var i=0; i<rows.length; i++){
            var row = rows[i];
            
            // get current day
            var dayColumn = row.getElementsByClassName('day')[0];
            var dayColumnHTML = dayColumn.innerHTML;
            var currentDayName = dayColumnHTML.split(',')[0].slice(-2);
            var currentDayMeta = dayColumn.getElementsByTagName('span')[0].innerHTML;
            var currentDayDateString = currentDayMeta.substring(0, 8);
            var currentDayHourString = currentDayMeta.slice(-5);
            var day = {
                row: row,
                name: currentDayName,
                startDate: new Date(currentDayDateString.slice(0,4), parseInt(currentDayDateString.slice(4,6))-1, currentDayDateString.slice(6,8), currentDayHourString.split(':')[0], currentDayHourString.split(':')[1]),
                startHour: currentDayHourString,
            };
            day.columnDay = dayColumn;
            
            // get netto hours
            var nettoHoursColumn = row.getElementsByClassName('netto netto_time')[0];
            var nettoHours = parseFloat(nettoHoursColumn.innerHTML.split(' ')[0]);
            day.nettoHours = {
                value: nettoHours,
                html: nettoHoursColumn.innerHTML
            };
            day.columnNetto = nettoHoursColumn;

            // get brutto hours
            var bruttoColumn = row.getElementsByClassName('brutto')[0];
            var bruttoTime = parseFloat(bruttoColumn.innerHTML.split(' ')[0]);
            day.bruttoTime = {
                value: bruttoTime,
                html: bruttoColumn.innerHTML
            };
            day.columnBrutto = bruttoColumn;

            // check if day is still running
            var timeColumn = row.getElementsByClassName("end_start_time")[0];
            var entryIsRunning = timeColumn.innerHTML.indexOf("Seit") >= 0; 
            day.running = entryIsRunning;
            day.columnTime = timeColumn;
            if(entryIsRunning){
                day.endHour = null;
            }
            else{
                var times = timeColumn.innerHTML.substring(timeColumn.innerHTML.indexOf('</span>')+8).trim().split(' - ');
                day.endHour = times[1].split(' ')[0];
            }

            // get pause
            var pauseColumn = row.getElementsByClassName('pause')[0];
            var pauseString = pauseColumn.innerHTML.trim();
            var pauseValue = null;
            var pause = {
                value: 0,
                items: []
            };
            if(entryIsRunning){
                var hasUnregisteredPause = pauseColumn.getElementsByTagName('span').length > 0;
                if(!hasUnregisteredPause){
                    pauseValue = 0.0;
                }
            }
            if(pauseValue === null){
                var pauseValueString = pauseString;
                var pauseDetailedOverlay = pauseColumn.getElementsByTagName('i');
                var pauseDetailedString = null;
                if(pauseDetailedOverlay && pauseDetailedOverlay.length > 0){
                    pauseValueString = pauseString.substring(0,pauseString.indexOf('<span')-1).split(' ')[0];
                    pauseDetailedString = pauseColumn.getElementsByTagName('i')[0].getAttribute('data-detailed-pauses');
                }
                var pauseDetails = [];
                if(pauseDetailedString){
                    pauseDetails = pauseDetailedString.split('<br>');
                }
                pause = {
                    value: parseFloat(pauseValueString),
                    items: []
                };
                pauseDetails.map(function(p){
                    var start = p.split(' - ')[0];
                    var end = p.split(' - ')[1];
                    var value = hourToDecimal(end) - hourToDecimal(start);
                    pause.items.push({
                        start: start,
                        end: end,
                        value: value
                    });
                    if(entryIsRunning){
                        pause.value += value;
                    }
                });

                if(
                    settings.minPauseHours &&
                    day.bruttoTime.value > parseFloat(setting.minPauseHours &&
                        pause.value < parseFloat(settings.minPause)
                )){
                    pause.value = parseFloat(settings.minPause);
                }
            }
            day.pause = pause;

            // start new week
            if(i === rows.length-1){
                week.unshift(day);
                weeks.push(week);
                week = [];
            }
            else if(week.length > 0 && weekdays.indexOf(week[0].name) < weekdays.indexOf(day.name)){
                weeks.push(week);
                week = [];
            }

            week.unshift(day);

        }
    }

    console.log("Weeks", weeks);

    renderIntoTable(weeks); 
}

function renderIntoTable(weeks){
    // delete included overview lines

    weeks.forEach(function(week){
        week.forEach(function(day){
            // Work on Zeiten
            
            // Work on Dauer (Brutto) 
            // Work on Pause
            // Work on Dauer (Netto)
        });
        // include overview line
    });
}

// add zeros to the left
function leftPad(number, length){
    return ("0000000000" + number.toString()).slice(length * (-1));
}
// add zeros to the right
function rightPad(number, length){
    return (number.toString() + "0000000000").slice(0, length);
}

// convert number format to decimal
function hourToDecimal(rawtime){
    var hours = parseFloat(rawtime.split(':')[0]);
    var minutes = parseInt(rawtime.split(':')[1]);
    return hours + (minutes / 60);
}

// convert a dezimal number to hour format (2.5h => 2:30h)
function decimalToHour(rawtime){
    if(rawtime == "0") return "0:0";

    var time = (Math.round((rawtime) *100) / 100);
    var timeHours =  Math.floor(time);
    var timeMinuts = Math.round(parseInt(rightPad(time.toString().split('.')[1], 2)) / 100 * 60);
    var final = timeHours + ":" + leftPad(timeMinuts,2)
    return final;
}