
import {
  IAction,
  IResponse,
}					from "./IWorker"

//

interface IActionParamsBase {
  dbName: string
}

interface IActionParamsOpen extends IActionParamsBase {
  dbVersion: number
}

interface IActionParamsCreateStore extends IActionParamsOpen {
  closeDb:	boolean
  storeName:	string
}

interface IActionParamsGetVal extends IActionParamsBase {
  store:	string
  key:	string
}

interface IActionParamsSetVal<T = any> extends IActionParamsGetVal {
  val: T
}

export interface IActions<T = any> {
  open:			IActionParamsOpen
  deleteDb:		IActionParamsBase
  createStore:	IActionParamsCreateStore
  getVal:			IActionParamsGetVal
  setVal:			IActionParamsSetVal<T>
}

//

interface IResultBase {
  dbName:	string
}

interface IResultOpen extends IResultBase {
  dbVersion:		number
  needsUpgrade:	boolean
}

interface IResultCreateStore extends IResultBase {
  dbVersion:	number
  storeName:	string
}

interface IResultSet extends IResultBase {
  store:	string
  key:	string
}

interface IResultGet<T = any> extends IResultSet {
  data:	T
}

export interface IResults<T = any> {
  open:			IResultOpen
  deleteDb:		IResultBase
  createStore:	IResultCreateStore
  getVal:			IResultGet<T>
  setVal:			IResultSet
}

//

export interface IIndexedDbWorker {
  postMessage<Action extends keyof IActions, T = any>(message: IAction<IActions<T>, Action>): void
  onmessage: <Action extends keyof IResults = keyof IResults>(message: { data: IResponse<IResults, Action> }) => void
}

export default IIndexedDbWorker
