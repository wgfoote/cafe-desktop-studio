// The only doorway between the pages and the computer: a few named requests, all confined to the Cafe Data folder.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cafeDesktop', {
  info: () => ipcRenderer.invoke('cafe:info'),
  list: sub => ipcRenderer.invoke('cafe:list', sub),
  readText: rel => ipcRenderer.invoke('cafe:readText', rel),
  writeText: (rel, text) => ipcRenderer.invoke('cafe:writeText', rel, text),
  reveal: rel => ipcRenderer.invoke('cafe:reveal', rel)
});
