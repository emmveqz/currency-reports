
import Translations from "./Translations"

//

type tags = "errorFieldRequired"
  | "errorFieldMinimum"
  | "errorFieldMaximum"
  | "errorFieldInvalidFormat"
  | "errorFieldLangRequired"
  | "errorFieldInteger"

export type ITranslationTags = { [tag in tags]: string }

export class FormTranslations extends Translations<ITranslationTags> {

  public translations = {
    eng: {
      errorFieldMinimum: "Must be at least {0} characters",
      errorFieldMaximum: "You have exceeded max. allowed",
      errorFieldLangRequired: "{LANG} is required",
      errorFieldRequired: "Required",
      errorFieldInvalidFormat: "Invalid Format",
      errorFieldInteger: "Must be a flat number",
    },
    spa: {
      errorFieldMinimum: "Debe contener al menos {0} caracteres",
      errorFieldMaximum: "Has excedido el limite maximo",
      errorFieldLangRequired: "{LANG} es requerido",
      errorFieldRequired: "Requerido",
      errorFieldInvalidFormat: "Formato no valido",
      errorFieldInteger: "Debe ser un numero entero",
    },
  }

}

export default FormTranslations
