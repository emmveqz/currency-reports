
import LanguageEnum from "@emmveqz/currency-reports-core-enums/dist/LanguageEnum"
import {
  defaultDbName	as DefaultDbName,
  RootStoreName,
  setVal			as SetDbVal,
} from "./bl/indexedDbWorker"
import createStore, {
} from "./bl/Store"
import PaletteEnum from "./enums/PaletteEnum"
import IAppState from "./interfaces/IAppState"

//

export const setDbUserLoggedIn = (loggedIn: boolean): Promise<void|Error> => {
  // store and key names are a reference from object  initialState.User.LoggedIn
  const store = `${RootStoreName}.User`
  const key = "LoggedIn"
  return SetDbVal({ dbName: DefaultDbName, store, key, val: loggedIn })
}

/**
 * Doesn't mean it's gonna load these values on every refresh/load,
 * but it will take stored values (if any).
 */
export const initialState: IAppState = {
  User: {
    Id: 0,
    Name: "",
    Avatar: "",
    LoggedIn: false,
    Timezone: "America/Los_Angeles",
    Dateformat: "american",
    UnseenAlerts: 0,
    UnseenAlertsEmails: 0,
    UnseenAlertsTasks: 0,
    UnseenAlertsVoicemails: 0,
  },
  Settings: {
    Language: LanguageEnum.eng,
    TableSize: 10,
    Brightness: null,
    Palette: PaletteEnum.Indigo,
    SidebarOpen: true,
    MainOnline: true,
    PhoneOnline: true,
    ChatOnline: true,
  },

  // Ideally these should not use IndexedDB.
  CurrentRoute: "",
  NavBarTabs: [],
  NavBarTitle: "",
  Alerts: [],
}

const [initVals, GlobalState] = createStore(initialState, RootStoreName)
Object.freeze(GlobalState)

export const useInitValues = initVals
export default GlobalState
