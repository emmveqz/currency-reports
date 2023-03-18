
import IMyDb              from "@emmveqz/currency-reports-core-interfaces/dist/IMyDb"
import UserAction         from "@emmveqz/currency-reports-core/dist/bos/UserAction"
import BaseDao            from "@emmveqz/currency-reports-core/dist/dao/BaseDao"
import { IpV4 }           from "@emmveqz/currency-reports-tools/dist/Validator"
import {
  credentials as grpcCredentials,
  Metadata,
}                         from "grpc"

//

// This is defined in Envoy software stuff.
export const ENVOY_EXTERNALIP_METADATAKEY = "x-envoy-external-address"

//

export const copyMetadata = (metaData: Metadata) => {
  const metadata = metaData.getMap()
  const responseMetadata = new Metadata()

  for (const key in metadata) {
    responseMetadata.set(key, metadata[key])
  }
  return responseMetadata
}

/**
 * The Envoy External IP.
 */
export const GetRequestIP = (metadata: Metadata): IpV4 => {
  return IpV4.From( String(metadata.get(ENVOY_EXTERNALIP_METADATAKEY)[0] || "") )
}

/**
 * @returns Void for now.
 */
export const RecordUserAction = (db: IMyDb, metadata: Metadata, action: string, params: string, result: string): void => {
  const newBo				= new UserAction()
  newBo.UserIp			= GetRequestIP(metadata).Val
  newBo.Action			= action
  newBo.Params			= params
  newBo.Result			= result
  newBo.CreatedByUserId	= 1

  const dao = new BaseDao(db)
  dao.Create(newBo)
}
