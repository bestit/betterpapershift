// check with an interval if the table is rendered
var checkInterval = setInterval(function(){
    var currentTable = document.getElementById("absences_list");
    if(currentTable){
        clearInterval(checkInterval);
        parse(currentTable);

        // observe table changes to react on table filtering
        var observer = new MutationObserver(function(){
            var newTable = document.getElementById("absences_list");
            if(currentTable !== newTable){
                parse(newTable);
                currentTable = newTable;
            }
        });

        observer.observe(document.getElementById('trackings_list'), { attributes: false, childList: true });
    }
}, 50);

function parse(table){
    var rows = table.getElementsByClassName("entry");
    var approvedRows = [];
    if(rows){
        for(var i=0;i<rows.length;i++){
            var row = rows[i];
            var status = row.getElementsByClassName("label")[0];
            if(status.className.indexOf("success") >= 0){
                // Row is approved
                var hours = parseFloat(row.getElementsByClassName("hours")[0].innerHTML);
                if(hours > 0){
                    var cols = row.getElementsByTagName('td');
                    var type = cols[0].innerHTML;
                    var begin = cols[1].getElementsByTagName('span')[0].innerHTML;
                    var end = cols[2].getElementsByTagName('span')[0].innerHTML;
                    approvedRows.push({
                        type: type,
                        begin: begin,
                        end: end,
                        hours: hours
                    });
                }
            }
        };
    }

    localStorage.setItem('papershift_absences', JSON.stringify(approvedRows));
}