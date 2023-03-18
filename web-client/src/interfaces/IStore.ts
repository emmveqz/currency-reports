
// tslint:disable: ban-types
import {
  Dispatch,
} from "react"

export interface ILooseObject {
  [key: string]: any
}

export type IStateTypes<Obj extends ILooseObject> = {
  [K in keyof Obj]: Obj[K] extends ILooseObject ? IStateTypes<Obj[K]> : Obj[K]
}

export type IUseStateProp<TVal> = () => [TVal, (newVal: TVal, saveToDb?: boolean) => void]

export type IUseStatePropInit = () => { pending: boolean }

export type IConsumeTypes<Obj extends ILooseObject> = {
  [K in keyof Obj]: Obj[K] extends ILooseObject
    ? (Obj[K] extends Array<any>
      ? () => [IUseStateProp<Obj[K]>, IUseStatePropInit]
      : IConsumeTypes<Obj[K]>)
    : () => [IUseStateProp<Obj[K]>, IUseStatePropInit]
}

export interface IDispatcherWrap {
  propId: Symbol
  dbKey: string
  dbStore: string
  lastVal: any
  dispatchers: Dispatch<any>[]
}
