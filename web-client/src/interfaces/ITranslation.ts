
import LanguageEnum from "@emmveqz/currency-reports-core-enums/dist/LanguageEnum"

export interface ITranslationTag { [tag: string]: string }

export type ITranslation<T extends ITranslationTag> = {
  [key in (keyof typeof LanguageEnum)]?: T
}

export default ITranslation
