$( document ).ready(function() {

    var db = new PouchDB('csv_db');

    function getCSVFromLocalStorage(csvId) {
        return db.get(csvId);
    }
    function putCSVIntoLocalStorage(filename, data) {
        return db.put({
            _id: new Date().toISOString(),
            filename: filename,
            data: data,
            lasteditdate: formatDate(new Date())
        });
    }
    function updateCSVIntoLocalStorage(csvId, filename, savedData) {
        return db.put({
            _id: csvId,
            filename: filename,
            data: savedData,
            lasteditdate: formatDate(new Date())
        });
    }

    // Event listeners for the file upload and clear file list button
    document.getElementById('txtFileUpload').addEventListener('change', upload, false);
    document.getElementById('clear-uploads').addEventListener('click', clearUploads, false);

/**
 *
 * UPLOAD METHODS
 *
 **/
    // Method that checks that the browser supports the HTML5 File API
    function browserSupportFileUpload() {
        var isCompatible = false;

        if (window.File && window.FileReader && window.FileList && window.Blob) {
            isCompatible = true;
        }
        return isCompatible;
    }

    // Method that reads and processes the selected file
    function upload(evt) {
        if (!browserSupportFileUpload()) {
            alert('The File APIs are not fully supported in this browser!');
        } else {
            var data = null;
            var file = evt.target.files[0];
            var filename = evt.target.files[0].name;
            var reader = new FileReader();
            reader.readAsText(file);

            reader.onload = function(event) {
                var csvData = event.target.result;
                data = $.csv.toArrays(csvData);
                saveUpload(filename, data);
                putCSVIntoLocalStorage(filename, data);
                displayLocalData();
            };
            reader.onerror = function() {
                alert('Unable to read ' + file.fileName);
            };
        }
    }

    //Method that adds an uploaded file to localStorage and sets the displaydata and currentfile to the uploaded file
    function saveUpload(filename, data) {
        var timestamp = new Date().toISOString();
        var upload = {
            _id: timestamp,
            filename: filename,
            data: data,
            lasteditdate: formatDate(new Date())
        };
        if (localStorage.getItem('uploads')) {
            var UploadList = JSON.parse(localStorage.getItem('uploads'));
        } else {
            var UploadList = [];
        }
        UploadList.push(upload);
        db.put(upload, function callback(err, result) {
            console.log(result.id);
            if (!err) {
                console.log('Successfully saved a CSV');
            }
        });
        var test = db.get(result.id);
        localStorage.setItem('uploads', JSON.stringify(UploadList));
        localStorage.setItem("displaydata", JSON.stringify(data));
        localStorage.setItem("currentfile", filename);
        localStorage.setItem("currentid", timestamp);
        renderFileList();
    }

    //Method for formatting time
    function formatDate(time) {
        var am_or_pm = "am";
        var hours = time.getHours();
        if (hours > 12) {
            hours = hours - 12;
            am_or_pm = "pm";
        } else if(hours = 12) {
            am_or_pm = "pm";
        }
        return hours + ":" + ("0" + time.getMinutes()).slice(-2) + am_or_pm + " " +
            ("0"+(time.getMonth()+1)).slice(-2) + "-" + ("0" + time.getDate()).slice(-2) + "-" + ("0" + time.getFullYear()).slice(-2);
    };

/**
 *
 * FILE LIST METHODS
 *
 **/
    //Method for rendering the file list to the page
    function renderFileList() {
        var files = JSON.parse(localStorage.getItem('uploads'));
        var displaySelectedData = function() {
            var key = this.id;
            for (var i = 0; i < files.length; i++) {
                if (files[i]._id == key) {
                    var selectedData = JSON.stringify(files[i].data);
                    localStorage.setItem("currentfile", files[i].filename);
                    localStorage.setItem("displaydata", selectedData);
                    displayLocalData();
                }
            }
        };
        //Clear the old file list
        $("#file-list").html('');
        //If there are uploads in localstorage, add them to the file list
        if (localStorage.getItem('uploads')) {
            for (var i = 0; i < files.length; i++) {
                var filename = files[i].filename;
                var filekey = files[i].key;
                var lasteditdate = files[i].lasteditdate;

                $("#file-list").append('<div id="'+filekey+'" class="file"><a>' + filename + '</a></div><div class="file-date">Last Update: ' + lasteditdate + '</div>');
                document.getElementById(filekey).addEventListener('click', displaySelectedData, false);
            }
        }
    }

    //Method for removing all files from localStorage and clearing the table.
    function clearUploads() {
        localStorage.clear();
        clearDisplayData();
        renderFileList();
    }

/**
 *
 * AG-GRID DISPLAY METHODS
 *
 **/
    //Method for displaying an new ag-grid using the current localstorage data
    function displayLocalData() {
        var csvData = JSON.parse(localStorage.getItem("displaydata"));
        var filename = localStorage.getItem("currentfile");
        // var csvData = getCSVFromLocalStorage(csvId);
        removeOldAgGrid();
        addAgGrid(csvData);
    }

    //Method to clear localStorage and the file upload value, remove the ag-Grid, and hide the clear data button
    function clearDisplayData() {
        localStorage.removeItem("displaydata");
        $("#txtFileUpload").val('');
        $("#clear-data").hide();
        $("#export").hide();
        $("#ag-grid-header").html('');
        removeOldAgGrid();
    }

    //Method to clear the contents of the grid and its header
    function removeOldAgGrid() {
        $("#ag-grid").html('');
    }

    //Method to add an ag-Grid to the page
    function addAgGrid(data) {
        var columnDefs = [];
        var rowData = [];
        var filename = localStorage.getItem("currentfile");
        var file_id = localStorage.getItem("currentid");
        $("#ag-grid-header").html('<h4 class="grid-header">Upload Results for '+filename+'</h4>');
        for (var i = 0; i < data[0].length; i++) {
            var header = data[0][i];
            columnDefs.push({
                headerName: header,
                field: header.toLowerCase(),
                editable: true,
                cellEditor: 'text'
            });
        }
        for (var i = 1; i < data.length; i++) {
            var rowObject = {};

            for (var j = 0; j < data[i].length; j++) {
                var rowObjectKey = data[0][j].toLowerCase();
                rowObject[rowObjectKey] = data[i][j];
            }
            rowData.push(rowObject);
        }
        var gridOptions = {
            columnDefs: columnDefs,
            enableColResize: true,
            enableFilter: true,
            enableSorting: true
        };
        //Method for exporting the displayed CSV
        var onExport = function() {
            var exportParams = {
                fileName: filename
            };
            gridOptions.api.exportDataAsCsv(exportParams);
        };
        //Method for saving updated CSV
        var onSave = function() {
            var exportParams = {
                fileName: filename
            };
            var savedCSV = gridOptions.api.getDataAsCsv(exportParams);
            var savedData = $.csv.toArrays(savedCSV);
            var files = JSON.parse(localStorage.getItem('uploads'));

            for (var i = 0; i < files.length; i++) {
                if (files[i]._id === file_id) {
                    files[i].data = savedData;
                    files[i].lasteditdate = formatDate(new Date());
                    localStorage.setItem("currentfile", files[i].filename);
                    localStorage.setItem("displaydata", JSON.stringify(savedData));
                    $(".file-date").text("Last Update: " + files[i].lasteditdate);
                }
            }
            localStorage.setItem('uploads', JSON.stringify(files));
            renderFileList();
            alert("Successfully Saved "+localStorage.getItem("currentfile"));
        };
        //Add ag-Grid to the page with the defined grid options
        var eGridDiv = document.querySelector('#ag-grid');
        new agGrid.Grid(eGridDiv, gridOptions);
        //Add the row data to the grid
        gridOptions.api.setRowData(rowData);
        //Add save, download, and clear buttons to the grid header and attach their event listeners
        $("#ag-grid-header").append('<div class="grid-header" id="grid-buttons"><div id="save" class="btn btn-primary buttons"><span class="glyphicon glyphicon-floppy-disk"></span></div><div id="export" class="btn btn-success buttons"><span class="glyphicon glyphicon-download-alt"></span></div><div id="clear-data" class="btn btn-danger buttons"><span class="glyphicon glyphicon-remove"></span></div></div>');
        document.getElementById('clear-data').addEventListener('click', clearDisplayData, false);
        document.getElementById('export').addEventListener('click', onExport, false);
        document.getElementById('save').addEventListener('click', onSave, false);
    }

    renderFileList();

    if (localStorage.getItem("displaydata")) {
        displayLocalData();
    }
});