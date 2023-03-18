
// tslint:disable: max-line-length

import {
  Message,
}							from "google-protobuf"
import {
  ClientReadableStream,
  Error as grpcError,
  Metadata,
  Status as grpcStatus,
}							from "grpc-web"
import vars					from "../config/web-config-vars"
import {
  setDbUserLoggedIn,
}							from "../GlobalState"
import {
  IResponse,
  IResponseList,
  IServiceResponse,
}							from "../interfaces/IServiceResponse"
import {
  MyAsyncGenerator,
}							from "../interfaces/IUtils"
import {
  StatusResponse,
  ServiceResponseStatus,
}							from "../../proto-types/common_pb"

//

const cookieDuration				= 10 // in days
const { protocol, hostname }		= globalThis.location
export const GRPC_ENDPOINT			= `${protocol}//${vars.MYVAR_GRPC_SERVICEDOMAIN}:${vars.MYVAR_ENVOY_SERVICEPORT_SECURE}`
export const metaKeySessionId		= "x-currency-reports-session-id"

export const setBrowserSessionId	= (doc: Document, meta?: Metadata): void => {
  if ( !meta || !(metaKeySessionId in meta) ) {
    return
  }
  const now = new Date()
  const expiration = ( new Date(now.getFullYear(), now.getMonth(), now.getDate() + cookieDuration) ).toUTCString()
  doc.cookie = `${metaKeySessionId}=${meta[metaKeySessionId]}; expires=${expiration}; Secure; Path=/`
}

export const getBrowserSessionId	= (doc: Document): string => {
  return (doc.cookie
      .split("; ")
      .find((cook) => cook.startsWith(metaKeySessionId)) || "")
    .split("=")[1]
}

export const deleteCookie = (doc: Document, name: string) => {
  doc.cookie = `${name}=; expires=${new Date(1970, 0, 1).toUTCString()}; Secure; Path=/`
}

export const destroyAppUserSession = (): void => {
  deleteCookie(document, metaKeySessionId)
}

export const isErrorStatus = (status: ServiceResponseStatus): boolean => {
  const isError = status === ServiceResponseStatus.ERROR

  return !status || isError || status === ServiceResponseStatus.INVALIDSESSION
}

export const isNoMsgStatus = (status: ServiceResponseStatus): boolean => {
  return status === ServiceResponseStatus.SUCCESS || status === ServiceResponseStatus.NOTMODIFIED
}

//

export type Metadata_ = Metadata

type TGrpcStreamRequest<Req extends Message, Resp extends Message, M extends Metadata> =
  (req: Req, meta?: M) => ClientReadableStream<Resp>

type TGrpcRequest<Req extends Message, Resp extends Message, M extends Metadata> =
  (req: Req, meta: M|null, cb: (err: grpcError, resp: Resp) => void) => ClientReadableStream<Resp>

interface IBaseMeta {
  [metaKeySessionId]: string
}

type IPayloadMeta<M extends Metadata = Metadata> = IBaseMeta & M

interface IResultWrap<T extends Message, M extends Metadata> {
  done?: boolean // for grpcStream purposes
  meta: IPayloadMeta<M>
  resp?: T
}

export type IUnaryPayload<T extends Message, M extends Metadata> = IResultWrap<T, M>|Error

interface IResolveWrap<T extends Message, M extends Metadata = Metadata> {
  unresolved: boolean
  result: IResultWrap<T, M>
  resolve: (payload: IUnaryPayload<T, M>) => void
}

//

export const getUnaryResponse = <T, M extends Metadata_>(result: IUnaryPayload<IResponse<T>, M>): IServiceResponse<T> => {
  if (result instanceof Error) {
    return {
      msg: result.message,
      status: ServiceResponseStatus.ERROR,
    }
  }
  if (!result.resp) {
    return {
      msg: "error retrieving data",
      status: ServiceResponseStatus.ERROR,
    }
  }

  return {
    msg: result.resp.getStatusmsg(),
    status: result.resp.getStatus(),
    result: !result.resp.getResult ? undefined : result.resp.getResult(),
  }
}

export const getUnaryListResponse = <T, M extends Metadata_>(result: IUnaryPayload<IResponseList<T>, M>): IServiceResponse<T[]> => {
  if (result instanceof Error) {
    return {
      msg: result.message,
      status: ServiceResponseStatus.ERROR,
    }
  }
  if (!result.resp) {
    return {
      msg: "error retrieving data",
      status: ServiceResponseStatus.ERROR,
    }
  }

  return {
    msg: result.resp.getStatusmsg(),
    status: result.resp.getStatus(),
    result: result.resp.getResultList(),
    entityBuildVer: !result.resp.getEntitybuildver ? undefined : result.resp.getEntitybuildver(),
  }
}

