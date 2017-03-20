const electron = require('electron');
const {app, globalShortcut, autoUpdater, dialog, BrowserWindow} = require('electron')
const remote = electron.remote;
const os = require('os');
const WebContents = electron.WebContents
// Open devtools with F12
const {ipcMain} = require('electron')
var exec = require('child_process').exec;
var readline = require('readline');
const settings = require('electron-settings');
var args = require('args');

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

args
  .option('interactive', 'interactive mode')
  .option('headless', 'headless mode (needs parameters --language and --query)')
  .option('query', 'query (needed in combination with --headless)')
  .option('language', 'language (needed in combination with --headless)')

var flags = {};
if(process.argv === undefined || process.argv === null) {
  flags = args.parse('')
} else {
  flags = args.parse(process.argv);
}
if(flags.interactive) {
  settings.get().then(val => {
    var langs = val.installedLanguages;
    var process = require('process');
    var searcher = require('./search.js');
    var lang = "";
    langs.map(function(el, i) { console.log(i, el.name)});
    rl.question('', function (answer) {
      lang = val.installedLanguages[answer].fsName
      var recursiveAsyncReadLine = function () {
        rl.question('', function (answer) {
            if (answer == 'exit') //we need some base case, for recursion
                return rl.close();
            searcher.search(true, app.getPath('userData'), lang, answer, function(s) {console.log(s[0])});
            recursiveAsyncReadLine(); //Calling this function again to ask new question
        });
      };
      recursiveAsyncReadLine();
    });
  });
} else if(flags.headless) {
  settings.get().then(val => {
    var langs = val.installedLanguages;
    var process = require('process');
    var searcher = require('./search.js');
    if(!flags.language) {
      console.log("please provide an installed language with --language");
      return;
    }
    var lang = null;
    var filtered = langs.filter(function(l){ return (l['name'].toLowerCase() == flags.language); });
    if(filtered.length == 0) {
      console.log("please provide an installed language with --language");
      process.exit(2);
    }else {
      lang = filtered[0].fsName
    }
    if(!flags.query) {
      console.log("please provide a query with --query");
    }
    searcher.search(true, app.getPath('userData'), lang, flags.query, function(s) {
      // currently only
      console.log(s);
      process.exit(0);
    });
  });
} else {

  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  let win;

  var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
    // Someone tried to run a second instance, we should focus our window
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    return true;
  });

  if (shouldQuit) {
    app.quit();
    return;
  }

  app.setAsDefaultProtocolClient('devination');

  if(os.platform() == "linux") {
    var execute = function(command, callback){
        exec(command, function(error, stdout, stderr){ callback(stdout); });
    };

    // devination://test
    execute('xdg-mime default devination.desktop x-scheme-handler/devination', function(output) {
        console.log(output);
    });
  }

  function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({ width: 1400, height: 900, frame: true });

    // and load the index.html of the app.
    win.loadURL(`file://${__dirname}/index.html`);

    globalShortcut.register('Ctrl+Alt+Shift+I', () => {
      win.webContents.openDevTools();
    })

    win.on('uncaughtException', function (error) {
      dialog.showMessageBox({ type: 'info', buttons: ['Report', 'Cancel'], message: "An error has occured: " + error }, function (buttonIndex) { });
    });

    app.on('uncaughtException', function (error) {
      dialog.showMessageBox({ type: 'info', buttons: ['Report', 'Cancel'], message: "An error has occured: " + error }, function (buttonIndex) { });
    });

    new AppUpdater(win)

    // Open the DevTools.
    //  win.webContents.openDevTools();
    // Emitted when the window is closed.
    win.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      win = null;
    });
  }

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', createWindow);


  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.

  const UPDATE_SERVER_HOST = "https://devination-releases.herokuapp.com/"

  class AppUpdater {
    constructor(window) {
      if (os.platform() === "linux") {
        log("auto update on linux not supported yet");
        return
      }

      function log(s) {
        console.log("updater log: " + s);
      }

      const version = app.getVersion()
      autoUpdater.addListener("update-available", (event) => {
        log("A new update is available")
      })
      autoUpdater.addListener("update-downloaded", (event, releaseNotes, releaseName, releaseDate, updateURL) => {
        notify("A new update is ready to install", `Version ${releaseName} is downloaded and will be automatically installed on Quit`)
      })
      
      autoUpdater.addListener("error", (error) => {
        log(error)
      })
      autoUpdater.addListener("checking-for-update", (event) => {
        log("checking-for-update")
      })
      autoUpdater.addListener("update-not-available", () => {
        log("update-not-available")
      })
      autoUpdater.setFeedURL(`https://${UPDATE_SERVER_HOST}/update/${os.platform()}_${os.arch()}/${version}`)

      window.webContents.once("did-frame-finish-load", (event) => {
        autoUpdater.checkForUpdates()
      })
    }
  }

  function notify(title, message) {
    var js = 'new Notification("' + title + '", {body: "' + message + '"})'
    win.webContents.executeJavaScript(js);
  }
}
