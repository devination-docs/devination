const electron = require('electron');
// Module to control application life.
const {app, globalShortcut, autoUpdater, dialog} = require('electron')
// Module to create native browser window.
const {BrowserWindow} = electron;
const os = require('os');
const WebContents = electron.WebContents
// Open devtools with F12
const remote = electron.remote;
const {ipcMain} = require('electron')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

app.setAsDefaultProtocolClient('devination')

app.on('open-url', function (event, url) {
  if(win)
  {
    win.webContents.send('external-link' , {msg: url});
  }
});

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