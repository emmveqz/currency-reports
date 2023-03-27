
// tslint:disable: no-conditional-assignment
import {
  PromiseFn,
  useAsync,
}							from "react-async"
import IAppWorkers			from "../interfaces/IAppWorkers"
import {
  IActions,
  IResults,
}							from "../interfaces/IIndexedDbWorker"
import {
  IResponse,
}							from "../interfaces/IWorker"

//

interface IOpenDbParams {
  dbName: string
  schema: { [prop: string]: any }
  rootStore: string
}

interface IUseDbResult<T = void> {
  pending: boolean
  result: T|Error|undefined
}

type IMessageData<Action extends keyof IResults = keyof IResults, T = any> = IResponse<IResults<T>, Action>
type IGetAllValsParams = IOpenDbParams
type IStoresWithKeys = { [store: string]: string[] }
type IAllVals<T = string|boolean|number|{}> = { [store: string]: { [key: string]: T|Error } }

//

export const defaultDbName = "echonextDb"
export const RootStoreName = "globState"
export const cacheDbName = "echonextCache"
export const cacheRootStore = "baseEntities"
export const cacheBuildVerStore = "buildVer"
const indexedDb = new Worker("/workers/indexedDb.js") as unknown as IAppWorkers["indexedDb"]
/*
const { indexedDb } = ((globalThis as any).workers as IAppWorkers)
*/

let messageCount = 0
const workerMessages: { [messageId: number]: (data: IMessageData) => void } = {}

const newDbMessage = <Action extends keyof IActions, T = any>(action: Action, params: IActions<T>[Action]): Promise<IMessageData<Action, T>> => {
  console.log("newDbMessage | action:", action, " | params:", params)
  const messageId = messageCount === Number.MAX_SAFE_INTEGER ? 0 : ++messageCount
  messageCount = messageId

  const request = new Promise<IMessageData<Action, T>>((resolv) => {
    workerMessages[messageId] = resolv as (data: IMessageData) => void
  })

  indexedDb.postMessage({
    action,
    messageId,
    params,
  })

  return request
}

indexedDb.onmessage = ({ data }: { data: IMessageData }) => {
  console.log("indexedDb.onmessage", data)

  workerMessages[data.messageId]?.(data)
  delete workerMessages[data.messageId]
}

//

const getStoresNames = (schema: { [prop: string]: any }, rootProp: string): [string] & string[] => {
  const storesNames: [string] & string[] = [rootProp]
  let prop: string|undefined
  const props = Object.keys(schema)

  while ( (prop = props.shift()) ) {
    if (Object.prototype.toString.call(schema[prop]) === "[object Object]") {
      const subStoresNames = getStoresNames(schema[prop], `${rootProp}.${prop}`)
      storesNames.push( ...subStoresNames )
    }
  }

  return Array.from(new Set(storesNames)) as [string] & string[]
}

const getStoresWithKeys = (schema: { [prop: string]: any }, rootProp: string): IStoresWithKeys => {
  let storesWithKeys: IStoresWithKeys = { [rootProp]: [] }
  let prop: string|undefined
  const props = Object.keys(schema)

  while ( (prop = props.shift()) ) {
    if (Object.prototype.toString.call(schema[prop]) === "[object Object]") {
      const subStoresNames = getStoresWithKeys(schema[prop], `${rootProp}.${prop}`)

      storesWithKeys = { ...storesWithKeys, ...subStoresNames }
      continue
    } //

    storesWithKeys[rootProp].push(prop)
  } //

  return storesWithKeys
} //

// The async methods.

const openDb = async ({ dbName, schema, rootStore }: IOpenDbParams): Promise<Error|void> => {
  const storesNames = getStoresNames(schema, rootStore)
  let storeName: string|undefined
  let dbVersion = storesNames.length

  const data = await newDbMessage("open", {
    dbName,
    dbVersion,
  }) //

  type needsUpgrade = { needsUpgrade: boolean }

  let result: needsUpgrade|void|Error = !data.err ? { needsUpgrade: data.result.needsUpgrade } : data.err

  if (result instanceof Error) {
    return result
  }
  if (!result.needsUpgrade) {
    return
  }


  const data2 = await newDbMessage("deleteDb", {
    dbName,
  })
  result = !data2.err ? undefined : data2.err

  if (result instanceof Error) {
    return result
  }

  dbVersion = 1

  while ( (storeName = storesNames.shift()) ) {

    const data3 = await newDbMessage("createStore", {
      dbName,
      dbVersion,
      closeDb: !!storesNames.length,
      storeName,
    })
    result = !data3.err ? undefined : data3.err

    if (result instanceof Error) {
      return result
    }

    dbVersion++
  }
}

const getAllVals = async <T>({ dbName, schema, rootStore }: IGetAllValsParams): Promise<IAllVals<T>> => {
  const result: IAllVals<T> = {}
  const storesWithKeys = getStoresWithKeys(schema, rootStore)

  for (const store in storesWithKeys) {
    result[store] = {}

    for (const key of storesWithKeys[store]) {
      result[store][key] = await getVal<T>({ dbName, store, key })
    }
  }

  return result
}

export const getVal = async <T>({ dbName, key, store }: IActions["getVal"]): Promise<Error|T> => {

  const data = await newDbMessage<"getVal", T>("getVal", {
    dbName,
    key,
    store,
  })

  return !data.err ? data.result.data : data.err
}

export const setVal = async ({ dbName, key, store, val }: IActions["setVal"]): Promise<Error|void> => {

  const data = await newDbMessage("setVal", {
    dbName,
    key,
    store,
    val,
  })

  return !data.err ? undefined : data.err
}

/**
 * @Watch Possible bug using `useAsync` several times at one component and this is calling the same Promise-Able method (arguments get mixed up).
 * (or is it just my implementation?)
 */
// The Hooks.

export const useOpenDb = ({ dbName, schema, rootStore }: IOpenDbParams): IUseDbResult => {
  const {
    data,
    error,
    isPending,
  } = useAsync<Error|void>({
    promiseFn: openDb as unknown as PromiseFn<void|Error>,
    dbName,
    schema,
    rootStore,
  })

  return {
    pending: isPending,
    result: error || data,
  }
}

export const useGetAllVals = <T>({ dbName, schema, rootStore }: IGetAllValsParams): IUseDbResult<IAllVals<T>> => {
  const {
    data,
    error,
    isPending,
  } = useAsync({
    promiseFn: getAllVals as unknown as PromiseFn<IAllVals<T>>,
    dbName,
    schema,
    rootStore,
  })

  return {
    pending: isPending,
    result: error || data,
  }
}

export const useGetVal = <T>({ dbName, key, store }: IActions["getVal"]): IUseDbResult<T> => {
  const {
    data,
    error,
    isPending,
  } = useAsync({
    promiseFn: getVal as unknown as PromiseFn<T|Error>,
    dbName,
    key,
    store,
  })

  return {
    pending: isPending,
    result: error || data,
  }
}

export const useSetVal = (params: IActions["setVal"]): IUseDbResult => {
  const {
    data,
    error,
    isPending,
  } = useAsync({
    promiseFn: setVal as unknown as PromiseFn<void|Error>,
    ...params,
  })

  return {
    pending: isPending,
    result: error || data,
  }
}
