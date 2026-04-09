import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('windbase', {
  appName: 'WindBase'
});
