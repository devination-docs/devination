
'use strict'
/* global Elm */ // This will keep your linter happy
var fs = require('fs');
var http = require('http');
var request = require('request');
var path = require('path');
const settings = require('electron-settings');
const remote = require('electron').remote;
const app = remote.app;
const ipcRenderer = require("electron").ipcRenderer
var tar = require('tar');
var fstream = require('fstream');
var zlib = require('zlib');
const {dialog} = require('electron').remote;
var wget = require('wget')
var uuid = require('node-uuid');
var exec = require('child_process').exec;
var temp = require('temp');
var util  = require('util');
var os = require('os');
var search = require('./search.js');
//autoremove temp files on exit
temp.track();


app.on('open-url', function (event, url) {
    event.preventDefault();
    console.log("open url", url);
    //   win.webContents.send('external-link', {msg: url});
    // win.webContents.send('external-link', {msg: url});
    devination.ports.externalSearch(url);
});

app.on('open-file', function (event, url) {
    event.preventDefault();
    console.log('open file', url);
    // win.webContents.send('external-link', {msg: url});
    devination.ports.externalSearch(url);

});

// get a reference to the div where we will show our UI
let container = document.getElementById('container')

// start the elm app in the container
// and keep a reference for communicating with the app
let devination = Elm.Main.fullscreen();

// ipcRenderer.on('external-link', function(event , data) { 
//     console.log(data);
//     devination.ports.externalSearch(data);
// });

devination.ports.showError.subscribe(function (error) {
    dialog.showMessageBox({ type: 'info', buttons: ['Report', 'Cancel'], message: "An error has occured: " + error }, function (buttonIndex) { });
});

devination.ports.search.subscribe(function (options) {
    var cb = function (result) {
        devination.ports.searchResult.send(result);
    };
    var searchResult = search.search(false, app.getPath('userData'), options[0], options[1], cb);
});

var extractTarball = function (sourceFile, destination, callback) {
  if( /(gz|tgz)$/i.test(sourceFile)) {
    // This file is gzipped, use zlib to deflate the stream before passing to tar.
    fs.createReadStream(sourceFile)
    .pipe(zlib.createGunzip())
    .pipe(tar.Extract({ path: destination}))
    .on('error', function(er) { callback(er)})
    // .on('end', function() { callback(null)})
    .on('entry', function(e) { callback(e)})
  } else {
    // This file is not gzipped, just deflate it.
    fs.createReadStream(sourceFile)
    .pipe(tar.Extract({ path: destination}))
    .on('error', function(er) { callback(er)})
    // .on('end', function() { callback(null)})
    .on('entry', function(e) { callback(e)})
  }
};

var extractTarballDownload = function (url, downloadFile, destination, options, callback) {
  var resultSent = 0;

  if(!options) options = {}
  var download = wget.download(url, downloadFile, options)
  download.on('error', function(err){
    callback('error', {error: err})
  })
  download.on('end', function(output) {
    devination.ports.extractionStart.send(downloadFile.split("/").pop());
    extractTarball(output, destination, function(err, data){
    resultSent++;
      if(resultSent === 1) {
        callback(null, {url: url, downloadFile: downloadFile, destination: destination, fileName: err.path});
      }
    })
  })
};



devination.ports.download.subscribe(function (info) {
    var url = info[1];
    var language = info[0];
    var read = request.get(url);
    var uuid_file = uuid.v1();
    var destination = path.join(app.getPath('userData'), "/docsets/", uuid_file);

    var cb = function (err, result) {
        if (err) {
            dialog.showMessageBox({ type: 'info', buttons: [], message: "An error has occured: " + result['error'] }, function (buttonIndex) { });
            app.relaunch();
            return;
        }
        var s = 
            { name : language
            , logo : ""
            , fsName : path.join(path.join(uuid_file, result.fileName))
            , icon: info[2]
            , icon2x: info[3]
            }
        devination.ports.downloadResult.send(s);
    };
    var tempName = temp.path({suffix: ".tar.gz"});
    extractTarballDownload(url, tempName, destination, {}, cb)
});


devination.ports.removeDocset.subscribe(function (l) {
    var language = path.normalize(l).replace(/^(\.\.[\/\\])+/, '')
    deleteFolderRecursive(path.join(app.getPath('userData'), "/docsets/" + language));
    devination.ports.removeDocsetResult.send(language);
});

var deleteFolderRecursive = function (path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

var s =
    {
        officialFeed: "http://api.zealdocs.org/v1/docsets"
        , officialDownloadFeed: "http://sanfrancisco.kapeli.com/feeds"
        , userFeed: "http://sanfrancisco.kapeli.com/feeds/zzz/user_contributed/build/"
        , installedLanguages: []
        , dataPath: app.getPath('userData')
    }

settings.defaults(s);

devination.ports.resetToDefaults.subscribe(function (obj) {
    deleteFolderRecursive(path.join(app.getPath('userData'), "/docsets"));
    settings.defaults(s);
    settings.resetToDefaults();
});

devination.ports.setSettings.subscribe(function (obj) {
    settings.defaults(obj);
    settings.resetToDefaults();
});

devination.ports.getSettings.subscribe(function (obj) {
    settings.get().then(val => {
        devination.ports.settingsResult.send(val);
    });
});
