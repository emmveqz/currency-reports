
import makeStyles from "@material-ui/core/styles/makeStyles"

export const useStyles = makeStyles( (theme) => ({
  root: {
    height: "100%",
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  rootContainer: {
    width: "100%",
    boxSizing: "border-box",
    paddingLeft: "10px",
    paddingRight: "10px",

    [theme.breakpoints.up("sm")]: {
      paddingLeft: "28px",
      paddingRight: "28px",
    },
    [theme.breakpoints.up("md")]: {
      maxWidth: "960px",
      paddingLeft: "8px",
      paddingRight: "8px",
    },
  },
  mainBox: {
    display: "flex",
    position: "relative",

    "& > * > *": {
      flex: "0 50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",

      [theme.breakpoints.down("sm")]: {
        flex: "0 100%",
      },

      "& > *": {
        width: "94%",

        [theme.breakpoints.down("sm")]: {
          width: "98%",
        },
      },
    },
  },
  captionBox: {
    "& > *": {
      width: "100%",
    },
  },
  submitBtnBox: {
    width: "100%",
    marginTop: "18px",
  },
}) )

export default useStyles
