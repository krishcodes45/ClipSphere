import { ipcRenderer, contextBridge } from 'electron'

// Remember the wrapped listener for each original one, so `off` can really
// remove it (the wrapper is what gets registered with ipcRenderer).
const wrapped = new Map<unknown, Map<string, (...args: any[]) => void>>()

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(channel: string, listener: (event: unknown, ...args: any[]) => void) {
    const wrapper = (event: unknown, ...args: any[]) => listener(event, ...args)
    if (!wrapped.has(listener)) wrapped.set(listener, new Map())
    wrapped.get(listener)!.set(channel, wrapper)
    ipcRenderer.on(channel, wrapper)
  },
  off(channel: string, listener: (event: unknown, ...args: any[]) => void) {
    const wrapper = wrapped.get(listener)?.get(channel)
    if (wrapper) {
      ipcRenderer.off(channel, wrapper)
      wrapped.get(listener)!.delete(channel)
    }
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})
