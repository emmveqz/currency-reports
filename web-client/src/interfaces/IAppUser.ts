
import {
  IDateFormat,
}							from "./IUtils"

//

export interface IAppUser {
  Id: number
  Name: string
  Avatar: string // Base64 content
  LoggedIn: boolean
  Timezone: string
  Dateformat: IDateFormat
  /**
   * This is reset by clicking the `Alerts` icon.
   */
  UnseenAlerts: number
  /**
   * Individual ones are reset by clicking `Mark as Seen` button, or visiting the page.
   */
  UnseenAlertsEmails: number
  UnseenAlertsVoicemails: number
  /**
   * Either today's or past.
   */
  UnseenAlertsTasks: number
}

export default IAppUser