function onGrpcUnaryStatus<T extends Message, Wrap extends IResolveWrap<T>>(this: Wrap, status: grpcStatus) {
  console.log("Received metadata:", status.metadata)

  setBrowserSessionId(document, status.metadata)
  this.result.meta = status.metadata as IPayloadMeta
}

function onGrpcUnaryEnd<T extends Message, Wrap extends IResolveWrap<T>>(this: Wrap) {
  console.log("UnaryCall end signal fired")

  if (this.unresolved) {
    this.unresolved = false
    this.result.done = true
    this.resolve(this.result)
  }
}

function onGrpcUnaryError<T extends Message, Wrap extends IResolveWrap<T>>(this: Wrap, error: grpcError) {
  console.log("UnaryCall error", error)

  if (this.unresolved) {
    this.unresolved = false
    this.resolve( new Error(!error ? "grpcWeb error" : error.message) )
  }
}

function onGrpcUnaryData<T extends Message, Wrap extends IResolveWrap<T>>(this: Wrap, resp: T) {
  console.log("onGrpcUnaryData")

  if (this.unresolved) {
    this.result.resp = resp
  }
  checkInvalidSession(resp)
}

const checkInvalidSession = <T extends Message>(resp: T): void => {
  if ((resp as any).getStatus && (resp as unknown as StatusResponse).getStatus() === ServiceResponseStatus.INVALIDSESSION) {
    destroyAppUserSession()
    setDbUserLoggedIn(false)
  }
}


//

export const grpcUnaryRequest = <Req extends Message, Resp extends Message, Serv extends {}, Meta extends Metadata>(req: Req, method: TGrpcRequest<Req, Resp, Meta>, service: Serv, meta: Meta|null = null): Promise<IUnaryPayload<Resp, Meta>> => {
  const run = (resolve: (payload: IUnaryPayload<Resp, Meta>) => void): void => {
    const baseMeta: IBaseMeta = {
      [metaKeySessionId]: getBrowserSessionId(document),
    }
    const fullMeta = { ...baseMeta, ...meta } as IPayloadMeta<Meta>

    const wrap: IResolveWrap<Resp> = {
      resolve:	resolve as (payload: IUnaryPayload<Resp, Metadata>) => void,
      unresolved:	true,
      result:		{
        meta: fullMeta,
      },
    }
    const onData	= onGrpcUnaryData.bind(wrap)
    const onError	= onGrpcUnaryError.bind(wrap)

    method.call(service, req, fullMeta, (err: grpcError, resp: Resp) => {
      !err ? onData(resp) : onError(err)
    })
    .on("data",		onData)
    .on("status",	onGrpcUnaryStatus.bind(wrap))
    .on("end",		onGrpcUnaryEnd.bind(wrap))
    .on("error",	onError)
  }

  return new Promise(run)
}

export const grpcStreamRequest = async function* <Req extends Message, Resp extends Message, Serv extends {}, Meta extends Metadata>(req: Req, method: TGrpcStreamRequest<Req, Resp, Meta>, service: Serv, meta: Meta|null = null): MyAsyncGenerator<IUnaryPayload<Resp, Meta>> {
  let resolve: (payload: IUnaryPayload<Resp, Meta>) => void = () => {}
  let promise = new Promise<IUnaryPayload<Resp, Meta>>((res) => { resolve = res })

  const baseMeta: IBaseMeta = {
    [metaKeySessionId]: getBrowserSessionId(document),
  }
  const fullMeta = { ...baseMeta, ...meta } as IPayloadMeta<Meta>

  const wrap: IResolveWrap<Resp> = {
    resolve:	resolve as (payload: IUnaryPayload<Resp, Metadata>) => void,
    unresolved:	true,
    result:		{
      meta: fullMeta,
    },
  }

  const onError = onGrpcUnaryError.bind(wrap)

  const onGrpcStreamData = (resp: Resp) => {
    console.log("onGrpcStreamData")

    if (wrap.unresolved) {
      wrap.result.resp = resp
      wrap.resolve(wrap.result)

      promise = new Promise<IUnaryPayload<Resp, Meta>>((resolv) => {
        wrap.resolve = resolv as (payload: IUnaryPayload<Resp, Metadata>) => void
      })
    }
    checkInvalidSession(resp)
  }

  const stream = method.call(service, req, fullMeta)
    .on("data",		onGrpcStreamData)
    .on("status",	onGrpcUnaryStatus.bind(wrap))
    .on("end",		onGrpcUnaryEnd.bind(wrap))
    .on("error",	onError)

  //

  let abort: boolean|undefined
  let result = await promise

  if (result instanceof Error) {
    yield result
    return
  }

  while (!result.done) {
    abort = (yield result)?.abort

    if (abort) {
      stream.cancel()
      break
    }
    result = await promise

    if (result instanceof Error) {
      yield result
      return
    }
  }
}
