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
            day.nettoTime = {
                value: parseFloat(nettoHours),
                html: nettoHoursColumn.innerHTML
            };
            day.columnNetto = nettoHoursColumn;

            // get brutto hours
            var bruttoColumn = row.getElementsByClassName('brutto')[0];
            var bruttoTime = parseFloat(bruttoColumn.innerHTML.split(' ')[0]);
            day.bruttoTime = {
                value: parseFloat(bruttoTime),
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
            day.columnPause = pauseColumn;
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
                pause.value = (Math.round((pause.value) *100) / 100);
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

    renderIntoTable(weeks, settings); 
}

function renderIntoTable(weeks, settings){
    // delete included overview lines

    weeks.forEach(function(week){
        if(week.rowOverview) week.rowOverview.remove(); 

        week.forEach(function(day){
            // Work on Zeiten
            
            // Work on Dauer (Brutto) 
            if(settings.timeformat === "hour"){
                day.columnBrutto.innerHTML = decimalToHour(day.bruttoTime.value) + " h";
            }
            else{
                day.columnBrutto.innerHTML = day.bruttoTime.value.toFixed(1) + " h";
            }

            // Work on Pause
            var pauseOverlayIndex = day.columnPause.innerHTML.indexOf('<span');
            if(settings.timeformat === "hour"){
                if(pauseOverlayIndex){
                    var pauseOverlay = day.columnPause.innerHTML.slice(pauseOverlayIndex);
                    day.columnPause.innerHTML = decimalToHour(day.pause.value) + " h " + pauseOverlay;
                }
                else{
                    day.columnPause.innerHTML = decimalToHour(day.pause.value)+ " h";
                }
            }
            else{
                if(pauseOverlayIndex){
                    var pauseOverlay = day.columnPause.innerHTML.slice(pauseOverlayIndex);
                    day.columnPause.innerHTML = day.pause.value.toFixed(1) + " h " + pauseOverlay;
                }
                else{
                    day.columnPause.innerHTML = day.pause.value.toFixed(1) + " h";
                }
            }

            // Work on Dauer (Netto)
            var correctedNettoTime = day.nettoTime.value;
            if(day.running){
                correctedNettoTime = day.nettoTime.value - day.pause.value;
            }
            if(settings.timeformat === "hour"){
                day.columnNetto.innerHTML = decimalToHour(correctedNettoTime) + " h";
            }
            else{
                day.columnNetto.innerHTML = correctedNettoTime.toFixed(1) + " h";
            }
        });

        // include overview line
        var sumRow = document.createElement('tr');
        sumRow.appendChild(document.createElement('td'));
        sumRow.appendChild(document.createElement('td'));
        sumRow.appendChild(document.createElement('td'));

        var bruttoSum = document.createElement('td');
        var bruttoSumValue = (Math.round((week.reduce(function(sum, day){ return sum + day.bruttoTime.value }, 0)) *100) / 100);
        if(settings.timeformat === "hour"){
            bruttoSum.innerHTML = decimalToHour(bruttoSumValue) + ' h'; 
        }
        else{
            bruttoSum.innerHTML = bruttoSumValue + ' h'; 
        }
        sumRow.appendChild(bruttoSum);

        var pauseSum = document.createElement('td');
        var pauseSumValue = (Math.round((week.reduce(function(sum, day){ return sum + day.pause.value }, 0)) *100) / 100);
        if(settings.timeformat === "hour"){
            pauseSum.innerHTML = decimalToHour(pauseSumValue) + ' h'; 
        }
        else{
            pauseSum.innerHTML = pauseSumValue + ' h'; 
        }
        sumRow.appendChild(pauseSum);

        var nettoSum = document.createElement('td');
        var nettoSumValue = (Math.round((week.reduce(function(sum, day){ return sum + day.nettoTime.value }, 0)) *100) / 100);
        if(settings.timeformat === "hour"){
            nettoSum.innerHTML = decimalToHour(nettoSumValue) + ' h'; 
        }
        else{
            nettoSum.innerHTML = nettoSumValue + ' h'; 
        }
        nettoSum.style = 'font-weight:bold;';
        sumRow.appendChild(nettoSum);

        sumRow.classList.add('entry');
        sumRow.style = 'display:table-row;background-color:#e7e7e7;';
        sumRow.appendChild(document.createElement('td'));
        sumRow.appendChild(document.createElement('td'));
        sumRow.appendChild(document.createElement('td'));

        week[0].row.parentNode.insertBefore(sumRow, week[0].row.nextSibling);
    });

    // replace values in total sum row at bottom

    setTimeout(function(){
        var totalSumBrutto = document.getElementById('sum_brutto');
        var totalSumBruttoValue = (Math.round((weeks.reduce(function(sum, week){
            return sum + week.reduce(function(sum, day){
                return sum + day.bruttoTime.value;
            },0);
        }, 0)) *100) / 100);
        if(settings.timeformat === "hour"){
            totalSumBrutto.innerHTML = decimalToHour(totalSumBruttoValue) + ' h'; 
        }
        else{
            totalSumBrutto.innerHTML = totalSumBruttoValue + ' h'; 
        }

        var totalSumPause = document.getElementById('sum_pause');
        var totalSumPauseValue = (Math.round((weeks.reduce(function(sum, week){
            return sum + week.reduce(function(sum, day){
                return sum + day.pause.value;
            },0);
        }, 0)) *100) / 100);
        if(settings.timeformat === "hour"){
            totalSumPause.innerHTML = decimalToHour(totalSumPauseValue) + ' h'; 
        }
        else{
            totalSumPause.innerHTML = totalSumPauseValue + ' h'; 
        }

        var totalSumNetto = document.getElementById('sum_netto');
        var totalSumNettoValue = (Math.round((weeks.reduce(function(sum, week){
            return sum + week.reduce(function(sum, day){
                return sum + day.nettoTime.value;
            },0);
        }, 0)) *100) / 100);
        if(settings.timeformat === "hour"){
            totalSumNetto.innerHTML = decimalToHour(totalSumNettoValue) + ' h'; 
        }
        else{
            totalSumNetto.innerHTML = totalSumNettoValue + ' h'; 
        }
    },500);
}

// add zeros to the left
function leftPad(number, length){
    var value = number || 0;
    return ("0000000000" + value.toString()).slice(length * (-1));
}
// add zeros to the right
function rightPad(number, length){
    var value = number || 0;
    return (value.toString() + "0000000000").slice(0, length);
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
    var timeString = rawtime;
    var time = (Math.round((timeString) *100) / 100);
    var timeHours =  Math.floor(time);
    var timeMinuts = Math.round(parseInt(rightPad(time.toString().split('.')[1], 2)) / 100 * 60);
    var final = timeHours + ":" + leftPad(timeMinuts,2)
    return final;
}