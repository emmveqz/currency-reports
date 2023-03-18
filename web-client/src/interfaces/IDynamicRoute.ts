
import IPageRoute from "./IPageRoute"

export interface IDynamicRoute {
  EntityId: number
  PreferredUri: string
  IconCssClass: string
  SingularName: string // An `ITextTranslations` string.
  PluralName: string // An `ITextTranslations` string.
  IsIndependentPage: boolean
  SectionColumns: number
  IsGrid: boolean
  route: string
  pageId: number
}

export type ITabProps = IPageRoute & {
  active?:	boolean,
  subTabs?:	IPageRoute[],
  tabOrdinal:	number,
}

export const routeParams = {
  /**
   * When present: hide grid, load profile; load tabs, check if it's current tab;
   * When not present: check if page is not grid, then grab the first BO, and apply rules as if `mainId` was present.
   */
  mainBoId:	undefined,
  /**
   * When present: load tabs, check if it's current tab;
   */
  tabPath:	undefined,
  /**
   * When present: hide grid, load profile;
   * When not present: check if page is not grid, then grab the first BO, and apply rules as if `subId` was present.
   */
  subBoId:	undefined,
}

export const routeParamsStr = Object.entries(routeParams).map(([k, v]) => `:${k}${v === undefined ? "?" : ""}`).join("/")

export default IDynamicRoute
