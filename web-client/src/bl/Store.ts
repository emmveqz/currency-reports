
// tslint:disable: ban-types
// tslint:disable: no-conditional-assignment
import {
  useState,
  useEffect,
  useCallback,
} from "react"
import {
  defaultDbName	as dbName,
  setVal			as setDbVal,
  useGetVal		as useDbGetVal,
  useGetAllVals	as useDbGetAllVals,
} from "./indexedDbWorker"
import {
  IConsumeTypes,
  IDispatcherWrap,
  ILooseObject,
  IStateTypes,
} from "../interfaces/IStore"

//

const dispatchersWrapsRoot: IDispatcherWrap[] = []

//

const setAllValsFromIdxDbMethod = () => (<T extends ILooseObject>(dispatchersWraps: IDispatcherWrap[], initialState: IStateTypes<T>, rootStore: string) => {
  const {
    pending,
    result
  }				= useDbGetAllVals<string|number|boolean>({ dbName, schema: initialState, rootStore })

  console.log("initVals | result:", result)

  if ( !pending && result && !(result instanceof Error) ) {
    Object.entries(result).forEach(([store, keys]) => {
      Object.entries(keys).forEach(([key, val]) => {
        if (val instanceof Error) {
          console.log("error initVals | store:", store, "key:", key, val)
          return
        }
        if (val === undefined) {
          return
        }
        const wrap = dispatchersWraps.find((w) => w.dbStore === store && w.dbKey === key)
        !wrap || (wrap.lastVal = val)
      })
    })
  }
  else if (result instanceof Error) {
    console.log("error initVals:", result)
  }

  return { pending }
})

const setValFromIdxDbMethod = () => ((propId: Symbol, dispatchersWraps: IDispatcherWrap[]) => {
  const wrapIdx	= dispatchersWraps.findIndex((wrap) => wrap.propId === propId)
  const {
    dbKey,
    dbStore,
  }				= dispatchersWraps[wrapIdx]
  const {
    pending,
    result
  }				= useDbGetVal<string|number|boolean>({ dbName, key: dbKey, store: dbStore })

  console.log("initVal | wrapIdx:", wrapIdx, "result:", result)

  if ( !pending && result !== undefined && !(result instanceof Error) ) {
    dispatchersWraps[wrapIdx].lastVal = result
  }

  return { pending }
})

const getSubscriptionMethod = () => ((propId: Symbol, dispatchersWraps: IDispatcherWrap[] /* , ...options: any[] */ /* maybe for some future purpose? */) => {
  const wrapIdx = dispatchersWraps.findIndex((wrap) => wrap.propId === propId)
  const [stateVal, dispatcher] = useState(dispatchersWraps[wrapIdx].lastVal)

  console.log("suscribe | dbKey:", dispatchersWraps[wrapIdx].dbKey, " | stateVal:", stateVal)

  const callDispatchers = useCallback((newVal: any, saveToDb: boolean = true) => {
    const {
      dbKey: key,
      dbStore: store,
      dispatchers,
    }					= dispatchersWraps[wrapIdx]
    console.log("useCallback | dispatchers.length:", dispatchers.length, " | dbKey:", dispatchersWraps[wrapIdx].dbKey, " | newVal:", newVal)

    if (dispatchersWraps[wrapIdx].lastVal === newVal) {
      return
    }
    dispatchers.forEach((disp) => {
      disp(newVal)
    })
    dispatchersWraps[wrapIdx].lastVal = newVal
    saveToDb && setDbVal({ dbName, store, key, val: newVal })
  }, [wrapIdx])

  useEffect(() => {
    console.log("useEffect | dbKey:", dispatchersWraps[wrapIdx].dbKey)
    dispatchersWraps[wrapIdx].dispatchers.push(dispatcher)

    return () => {
      console.log("unUseEffect | dbKey:", dispatchersWraps[wrapIdx].dbKey)

      dispatchersWraps[wrapIdx].dispatchers
        = dispatchersWraps[wrapIdx].dispatchers.filter(disp => disp !== dispatcher)
    }
  }, [wrapIdx])

  return [stateVal, callDispatchers]
})

const associateConsume = <T extends ILooseObject>(obj: IStateTypes<T>, rootStore: string, rootProp?: string): IConsumeTypes<T> => {
  const consume = {} as IConsumeTypes<T>
  let prop: string|undefined
  const props = Object.keys(obj)

  while ( (prop = props.shift()) ) {
    if (Object.prototype.toString.call(obj[prop]) === "[object Object]") {
      consume[prop as keyof typeof consume] = associateConsume(obj[prop], rootStore, !rootProp ? prop : `${rootProp}.${prop}`) as any
      continue
    }

    const _propId = Symbol()

    dispatchersWrapsRoot.push({
      propId: _propId,
      dbKey: prop,
      dbStore: rootStore + (!rootProp ? `` : `.${rootProp}`),
      lastVal: obj[prop],
      dispatchers: [],
    })

    consume[prop as keyof typeof consume] = (() => {
      // `initVal` is more like initVal from database (into the memory state)
      const initVal = setValFromIdxDbMethod()
      const suscribe = getSubscriptionMethod()

      return [(/* ...options: any[] */ /* maybe for some future purpose? */) => {
        // hackerman
        return suscribe.call(null, _propId, dispatchersWrapsRoot /* , ...options */)
      }
      , () => {
        return initVal.call(null, _propId, dispatchersWrapsRoot)
      }]
    }) as any
  }

  return consume
}

export const createStore = <T extends ILooseObject>(initialState: IStateTypes<T>, rootStore: string): [() => ({ pending: boolean }), IConsumeTypes<T>] => {
  console.log("store created")

  const initVals = setAllValsFromIdxDbMethod()

  return [
    () => initVals.call(null, dispatchersWrapsRoot, initialState, rootStore),
    associateConsume<T>(initialState, rootStore),
  ]
}

export default createStore

//////////////////////////////////////////////////////////////////////////////////////////

// Usage e.g.:


/*
// GlobalState.ts
const initialGlobalState = {
  foo: "test",

  deep: {
    bar: 1,
  },
}

export const [useInitValues, consumeGlobalState] = createStore(initialGlobalState)



// MyComponent.tsx
import { consumeGlobalState } from "GlobalState.ts"

const [useFoo, useInitFoo] = consumeGlobalState.foo()
const [useBar, useInitBar] = consumeGlobalState.deep.bar()

function MyComponent() {
  const [foo, setFoo] = useFoo()
  const [bar, setBar] = useBar()

  return (
    <div>
      <p>Foo: {foo}</p>
      <button type="button" onClick={ () => { setFoo("modified") } }>Modify</button>

      <p>Bar: {bar}</p>
      <button type="button" onClick={ () => { setBar(bar + 1) } }>Increment</button>
    </div>
  )
}
*/
