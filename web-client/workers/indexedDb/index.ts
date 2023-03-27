
import {
  IActions,
  IResults,
}					from "../../src/interfaces/IIndexedDbWorker"
import {
  IAction,
  IResponse,
}					from "../../src/interfaces/IWorker"

//

interface ICustomDb {
  [dbName: string]: IDBDatabase
}

//

const dbs: ICustomDb		= {}
const indexedDbFact			= self.indexedDB || (self as any).mozIndexedDB || (self as any).webkitIndexedDB || (self as any).msIndexedDB

const indexedDbSupported	= !!indexedDbFact
const dbNotSupportedError	= new Error("indexedDb not supported")
const dbDoesntExistError	= new Error("indexedDb db does not exist")

//

const assertDbSupported = (resp: IResponse<IResults>) => {
  if (indexedDbSupported) {
    return true
  }

  resp.err = dbNotSupportedError
  self.postMessage(resp)
  return false
}

const assertDbExists = (dbName: string, resp: IResponse<IResults>) => {
  if (dbName in dbs) {
    return true
  }

  resp.err = dbDoesntExistError
  self.postMessage(resp)
  return false
}

//

const openDb = (messageId: number, { dbName, dbVersion }: IActions["open"]) => {
  const resp: IResponse<IResults, "open"> = {
    messageId,
    result: {
      dbName,
      dbVersion,
      needsUpgrade: false,
    }
  }
  if ( !assertDbSupported(resp) ) {
    return
  }

  let respSent = false

  const sendError = (error: string, ev?: Event) => {
    console.error(error)
    console.log(ev)

    if (!respSent) {
      respSent = true
      resp.err = new Error(error)
      self.postMessage(resp)
    }
  }
  const request = indexedDB.open(dbName, dbVersion)

  request.onupgradeneeded = (ev) => {
    resp.result.needsUpgrade = true
  }

  request.onsuccess = (ev) => {
    const dbName2	= (ev.target as IDBRequest<IDBDatabase>).result.name
    dbs[dbName2]	= (ev.target as IDBRequest<IDBDatabase>).result

    if (!resp.result.needsUpgrade) {
      respSent = true
      resp.result.dbName = dbName2
      self.postMessage(resp)
      return
    }

    dbs[dbName2].close()
    respSent = true
    resp.result.dbName = dbName2
    self.postMessage(resp)
  }

  request.onerror = (ev) => {
    sendError("indexedDB open.request error", ev)
  }
}

const deleteDb = (messageId: number, { dbName }: IActions["deleteDb"]) => {
  const resp: IResponse<IResults, "deleteDb"> = {
    messageId,
    result: {
      dbName,
    }
  }
  if ( !assertDbSupported(resp) ) {
    return
  }

  let respSent = false

  const sendError = (error: string, ev?: Event) => {
    console.error(error)
    console.log(ev)

    if (!respSent) {
      respSent = true
      resp.err = new Error(error)
      self.postMessage(resp)
    }
  }
  const request = indexedDB.deleteDatabase(dbName)

  request.onsuccess = () => {
    delete dbs[dbName]
    respSent = true
    self.postMessage(resp)
  }

  request.onerror = (ev) => {
    sendError("indexedDB open.request error", ev)
  }
}

