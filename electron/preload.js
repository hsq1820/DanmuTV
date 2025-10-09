const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 选择保存目录
  selectDirectory: (defaultPath) => ipcRenderer.invoke('select-directory', defaultPath),
  
  // 保存文件
  saveFile: (filePath, data) => ipcRenderer.invoke('save-file', { filePath, data }),
  
  // 获取桌面路径
  getDesktopPath: () => ipcRenderer.invoke('get-desktop-path'),
});
