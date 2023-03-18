
import Translations from "./Translations"

//

type tags = "basis"
  | "currency"
  | "email"
  | "factor"
  | "reminduntilseen"
  | "subscribe"
  | "memo"
  | "currencyUnsupported"
  | "currencyAlertCreated"
  | "errMsgCantRetrieveData"

export type ITranslationTags = { [tag in tags]: string }

export class HomeTranslations extends Translations<ITranslationTags> {

  public translations = {
    eng: {
      basis: "Basis",
      currency: "Currency",
      email: "Email",
      factor: "Factor",
      reminduntilseen: "Remind me",
      subscribe: "Subscribe",
      memo: "Memo",
      currencyUnsupported: "is not supported",
      currencyAlertCreated: "An alert for {0} has been created",
      errMsgCantRetrieveData: "could not retrieve data",
    },
    spa: {
      basis: "Base",
      currency: "Moneda",
      email: "Email",
      factor: "Factor",
      reminduntilseen: "Recordarme",
      subscribe: "Suscribir",
      memo: "Memo",
      currencyUnsupported: "no esta soportado",
      currencyAlertCreated: "Una alerta para {0} ha sido creada",
      errMsgCantRetrieveData: "no se pudo econtrar datos",
    },
  }

}

export default HomeTranslations
