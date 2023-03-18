
(globalThis as unknown as IAppGlobal).workers = {
  indexedDb: new Worker("/workers/indexedDb.js") as unknown as IIndexedDbWorker,
}

;
(globalThis as unknown as IAppGlobal).consoleLogCss = {
  ComponentMount: "color: red; font-weight: bold; border: 1px solid red; background: #EE0; padding: 1px 8px;",
}

import {
  ThemeProvider,
} from "@material-ui/core/styles"
import createMuiTheme, {
  ThemeOptions,
}							from "@material-ui/core/styles/createMuiTheme"
import React from "react"
import useMediaQuery		from "@material-ui/core/useMediaQuery"
import {
  AlertSuscription,
  CurrencyRateTick,
}							from "./config/web-base-entity-names"
import {
  defaultDbName as dbName,
  RootStoreName,
  cacheDbName,
  cacheBuildVerStore,
  cacheRootStore,
  useOpenDb,
}							from "./bl/indexedDbWorker"
import Home					from "./components/Home"
import consumeGlobalState, {
  initialState,
  useInitValues,
}							from "./GlobalState"
import {
  IDynamicRoute,
  routeParamsStr as DynRouteParams,
}							from "./interfaces/IDynamicRoute"
import IAppGlobal			from "./interfaces/IAppGlobal"
import IIndexedDbWorker		from "./interfaces/IIndexedDbWorker"
import {
  IKeyString,
}							from "./interfaces/IUtils"
import defaultTheme, {
  Palettes,
  DarkThemeDefaults,
  LightThemeDefaults,
  ThemeDefaults,
  TypographyDefaults,
}							from "./styles/theme"

//

const [useUsrLoggedIn]			= consumeGlobalState.User.LoggedIn()
const [useSettingsBrightness]	= consumeGlobalState.Settings.Brightness()
const [useSettingsPalette]		= consumeGlobalState.Settings.Palette()

//

const StartApp = () => {
  console.log("%cStartApp", (globalThis as unknown as IAppGlobal).consoleLogCss.ComponentMount, Date.now())

  const [usrLoggedIn] = useUsrLoggedIn()
  const [settingsBrightness, setSettingsBrightness] = useSettingsBrightness()
  const [settingsPalette] = useSettingsPalette()
  const darkMode = useMediaQuery("(prefers-color-scheme: dark)")

  const [
    dynamicRoutes,
    setDynamicRoutes,
  ]	= React.useState<IDynamicRoute[]>([])

  const [
    theme,
    setTheme,
  ]	= React.useState(defaultTheme)

  const [
    autoBrightness,
    setAutoBrightness,
  ]	= React.useState<"dark"|"light">("light")

  React.useMemo(() => {
    if (darkMode && autoBrightness !== "dark" ||
      !darkMode && autoBrightness !== "light") {
        setAutoBrightness(darkMode ? "dark" : "light")
    }

  }, [darkMode])

  React.useMemo(() => {
    // `settingsBrightness` from user button has preference over `autoBrightness`
    const type		= settingsBrightness || autoBrightness
    const defaults	= {
      ...ThemeDefaults,
      ...(type === "light" ? LightThemeDefaults : DarkThemeDefaults),
      typography: TypographyDefaults,
    } as ThemeOptions

    setTheme( createMuiTheme({
      ...defaults,
      palette: {
        ...defaults.palette,
        type,
        primary: {
          ...(defaults.palette ? defaults.palette.primary : {}),
          ...Palettes[settingsPalette].primary,
        },
        secondary: {
          ...(defaults.palette ? defaults.palette.secondary : {}),
          ...Palettes[settingsPalette].secondary,
        },
      },
    }) )
  }, [settingsPalette, settingsBrightness, autoBrightness])

  return <ThemeProvider { ... {theme} } >
    <Home />
  </ThemeProvider>
}

const Loading = () => {
  console.log("Loading", Date.now())

  return <div></div>
}

const InitStoreValues = () => {
  console.log("InitStoreValues", Date.now())

  const { pending } = useInitValues()

  return pending
    ? <Loading />
    : <StartApp />
}

export const App = () => {
  console.log("%cApp", (globalThis as unknown as IAppGlobal).consoleLogCss.ComponentMount, Date.now())

  const {
    pending,
    result,
  }				= useOpenDb({ dbName, schema: initialState, rootStore: RootStoreName })

  const {
    pending: pending2,
    result: result2,
  }				= useOpenDb({ dbName: cacheDbName, schema: { [cacheBuildVerStore]: {} }, rootStore: cacheRootStore })

  if (result2 instanceof Error) {
    console.log("useOpenDb error:", result2.message)
  }
  if (result instanceof Error) {
    console.log("useOpenDb error:", result.message)
  }

  return pending || pending2
    ? <Loading />
    : (	result instanceof Error
      ? <StartApp />
      : <InitStoreValues />)
}

export default App