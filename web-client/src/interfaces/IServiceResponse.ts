
import {
  Message,
}							from "google-protobuf"
import * as gooPbStruct		from "google-protobuf/google/protobuf/struct_pb"
import {
  ServiceResponseStatus,
}							from "../../proto-types/common_pb"

//

export type IResponse<T> = Message & {
  getResult?(): T | undefined,
  getStatus(): ServiceResponseStatus,
  getStatusmsg(): string,

  toObject(): {
    result?: T extends gooPbStruct.Struct ? gooPbStruct.Struct.AsObject : T,
    status: ServiceResponseStatus,
    statusmsg: string,
  }
}

export type IResponseList<T> = Message & {
  getResultList(): T[],
  getStatus(): ServiceResponseStatus,
  getStatusmsg(): string,
  getEntitybuildver?(): number,

  toObject(): {
    resultList?: T extends gooPbStruct.Struct ? gooPbStruct.Struct.AsObject[] : T[],
    status: ServiceResponseStatus,
    statusmsg: string,
    entitybuildver?: number,
  }
}

export interface IServiceResponse<T> {
  status: ServiceResponseStatus,
  result?: T,
  msg?: string,
  entityBuildVer?: number
}

export default IServiceResponse
