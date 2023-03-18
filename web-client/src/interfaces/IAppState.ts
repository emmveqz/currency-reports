
import IUiAlert from "./IUiAlert"
import IAppSettings from "./IAppSettings"
import IAppUser from "./IAppUser"
import {
  ITabProps,
} from "./IDynamicRoute"

export interface IAppState {
  User: IAppUser
  Settings: IAppSettings

  // Ideally these should not use IndexedDB.
  CurrentRoute: string
  NavBarTabs: ITabProps[]
  NavBarTitle: string
  Alerts: IUiAlert[]
}

export default IAppState
