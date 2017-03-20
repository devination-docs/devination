var os = require('os');
var path = require('path');
var fs = require('fs');

if (os.platform() === "linux") {
    var sqlite3 = require('sqlite3').verbose();
} else {
    var SQL = require('sql.js');
}

module.exports = {
    search: function (headless, basePath, language, term, cb) {
        return search(headless, basePath, language, term, cb);
    }
}

function getDB(headless, basePath, l) {
    var language = path.normalize(l).replace(/^(\.\.[\/\\])+/, '')
    var file = path.join(basePath, "/docsets/" + language + "/Contents/Resources/docSet.dsidx");
    var exists = fs.existsSync(file);
    if (exists) {
        if (os.platform() === "linux" && !headless) {
            return new sqlite3.Database(file);
        } else {
            var SQL = require('sql.js');
            var filebuffer = fs.readFileSync(file);
            return new SQL.Database(filebuffer);
        }
    } else {
        //oh shit, todo: handle this
        console.log('couldnt open database file: ' + file);
        return null;
    }
}

function search(headless, basePath, language, term, cb) {
    if (os.platform() === "darwin" || os.platform() === "win32") {
        var db = getDB(headless, basePath, language);
        if (term.length > 2 && term.length % 2 == 0) {
            var cache = [];
            var query = "";
            var s = db.exec("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='searchIndex'");
            if (!s[0]['values'][0][0]) {
                // query = "SELECT ztokenmetainformation.zanchor as id, ztoken.ztokenname as name, ztokentype.ztypename as kind, zfilepath.zpath as path"
                query = "SELECT ztokenmetainformation.zanchor as id, ztoken.ztokenname as name, zfilepath.zpath as path "
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
            if (t[0]) {
                cb(t[0]['values'].map(function (x) {
                    return {
                        "id": x[0],
                        "name": x[1],
                        "path": x[2]
                        // , "kind" : x[3]
                    }
                }));
            } else {
                cb([]);
            }
        }
    } else {
        var db = getDB(false, basePath, language);
        if (term.length > 2) {
            db.serialize(function () {
                var cache = [];
                var query = "";
                db.get("SELECT count(*) as zdash FROM sqlite_master WHERE type='table' AND name='searchIndex'", [], function (err, s) {
                    if (err !== null) {
                        console.log("error", err);
                    }
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
}
