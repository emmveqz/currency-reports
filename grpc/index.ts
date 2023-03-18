
import * as grpc              from "grpc"
import config                 from "./config/my-config-vars"
import {
  CurrencyServiceService,
}                             from "./proto-types/crypto-coins_grpc_pb"
import CurrencyService        from "./services/CurrencyService"

export * from "./services"

//

const BIND_PORT         = config.MYVAR_GRPC_SERVERPORT
const serverCredentials = grpc.ServerCredentials.createInsecure()
const grpcServer        = new grpc.Server()
const currencyService   = new CurrencyService()

grpcServer.addService(CurrencyServiceService, currencyService)

//

console.log("binding server...")
grpcServer.bindAsync("0.0.0.0:" + BIND_PORT, serverCredentials, (err, port) => {
  if (!!err) {
    console.log("on bind error: ", JSON.stringify(err))
  }
  console.log("bound on port: ", port)
  grpcServer.start()
})
