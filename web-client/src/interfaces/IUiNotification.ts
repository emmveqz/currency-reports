
import {
  ServiceResponseStatus,
}							from "../../proto-types/common_pb"

//

export interface IUiNotification {
  status: ServiceResponseStatus
  msg?: string
}

export default IUiNotification