const createStore = (messageId: number, { dbName, dbVersion, closeDb, storeName }: IActions["createStore"]) => {
  const resp: IResponse<IResults, "createStore"> = {
    messageId,
    result: {
      dbName,
      dbVersion,
      storeName,
    }
  }
  if ( !assertDbSupported(resp) ) {
    return
  }

  let respSent		= false

  const sendError		= (error: string, ev?: Event) => {
    console.error(error)
    console.log(ev)

    if (!respSent) {
      respSent = true
      resp.err = new Error(error)
      self.postMessage(resp)
    }
  }
  const request = indexedDB.open(dbName, dbVersion)

  request.onupgradeneeded = (ev) => {
    const error = "indexedDB create store error (1)"
    const transaction = (ev.target as IDBRequest<IDBDatabase>).result.createObjectStore(storeName, { autoIncrement: true }).transaction

    transaction.onerror = (e) => {
      console.error(error)
      console.log(e)
      sendError(error, e)
    }
    transaction.onabort = (e) => {
      console.error(error)
      console.log(e)
      sendError(error, e)
    }
    transaction.oncomplete = (e) => {
      dbs[(e.target as IDBTransaction).db.name] = (e.target as IDBTransaction).db
    }
  }

  request.onsuccess = (ev) => {
    const dbName2	= (ev.target as IDBRequest<IDBDatabase>).result.name
    dbs[dbName2]	= (ev.target as IDBRequest<IDBDatabase>).result

    if (!closeDb) {
      respSent = true
      resp.result.dbName = dbName2
      self.postMessage(resp)
      return
    }

    dbs[dbName2].close()

    // Timer, just in case.
    setTimeout(() => {
      respSent = true
      resp.result.dbName = dbName2
      self.postMessage(resp)
    }, 3)
  }

  request.onerror = (ev) => {
    sendError("indexedDB request error", ev)
  }
}

const getVal = (messageId: number, { dbName, key, store }: IActions["getVal"]) => {
  const resp: IResponse<IResults, "getVal"> = {
    messageId,
    result: {
      data: undefined,
      dbName,
      key,
      store,
    },
  }
  if ( !assertDbSupported(resp) || !assertDbExists(dbName, resp) ) {
    return
  }
  let request: IDBRequest
  let respSent = false

  try {
    request = dbs[dbName]
      .transaction(store)
      .objectStore(store)
      .get(key)
  }
  catch (e) {
    const error = e.message || `indexedDB get ${store}.${key} error`
    console.error(error)
    console.log(e)

    if (!respSent) {
      respSent = true
      resp.err = new Error(error)
      self.postMessage(resp)
    }
    return
  }

  request.onsuccess = (ev) => {
    if (!respSent) {
      respSent = true
      resp.result.data = (ev.target as IDBRequest).result
      self.postMessage(resp)
    }
  }

  request.onerror = (ev) => {
    const error = `indexedDB get ${store}.${key} error`
    console.error(error)
    console.log(ev)

    if (!respSent) {
      respSent = true
      resp.err = new Error(error)
      self.postMessage(resp)
    } //
  } //
}

const setVal = (messageId: number, { dbName, key, store, val }: IActions["setVal"]) => {
  const resp: IResponse<IResults, "setVal"> = {
    messageId,
    result: {
      dbName,
      key,
      store,
    },
  }
  if ( !assertDbSupported(resp) || !assertDbExists(dbName, resp) ) {
    return
  }
  let request: IDBRequest<IDBValidKey>
  let respSent = false

  try {
    request = dbs[dbName]
      .transaction(store, "readwrite")
      .objectStore(store)
      .put(val, key)
  }
  catch (e) {
    const error = e.message || `indexedDB set ${store}.${key} error`
    console.error(error)
    console.log(e)

    if (!respSent) {
      respSent = true
      resp.err = new Error(error)
      self.postMessage(resp)
    }
    return
  }

  request.onsuccess = (ev) => {
    if (!respSent) {
      respSent = true
      self.postMessage(resp)
    }
  }

  request.onerror = (ev) => {
    const error = `indexedDB get ${store}.${key} error`
    console.error(error)
    console.log(ev)

    if (!respSent) {
      respSent = true
      resp.err = new Error(error)
      self.postMessage(resp)
    } //
  } //
}

//

self.onmessage = (ev) => {
  const { action, messageId, params } = ev.data as IAction<IActions>

  switch (action) {
    case "open":
      openDb(messageId, params as IActions["open"])
      break
    case "deleteDb":
      deleteDb(messageId, params as IActions["deleteDb"])
      break
    case "createStore":
      createStore(messageId, params as IActions["createStore"])
      break
    case "getVal":
      getVal(messageId, params as IActions["getVal"])
      break
    case "setVal":
      setVal(messageId, params as IActions["setVal"])
      break
    default:
      break
  }
}
