
import IUiNotification from "./IUiNotification"

//

export interface IUiAlert {
  float?: boolean
  autoClose?: boolean				// keep open by default
  position?: "bottom" | "top"		// no need to get too fancy
  notification: IUiNotification
}

export default IUiAlert
