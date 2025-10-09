const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const next = require('next');
const fs = require('fs');

const isDev = !app.isPackaged;
let mainWindow;
let nextApp;
let server;

// 设置应用名称和用户数据路径
app.setName('DanmuTV');
const userDataPath = path.join(app.getPath('appData'), 'DanmuTV');
app.setPath('userData', userDataPath);

console.log('[DanmuTV] App name:', app.getName());
console.log('[DanmuTV] User data path:', app.getPath('userData'));

// 确保用户数据目录存在
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
  console.log('[DanmuTV] Created user data directory');
}

async function startNextServer() {
  nextApp = next({ dev: false, dir: path.join(__dirname, '..') });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();
  server = http.createServer((req, res) => handle(req, res));
  
  // 使用固定端口 39527,确保 localStorage 域名一致
  const FIXED_PORT = 39527;
  
  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[DanmuTV] Port ${FIXED_PORT} is in use, trying random port...`);
        // 如果固定端口被占用,使用随机端口
        server.listen(0, 'localhost', () => {
          const port = server.address().port;
          console.log(`[DanmuTV] Server started on random port: ${port}`);
          resolve(port);
        });
      } else {
        reject(err);
      }
    });
    
    server.listen(FIXED_PORT, 'localhost', () => {
      console.log(`[DanmuTV] Server started on fixed port: ${FIXED_PORT}`);
      resolve(FIXED_PORT);
    });
  });
}

async function createWindow() {
  let url = isDev ? 'http://localhost:3000' : `http://localhost:${await startNextServer()}`;
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'DanmuTV',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // 禁用 web 安全检查以允许跨域请求
      // 使用默认 session (自动持久化到 userData)
      // partition 不设置,使用默认的持久化 session
    },
    icon: path.join(__dirname, '../public/logo.png'),
  });
  
  // 获取默认 session
  const session = mainWindow.webContents.session;
  const storagePath = session.getStoragePath();
  
  console.log('[DanmuTV] Session persist:', session.isPersistent());
  console.log('[DanmuTV] Storage path:', storagePath);
  
  // 确保存储路径存在
  if (storagePath && !fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
    console.log('[DanmuTV] Created storage directory');
  }
  
  // 禁用 CORS 限制
  session.webRequest.onBeforeSendHeaders((details, callback) => {
    const { requestHeaders } = details;
    // 移除 Origin 和 Referer,模拟服务器端请求
    delete requestHeaders['Origin'];
    delete requestHeaders['Referer'];
    // 设置更通用的 User-Agent
    requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    callback({ requestHeaders });
  });

  session.webRequest.onHeadersReceived((details, callback) => {
    const { responseHeaders } = details;
    // 添加允许跨域的响应头
    if (responseHeaders) {
      responseHeaders['Access-Control-Allow-Origin'] = ['*'];
      responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, PUT, DELETE, OPTIONS'];
      responseHeaders['Access-Control-Allow-Headers'] = ['*'];
    }
    callback({ responseHeaders });
  });
  
  mainWindow.loadURL(url);
  
  // 仅在开发模式下打开开发者工具
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (server) server.close(); });
