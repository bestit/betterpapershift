// TODO: Save Abwesendheiten in Cookie and Consider in timetracking

// get settings
chrome.storage.sync.get({
    timeformat: 'decimal',
    minPause: '0',
    minPauseHours: 1000
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
var workdays = ['Mo','Di','Mi','Do','Fr'];

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
                    day.bruttoTime.value > parseFloat(settings.minPauseHours &&
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
    renderPseudoDays(weeks, settings);
}

function renderPseudoDays(weeks, settings){
    var currentWeek = weeks[0];
    if(currentWeek.length < 6){
        var table = document.getElementById('time_trackings_list');
        var lastDay = currentWeek.reduce(function(lastDay, day){
            if(day.name) return day;
        },null);
        var missingDays = workdays.slice(workdays.indexOf(lastDay.name)+1);
        var pseudoDayObjects = {};
        missingDays.forEach(function(dayName, index){
            var day = new Date();
            day.setDate(day.getDate() + 1 + index);

            var dayObject = {
                day: day,
                name: dayName,
                from: '07:06',
                to: '15:55',
                pause: 0.5
            };
            pseudoDayObjects[dayName] = dayObject;
            

            var row = document.createElement('tr');
            row.style = 'color: #ccc';
            row.appendChild(document.createElement('td'));

            // Day Column
            var columnDay = document.createElement('td');
            columnDay.innerHTML = dayName + ', ' + leftPad(day.getDay(),2) + '.' + leftPad(day.getMonth(),2) + '.';
            row.appendChild(columnDay);

            // Time Column
            var columnTime = document.createElement('td');
            columnTime.style = 'display:flex;';
            var fromTime = document.createElement('input');
            fromTime.style = 'width: 60px;margin-right:10px;background:#f2f2f2;border:solid 1px #e7e7e7;color:#bbb;text-align:center;';
            fromTime.value = dayObject.from;
            var toTime = document.createElement('input');
            toTime.style = 'width: 60px;margin-left:10px;background:#f2f2f2;border:solid 1px #e7e7e7;color:#bbb;text-align:center;';
            toTime.value = dayObject.to;
            columnTime.appendChild(fromTime);
            columnTime.appendChild(document.createTextNode(' - '));
            columnTime.appendChild(toTime);
            row.appendChild(columnTime);

            // Brutto Time Column
            var columnBrutto = document.createElement('td');
            columnBrutto.innerHTML = roundDecimalHour(parseFloat(hourToDecimal(toTime.value)) - parseFloat(hourToDecimal(fromTime.value))) + ' h';
            row.appendChild(columnBrutto);

            // Pause Column
            var columnPause = document.createElement('td');
            var pauseTime = document.createElement('input');
            pauseTime.style = 'width: 60px;background:#f2f2f2;border:solid 1px #e7e7e7;color:#bbb;text-align:center;';
            pauseTime.value = dayObject.pause.toString() + ' h';
            columnPause.appendChild(pauseTime);
            row.appendChild(columnPause);

            // Netto Column
            var columnNetto = document.createElement('td');
            columnNetto.innerHTML = (roundDecimalHour(hourToDecimal(dayObject.to)-hourToDecimal(dayObject.from)) - dayObject.pause) + ' h';
            row.appendChild(columnNetto);

            row.appendChild(document.createElement('td'));
            row.appendChild(document.createElement('td'));
            row.appendChild(document.createElement('td'));
            table.prepend(row);

            // functions

            // recalculate Sum
            var recalculateSum = function(){
                var total = currentWeek.rowSum.getElementsByTagName('td')[5];
                var currentNetto = currentWeek.reduce(function(sum,day){
                    if(day.nettoTime) return sum + day.nettoTime.value;
                    return sum;
                },0.0);
                var currentNettoWithoutToday = currentWeek.reduce(function(sum,day){
                    if(day.nettoTime && day !== lastDay) return sum + day.nettoTime.value;
                    return sum;
                },0.0);
                var pseudoNetto = Object.values(pseudoDayObjects).reduce(function(sum,day){
                    return sum + roundDecimalHour(hourToDecimal(day.to) - hourToDecimal(day.from) - day.pause);
                },0.0);
                var currentTotal = roundDecimalHour(currentNetto + pseudoNetto) + ' h';
                total.innerHTML = currentTotal;

                var timeRemaining = 38.5 - currentNettoWithoutToday - pseudoNetto;
                lastDay.columnTime.innerHTML = lastDay.startHour + ' - <span style="display:inline;color:red">' + decimalToHour(hourToDecimal(lastDay.startHour)+timeRemaining) + '</span> Uhr';
            }

            // recalculate Row
            var recalculateRow = function(){
                dayObject.from = fromTime.value;
                dayObject.to = toTime.value;
                var brutto = roundDecimalHour(hourToDecimal(dayObject.to)-hourToDecimal(dayObject.from));
                columnBrutto.innerHTML = brutto + ' h';
                var pause = parseFloat(pauseTime.value.slice(0,pauseTime.value.length-2));
                dayObject.pause = pause;
                columnNetto.innerHTML = roundDecimalHour(brutto - pause) + ' h';
                recalculateSum();
            }

            fromTime.onchange = recalculateRow;
            toTime.onchange = recalculateRow;
            pauseTime.onchange = recalculateRow;
            
            recalculateSum();
        });
    }
}

function renderIntoTable(weeks, settings){
    // delete included overview lines
    var sumRows = document.getElementsByClassName('sumrow');
    if(sumRows && sumRows.length > 0){
        sumRows.forEach(function(row){
            row.delete();
        });
    }

    weeks.forEach(function(week){
        if(week.rowSum) week.rowSum.remove(); 

        week.forEach(function(day){
            // Work on Zeiten
            if(day.name === 'Fr' && day.running){
                var totalHours = week.reduce(function(sum,day){
                    if(day.name !== 'Fr'){
                        return sum + day.nettoTime.value;
                    }
                    return sum;
                },0);
                var missingHours = 38.5 - totalHours;
                if(missingHours > settings.minPauseHours){
                    missingHours += parseFloat(settings.minPause);
                }
                day.columnTime.innerHTML = day.startHour + ' - <span style="display:inline;color:red">' + decimalToHour(hourToDecimal(day.startHour)+missingHours) + '</span> Uhr';
            }
            
            // Work on Dauer (Brutto) 
            if(settings.timeformat === "hour"){
                day.columnBrutto.innerHTML = decimalToHour(day.bruttoTime.value) + " h";
            }
            else{
                day.columnBrutto.innerHTML = day.bruttoTime.value.toFixed(1) + " h";
            }

            // Work on Pause
            var pauseOverlayIndex = day.columnPause.innerHTML.indexOf('<span');
            var pauseValue = day.pause.value;
            if(day.bruttoTime.value > settings.minPauseHours && pauseValue < parseFloat(settings.minPause)){
                pauseValue = parseFloat(settings.minPause);
            }
            if(settings.timeformat === "hour"){
                if(pauseOverlayIndex){
                    var pauseOverlay = day.columnPause.innerHTML.slice(pauseOverlayIndex);
                    day.columnPause.innerHTML = decimalToHour(pauseValue) + " h " + pauseOverlay;
                }
                else{
                    day.columnPause.innerHTML = decimalToHour(pauseValue)+ " h";
                }
            }
            else{
                if(pauseOverlayIndex){
                    var pauseOverlay = day.columnPause.innerHTML.slice(pauseOverlayIndex);
                    day.columnPause.innerHTML = pauseValue.toFixed(1) + " h " + pauseOverlay;
                }
                else{
                    day.columnPause.innerHTML = pauseValue.toFixed(1) + " h";
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
        sumRow.classList.add('sumrow');
        week.rowSum = sumRow;
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

function roundDecimalHour(value){
    return (Math.round((value) *100) / 100);
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