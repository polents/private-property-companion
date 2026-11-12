const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('companion', {
  getState: () => ipcRenderer.invoke('state:get'),
  saveState: data => ipcRenderer.invoke('state:save', data),
  ollamaStatus: () => ipcRenderer.invoke('ollama:status'),
  pullModel: model => ipcRenderer.invoke('ollama:pull', model),
  sendMessage: (history, text) => ipcRenderer.invoke('chat:send', history, text),
  openWindow: view => ipcRenderer.invoke('window:open', view),
  hidePet: () => ipcRenderer.invoke('window:hide-pet'),
  showPet: () => ipcRenderer.invoke('window:show-pet'),
  contextMenu: () => ipcRenderer.invoke('window:context-menu'),
  characters: () => ipcRenderer.invoke('assets:characters'),
  onState: callback => ipcRenderer.on('state-updated', (_event, value) => callback(value)),
  onSound: callback => ipcRenderer.on('sound:play', callback),
  onProgress: callback => ipcRenderer.on('ollama:progress', (_event, value) => callback(value))
});
