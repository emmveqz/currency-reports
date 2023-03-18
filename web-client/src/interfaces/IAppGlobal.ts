
import IAppWorkers from "./IAppWorkers"

//

type IConsoleLogCss = {
  /**
   * @ToDo In fact, rename to `ComponentRender`
   */
  ComponentMount: string,
}

//

export type IAppGlobal = {
  workers: IAppWorkers,
  consoleLogCss: IConsoleLogCss,
}

export default IAppGlobal
