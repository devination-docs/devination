
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


var sqlite3 = require("sqlite3").verbose();
function getDB(language) {
    var file = path.join(app.getPath('userData'), "/docsets/" + language + "/Contents/Resources/docSet.dsidx");
    var exists = fs.existsSync(file);
    // console.log(file);
    if (exists) {
        return new sqlite3.Database(file);
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

devination.ports.search.subscribe(function (options) {
    var cb = function (result) {
        devination.ports.searchResult.send(result);
    };
    var searchResult = getCache(options[0], options[1], cb);
});

function getCache(language, term, cb) {
    var db = getDB(language);
    if (term.length > 2) {
        db.serialize(function () {
            var cache = [];
            var query = "";
            db.get("SELECT count(*) as zdash FROM sqlite_master WHERE type='table' AND name='searchIndex'", [], function (err, s) {
                if (!s.zdash) {
                    query = "SELECT ztoken.ztokenname as name, ztokentype.ztypename as kind, zfilepath.zpath as path, ztokenmetainformation.zanchor as id "
                        + "FROM ztoken "
                        + "JOIN ztokenmetainformation ON ztoken.zmetainformation = ztokenmetainformation.z_pk "
                        + "JOIN zfilepath ON ztokenmetainformation.zfile = zfilepath.z_pk "
                        + "JOIN ztokentype ON ztoken.ztokentype = ztokentype.z_pk "
                        + "WHERE zfilepath.zpath LIKE \"%" + term + "%\" AND ztokenmetainformation.zanchor IS NOT NULL";
                } else {
                    query = "SELECT cast(id as text) as id, name, path, type as kind FROM searchIndex where name LIKE '%" + term + "%'"
                }
                var t = db.all(query, function (err, row) {
                    if (err !== null) { console.log("error query: ", err); }
                    if (row !== undefined) { cb(row) };
                });
            });
        });
    }
}

devination.ports.download.subscribe(function (info) {
    var url = info[1]
    var language = info[0]
    var read = request.get(url);
    var write = targz().createWriteStream(path.join(app.getPath('userData'), "/docsets/"));
    var piped = read.pipe(write);
    // write.on('end', function() {
    //     console.log("end")
    // //    this callback does not work
    // // https://github.com/alanhoff/node-tar.gz/issues/40
    //     // var files = fs.readdirSync("docsets/" + language + "/");
    //     // var foundPath = files[0];
    // })
    console.log(url);
    console.log(path.join(app.getPath('userData'), "/docsets/"));
    var s =  
        { name : language
        , logo : ""
        , fsName : language + ".docset"
        // fsName: foundPath
        , icon: info[2]
        , icon2x: info[3]
        }
    devination.ports.downloadResult.send(s);
});


devination.ports.removeDocset.subscribe(function (language) {
    deleteFolderRecursive(path.join(app.getPath('userData'), "/docsets/" + language));
    devination.ports.removeDocsetResult.send(language);
});

var deleteFolderRecursive = function (path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
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
