
import createMuiTheme, {
  ThemeOptions,
} from "@material-ui/core/styles/createMuiTheme"
import PaletteEnum from "../enums/PaletteEnum"

//

interface IPaletteShades {
  light:	string
  main:	string
  dark:	string
}

interface IPalette {
  primary:	IPaletteShades
  secondary:	IPaletteShades
}

export const Palettes: { [val in PaletteEnum]: IPalette } = {
  [PaletteEnum.Indigo]: {
    primary: {
      light:	"#6573c3",
      main:	"#3f51b5",
      dark:	"#2c387e",
    },
    secondary: {
      light:	"#68b36b",
      main:	"#43a047",
      dark:	"#2e7031",
    },
  },
  [PaletteEnum.Pink]: {
    primary: {
      light:	"#ed4b82",
      main:	"#e91e63",
      dark:	"#a31545",
    },
    secondary: {
      light:	"#a44fbb",
      main:	"#8e24aa",
      dark:	"#631976",
    },
  },
  [PaletteEnum.Purple]: {
    primary: {
      light:	"#af52bf",
      main:	"#9c27b0",
      dark:	"#6d1b7b",
    },
    secondary: {
      light:	"#fba333",
      main:	"#fb8c00",
      dark:	"#af6200",
    },
  },
  [PaletteEnum.EggPlant]: {
    primary: {
      light:	"#8561c5",
      main:	"#673ab7",
      dark:	"#482880",
    },
    secondary: {
      light:	"#df487f",
      main:	"#d81b60",
      dark:	"#971243",
    },
  },
  [PaletteEnum.Blue]: {
    primary: {
      light:	"#4dabf5",
      main:	"#2196f3",
      dark:	"#1769aa",
    },
    secondary: {
      light:	"#df484f",
      main:	"#d81b60",
      dark:	"#971243",
    },
  },
  [PaletteEnum.Green]: {
    primary: {
      light:	"#33ab9f",
      main:	"#009688",
      dark:	"#00695f",
    },
    secondary: {
      light:	"#df487f",
      main:	"#d81b60",
      dark:	"#971243",
    },
  },
}

const spacing = (factor: number) => `${0.25 * factor}rem`

export const ThemeDefaults: ThemeOptions = {
  spacing,
}

export const LightThemeDefaults: ThemeOptions = {
  palette: {
    background: {
      default: "#f4f6f8",
    },
    text: {
      primary: "#263238",
    },
  },
}

export const DarkThemeDefaults: ThemeOptions = {
  palette: {
    background: {
      default:	"#1c2025",
      paper:		"#282C34",
    },
    text: {
      primary:	"#e6e5e8",
      secondary:	"rgba(230, 229, 232, 0.74)"
    },
  },
}

export const TypographyDefaults = {
  h2: {
    fontSize:	spacing(5.7),
    fontWeight:	400,

    "@media (min-width:600px)": {
      fontSize:	spacing(6.7),
      fontWeight:	500,
    },
  },
  subtitle1: {
    paddingTop: spacing(0.8),
  },
}

const theme = createMuiTheme({
  ...ThemeDefaults,
  ...LightThemeDefaults,
  typography: TypographyDefaults,
})



export default theme
