/* Schmale Brücke für die Startseite; die Folien-Datei sieht nur, dass sie im Programm läuft, und kann Pult-Notizen ablegen. */
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("atelierDesktop", {
  isDesktop: true,
  list: () => ipcRenderer.invoke("list"),
  open: () => ipcRenderer.invoke("open"),
  openPath: p => ipcRenderer.invoke("openPath", p),
  info: () => ipcRenderer.invoke("info"),
  notizen: list => ipcRenderer.invoke("notizen", list),
  pdf: muster => ipcRenderer.invoke("pdf", muster),
  /* PowerPoint: Datei suchen, als Ebene vorführen, blättern, beenden */
  pptFind: muster => ipcRenderer.invoke("pptFind", muster),
  pptStart: (id, file) => ipcRenderer.invoke("pptStart", { id, path: file }),
  pptOpen: () => ipcRenderer.invoke("pptOpen"),
  ppt: (cmd, folie) => ipcRenderer.invoke("ppt", cmd, folie),
  pptEnd: pdfStatt => ipcRenderer.invoke("pptEnd", pdfStatt || ""),
  maus: durch => ipcRenderer.invoke("maus", durch)
});
