"use strict";
const electron = require("electron");
const wrapped = /* @__PURE__ */ new Map();
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(channel, listener) {
    const wrapper = (event, ...args) => listener(event, ...args);
    if (!wrapped.has(listener)) wrapped.set(listener, /* @__PURE__ */ new Map());
    wrapped.get(listener).set(channel, wrapper);
    electron.ipcRenderer.on(channel, wrapper);
  },
  off(channel, listener) {
    var _a;
    const wrapper = (_a = wrapped.get(listener)) == null ? void 0 : _a.get(channel);
    if (wrapper) {
      electron.ipcRenderer.off(channel, wrapper);
      wrapped.get(listener).delete(channel);
    }
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
