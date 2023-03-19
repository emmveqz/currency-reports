
import {
  genBaseEntityNames,
  genConfigVars,
} from "@emmveqz/currency-reports-webclient-vars"

//

(async () => {
  genBaseEntityNames(__dirname)
  await genConfigVars("../../../.env", __dirname, [
    "MYVAR_CORE_TIMEZONE",
    "MYVAR_CORE_TIMEZONEID",
    "MYVAR_ENVOY_SERVICEPORT_SECURE",
    "MYVAR_GRPC_SERVICEDOMAIN",
  ])
})()
