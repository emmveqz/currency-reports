
import * as grpc              from "@grpc/grpc-js"
import config                 from "./config/my-config-vars"
import * as Services          from "./proto-types/crypto-coins_grpc_pb"
import CurrencyService        from "./services/CurrencyService"

export * from "./services"

//

const BIND_PORT         = config.MYVAR_GRPC_SERVERPORT
const serverCredentials = grpc.ServerCredentials.createInsecure()
const grpcServer        = new grpc.Server()
const currencyService   = new CurrencyService()

grpcServer.addService((Services as any)["currencyPkg.CurrencyService"], currencyService as any)

//

console.log(`binding server on ${BIND_PORT} ...`)
grpcServer.bindAsync(`${config.MYVAR_GRPC_SERVICEDOMAIN}:${BIND_PORT}`, serverCredentials, (err, port) => {
  if (!!err) {
    console.log("on bind error: ", JSON.stringify(err))
    return
  }
  console.log("bound on port: ", port)
  grpcServer.start()
})
