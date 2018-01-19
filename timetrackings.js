// get settings
chrome.storage.sync.get({
    timeformat: 'decimal'
}, function (items) {
    var timeformat = items.timeformat;

    // check with an interval if the table is rendered
    var checkInterval = setInterval(function(){
        var currentTable = document.getElementById("time_trackings_list");
        if(currentTable){
            clearInterval(checkInterval);
            parse(currentTable, timeformat);

            // observe table changes to react on table filtering
            var observer = new MutationObserver(function(){
                var newTable = document.getElementById("time_trackings_list");
                if(currentTable !== newTable){
                    parse(newTable, timeformat);
                    currentTable = newTable;
                }
            });

            observer.observe(document.getElementById('trackings_list'), { attributes: false, childList: true });
        }
    }, 50);
});

var weekdays = ['Mo','Di','Mi','Do','Fr','Sa','So'];

function parse(table, timeformat){
    var rows = table.getElementsByClassName("entry");
    var totalHoursInWeek = 0;

    if(rows){
        for(var i=0; i<rows.length; i++){
            var row = rows[i];

            // get columns of netto hours
            var nettoHoursColumn = row.getElementsByClassName('netto netto_time')[0];
            // get value of netto hours
            var nettoHours = parseFloat(nettoHoursColumn.innerHTML.split(' ')[0]);

            // check if day is still running
            var timeColumn = row.getElementsByClassName("end_start_time")[0];
            var entryIsRunning = timeColumn.innerHTML.indexOf("Seit") >= 0; 

            // if day is still running
            if(entryIsRunning){
                // get pause column
                var pauseIndicator = row.querySelectorAll('[data-detailed-pauses]');
                var pauseString = pauseIndicator && pauseIndicator.length > 0 ? pauseIndicator[0].getAttribute("data-detailed-pauses") : null;
                
                // if pause column
                if(pauseString){
                    var pauseCol = row.getElementsByClassName('pause')[0];

                    // parse pause data
                    var pauseArray = pauseString.split("<br>").map(function(p){
                        var pauseData = pauseString.split(" - ");

                        // parse pause start
                        var pauseStart = new Date();
                        pauseStart.setHours(pauseData[0].split(':')[0]);
                        pauseStart.setMinutes(pauseData[0].split(':')[1]);

                        // parse pause end
                        var pauseEnd = new Date();
                        pauseEnd.setHours(pauseData[1].split(':')[0]);
                        pauseEnd.setMinutes(pauseData[1].split(':')[1]);
                        return (pauseEnd - pauseStart) / 1000 / 60 / 60;
                    });

                    // sum all pauses
                    var pauseLength = 0;
                    pauseArray.forEach(function(p){
                        pauseLength += p;
                    });

                    // if you work longer than 6h you have to take 0.5h pause
                    if(nettoHours > 6.0 && pauseLength < 0.5){
                        pauseLength = 0.5;
                    }

                    // calculate new netto hours and set pause
                    nettoHours = (Math.round((nettoHours - pauseLength) * 100) / 100);

                    // if timeformat is hour, convert and set html
                    if(timeformat === "hour"){
                        pauseCol.innerHTML = decimalToHour(pauseLength) + " h " + (pauseCol.innerHTML.substring(pauseCol.innerHTML.indexOf('<span')));
                        nettoHoursColumn.innerHTML = decimalToHour(nettoHours) + " h";
                    }
                    else{
                        nettoHoursColumn.innerHTML = nettoHours + " h";
                        pauseCol.innerHTML = (Math.round((pauseLength) *100) / 100) + " h " + (pauseCol.innerHTML.substring(pauseCol.innerHTML.indexOf('<span')));
                    }
                }
            }
            else {
                // if the row is not a currently running entry

                // if timeformat is hour
                if(timeformat === "hour"){
                    // convert the netto column to hour format
                    var nettoColumn = row.getElementsByClassName('netto')[0];
                    var nettoTime = parseFloat(nettoColumn.innerHTML.split(' ')[0]);
                    nettoColumn.innerHTML = decimalToHour(nettoTime) + ' h';

                    // convert the pause column to hour format
                    var pauseColumn = row.getElementsByClassName('pause')[0];
                    var pauseSpanIndex = pauseColumn.innerHTML.indexOf('<span');
                    var pauseTimeString = pauseColumn.innerHTML.slice(0,pauseSpanIndex-1).trim();
                    var pauseTime = parseFloat(pauseTimeString.split(' ')[0]);
                    pauseColumn.innerHTML = decimalToHour(pauseTime) + ' h ' + pauseColumn.innerHTML.substring(pauseSpanIndex);

                }
            }

            // convert brutto column to hour if timeformat is hour
            if(timeformat === "hour"){
                var bruttoColumn = row.getElementsByClassName('brutto')[0];
                var bruttoTime = parseFloat(bruttoColumn.innerHTML.split(' ')[0]);
                bruttoColumn.innerHTML = decimalToHour(bruttoTime) + ' h';
            }

            // add nettoHours to total week hours
            totalHoursInWeek += nettoHours;

            // get current day
            var dayColumnHTML = row.getElementsByClassName('day')[0].innerHTML;
            var currentDay = dayColumnHTML.split(',')[0].slice(-2);

            // if this is not the last row
            if(i < rows.length - 1){
                // get next day
                var nextDayColumnHTML = rows[i+1].getElementsByClassName('day')[0].innerHTML;
                var nextDay = nextDayColumnHTML.split(',')[0].slice(-2);
                // check if this is the first day of a week
                var newWeek = weekdays.indexOf(currentDay) < weekdays.indexOf(nextDay);

                // if first day of a week
                if(newWeek){
                    // create new table row
                    var totalString = (Math.round(totalHoursInWeek*100)/100);
                    if(timeformat === "hour"){
                        totalString = decimalToHour(totalHoursInWeek);
                    }

                    var newTR = document.createElement("tr");
                    var newTD = document.createElement("td");
                    newTD.innerHTML = '<strong>' + totalString + " h</strong>";
                    newTR.appendChild(document.createElement("td"));
                    newTR.appendChild(document.createElement("td"));
                    newTR.appendChild(document.createElement("td"));
                    newTR.appendChild(document.createElement("td"));
                    newTR.appendChild(document.createElement("td"));
                    newTR.appendChild(newTD);
                    newTR.appendChild(document.createElement("td"));
                    newTR.appendChild(document.createElement("td"));
                    newTR.appendChild(document.createElement("td"));
                    // insert table row with week total into table
                    row.parentNode.insertBefore(newTR, row.nextSibling);
                    // reset week total hours
                    totalHoursInWeek = 0;
                }
            }
        };
    }
}

// add zeros to the left
function leftPad(number, length){
    return ("0000000000" + number.toString()).slice(length * (-1));
}
// add zeros to the right
function rightPad(number, length){
    return (number.toString() + "0000000000").slice(0, length);
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