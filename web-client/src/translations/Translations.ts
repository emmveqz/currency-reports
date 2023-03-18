
import LanguageEnum from "@emmveqz/currency-reports-core-enums/dist/LanguageEnum"
import ITranslation, { ITranslationTag } from "../interfaces/ITranslation"

export abstract class Translations<T extends ITranslationTag> {

  public abstract translations: { eng: T } & ITranslation<T>

  public from(lang: LanguageEnum): T|undefined {
    return this.translations[ LanguageEnum[lang] as keyof (typeof LanguageEnum) ]
  }

}

export default Translations
