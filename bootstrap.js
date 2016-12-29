
'use strict'
/* global Elm */ // This will keep your linter happy
var fs = require('fs');
var http = require('http');
var targz = require('tar.gz');
var request = require('request');
var path = require('path');
const settings = require('electron-settings');
const remote = require('electron').remote;
const app = remote.app;
const ipcRenderer = require("electron").ipcRenderer
var tar = require('tar');
var fstream = require('fstream');
var zlib = require('zlib');
var SQL = require('sql.js');
const {dialog} = require('electron').remote;

function getDB(l) {
    var language = path.normalize(l).replace(/^(\.\.[\/\\])+/, '')
    var file = path.join(app.getPath('userData'), "/docsets/" + language + "/Contents/Resources/docSet.dsidx");
    var exists = fs.existsSync(file);
    if (exists) {
        var filebuffer = fs.readFileSync(file);
        return new SQL.Database(filebuffer);
    } else {
        //oh shit, todo: handle this
        console.log('couldnt open database file: ' + file);
        return null;
    }
}
// get a reference to the div where we will show our UI
let container = document.getElementById('container')

// start the elm app in the container
// and keep a reference for communicating with the app
let devination = Elm.Main.fullscreen();

devination.ports.showError.subscribe(function (error) {
    dialog.showMessageBox({ type: 'info', buttons: ['Report', 'Cancel'], message: "An error has occured: " + error }, function (buttonIndex) { });
});

devination.ports.search.subscribe(function (options) {
    var cb = function (result) {
        devination.ports.searchResult.send(result);
    };
    var searchResult = getCache(options[0], options[1], cb);
});

function getCache(language, term, cb) {
    var db = getDB(language);
    if (term.length > 2 && term.length % 2 == 0) {
        var cache = [];
        var query = "";
        var s = db.exec("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='searchIndex'");
        // if(err !== null) {
        //     dialog.showMessageBox({ type: 'info', buttons: ['Report', 'Cancel'], message: "An error has occured: " + err }, function (buttonIndex) { });
        // }
        if (!s[0]['values'][0][0]) {
            // query = "SELECT ztokenmetainformation.zanchor as id, ztoken.ztokenname as name, ztokentype.ztypename as kind, zfilepath.zpath as path"
            query = "SELECT ztokenmetainformation.zanchor as id, ztoken.ztokenname as name, zfilepath.zpath as path"
                + "FROM ztoken "
                + "JOIN ztokenmetainformation ON ztoken.zmetainformation = ztokenmetainformation.z_pk "
                + "JOIN zfilepath ON ztokenmetainformation.zfile = zfilepath.z_pk "
                + "JOIN ztokentype ON ztoken.ztokentype = ztokentype.z_pk "
                + "WHERE zfilepath.zpath LIKE '%" + term + "%' AND ztokenmetainformation.zanchor IS NOT NULL LIMIT 50";
        } else {
            // query = "SELECT cast(id as text) as id, name, path, type as kind FROM searchIndex where name LIKE '%" + term + "%'"
            query = "SELECT cast(id as text) as id, name, path FROM searchIndex where name LIKE '%" + term + "%' LIMIT 50"
        }
        var t = db.exec(query);
        if(t[0]) {
            cb(t[0]['values'].map(function(x){ 
                return { 
                    "id" : x[0],
                    "name" : x[1],
                    "path" : x[2]
                    // , "kind" : x[3]
                } 
            }));
        }else {
            cb([]);
        } 
    }
}


devination.ports.download.subscribe(function (info) {
    var url = info[1];
    var language = info[0];
    var read = request.get(url);
    var i = 0;
    var p = "";
    var prepareRecord = function (path) {
        if (p === "") {
            s = 
                { name : language
                , logo : ""
                , fsName : path
                , icon: info[2]
                , icon2x: info[3]
                }
        } else {
            s = "";
        }
               
        return s;
    };

    var write = targz().createWriteStream(path.join(app.getPath('userData'), "/docsets/"));
  
    write.on('entry', function(entry){
        if(i !== 0) { return }
        p = entry.path;
        devination.ports.extractionStart.send(p);
        i++; 
    });

    write.on('end', function(entry) {
        devination.ports.downloadResult.send(prepareRecord(p));
    });

    var piped = read.pipe(write);
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
