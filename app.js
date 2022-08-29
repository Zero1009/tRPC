const  { app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')

const createWindow = () => {
    const window = new BrowserWindow({
        width: 1280,
        height: 768,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true
        },
    })
    ipcMain.handle('readFile', (e) => {})
    ipcMain.handle('callGrpc', ()=>{})
    window.loadFile('views/index.html')
}

app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') app.quit()
})

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length === 0) createWindow();
    })


})

