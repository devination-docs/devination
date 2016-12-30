if(require('electron-squirrel-startup')) return;
const electron = require('electron');
// Module to control application life.
const {app, globalShortcut, dialog} = require('electron')
const {autoUpdater} = require("electron-auto-updater")
// Module to create native browser window.
const {BrowserWindow} = electron;
const os = require('os');
const WebContents = electron.WebContents
// Open devtools with F12
const remote = electron.remote;
const {ipcMain} = require('electron')
var exec = require('child_process').exec;

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

  execute('xdg-mime default devination-app.desktop x-scheme-handler/devination', function(output) {
      console.log(output);
  });
}

function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({ width: 1400, height: 900, frame: false });

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
  
  app.on('open-url', function (event, url) {
    event.preventDefault();
    app.quit();
    win.webContents.send('external-link', {msg: url});
  });
  app.on('open-file', function (event, url) {
    event.preventDefault();
    win.webContents.send('external-link', {msg: url});
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

const UPDATE_SERVER_HOST = "devination-releases.herokuapp.com"

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
      notify("A new update is available")
    })
    autoUpdater.addListener("update-downloaded", (event, releaseNotes, releaseName, releaseDate, updateURL) => {
      notify("A new update is ready to install", `Version ${releaseName} is downloaded and will be automatically installed on Quit`)
    })
    
    autoUpdater.addListener("error", (error) => {
      notify("error", error)
    })
    autoUpdater.addListener("checking for-update", (event) => {
      notify("checking-for-update", `you are currently running ${version}`)
    })
    autoUpdater.addListener("update-not-available", () => {
      // notify("update not available", "you are using the latest version")
    })
    if(os.platform() !== "win32") {
      autoUpdater.setFeedURL(`https://${UPDATE_SERVER_HOST}/update/${os.platform()}_${os.arch()}/${version}`)
    } else {
    }

    window.webContents.once("did-frame-finish-load", (event) => {
      autoUpdater.checkForUpdates()
    })
  }
}

function notify(title, message) {
  var js = 'new Notification("' + title + '", {body: "' + message + '"})'
  win.webContents.executeJavaScript(js);
}