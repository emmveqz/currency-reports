
import * as gooPbStruct		from "google-protobuf/google/protobuf/struct_pb"

//

export type IBaseBoJs<T extends string = string> = {
  [prop in T]: gooPbStruct.JavaScriptValue
}
