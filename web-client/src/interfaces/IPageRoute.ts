
import {
  OverridableComponent,
}							from "@material-ui/core/OverridableComponent"
import {
  SvgIconTypeMap,
}							from "@material-ui/core/SvgIcon"

export interface IPageRoute {
  path:	string
  route:	string
  title:	string
  icon:	OverridableComponent<SvgIconTypeMap>
  currentRoute:	boolean
}

export type IRouteParams<T extends IRouteParamsDefinitions> = {
  [param in keyof T]: T[param] extends undefined ? string|undefined : string
}

export type IRouteParamsDefinitions = {
  /**
   * `undefined` means an optional param, while an empty string `""` means a mandatory param.
   */
  [param: string]: undefined|"",
}

export default IPageRoute
