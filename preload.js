/* Schmale Brücke für die Startseite; die Folien-Datei sieht nur, dass sie im Programm läuft. */
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("atelierDesktop", {
  isDesktop: true,
  list: () => ipcRenderer.invoke("list"),
  open: () => ipcRenderer.invoke("open"),
  openPath: p => ipcRenderer.invoke("openPath", p),
  info: () => ipcRenderer.invoke("info")
});
