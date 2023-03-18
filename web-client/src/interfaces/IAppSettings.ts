
import LanguageEnum from "@emmveqz/currency-reports-core-enums/dist/LanguageEnum"
import PaletteEnum from "../enums/PaletteEnum"

export interface IAppSettings {
  Language: LanguageEnum
  TableSize: number
  Brightness: "dark"|"light"|null
  Palette: PaletteEnum
  SidebarOpen: boolean
  MainOnline: boolean
  PhoneOnline: boolean
  ChatOnline: boolean
}

export default IAppSettings
