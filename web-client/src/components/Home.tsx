
import Box			from "@material-ui/core/Box"
import Button		from "@material-ui/core/Button"
import Checkbox		from "@material-ui/core/Checkbox"
import FormControl	from "@material-ui/core/FormControl"
import FormControlLabel from "@material-ui/core/FormControlLabel"
import FormHelperText from "@material-ui/core/FormHelperText"
import Grid			from "@material-ui/core/Grid"
import InputLabel	from "@material-ui/core/InputLabel"
import MenuItem		from "@material-ui/core/MenuItem"
import Paper		from "@material-ui/core/Paper"
import Select		from "@material-ui/core/Select"
import TextField	from "@material-ui/core/TextField"
import Typography	from "@material-ui/core/Typography"
import RateAlertBasisEnum	from "@emmveqz/currency-reports-core-enums/dist/RateAlertBasisEnum"
import React		from "react"
import {
  IProps,
  useHomeBl,
}							from "./bl/Home"
import {
  extractEnumNumbers,
}							from "../bl/utils"
import IAppGlobal			from "../interfaces/IAppGlobal"
import useStyles			from "../styles/Home"

//

export const Home = (props: React.PropsWithChildren<IProps>): JSX.Element => {
  console.log("%cHome", (globalThis as unknown as IAppGlobal).consoleLogCss.ComponentMount, Date.now())
  const css = useStyles()
  const {
    txt,
    lang,
    form,
    selectedCurrencyLastPrice,
    trySubscribe,
  } = useHomeBl(props)

  const helperText2 = (form.state.submit.attempted || form.state.blurred.basis) ? form.state.errors.basis : undefined

  return (
    <Box className={css.root}>
      <Box className={css.rootContainer}>
        <Paper className={css.mainBox}>
          <Grid container alignItems="center" justify="center">
            <Grid item>
              <TextField
                fullWidth
                variant="outlined"
                margin="normal"
                label={txt.currency}
                name={form.fieldIds.currency}
                onBlur={form.handleBlur}
                onChange={form.handleChange}
                error={(form.state.submit.attempted || form.state.blurred.currency) && !!form.state.errors.currency}
                helperText={(form.state.submit.attempted || form.state.blurred.currency) ? form.state.errors.currency : undefined} />
            </Grid>
            {
              !!selectedCurrencyLastPrice &&
              <Grid item>
                <Typography variant="subtitle1" color="textSecondary">
                  {`${form.state.values.currency} last price: $${selectedCurrencyLastPrice} USD`}
                </Typography>
              </Grid>
            }
            <Grid item>
              <FormControl
                fullWidth
                margin="normal"
                variant="outlined" >
                  <InputLabel>{txt.basis}</InputLabel>
                  <Select
                    fullWidth
                    label={txt.basis}
                    name={form.fieldIds.basis}
                    defaultValue={form.state.values.basis}
                    onBlur={form.handleBlur}
                    error={(form.state.submit.attempted || form.state.blurred.basis) && !!form.state.errors.basis}
                    onChange={form.handleChange as (ev: React.ChangeEvent<HTMLInputElement|{ name?: string, value: any }>) => void} >
                    {
                      extractEnumNumbers(RateAlertBasisEnum).map((enumId, idx) =>
                      <MenuItem key={idx} value={enumId} >{!enumId ? `` : RateAlertBasisEnum[enumId]}</MenuItem>)
                    }
                  </Select>
                  {!!helperText2 && <FormHelperText>{helperText2}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item>
              <TextField
                fullWidth
                variant="outlined"
                margin="normal"
                label={txt.factor}
                name={form.fieldIds.factor}
                defaultValue="0"
                value={form.state.values.factor}
                onBlur={form.handleBlur}
                onChange={form.handleChange}
                error={(form.state.submit.attempted || form.state.blurred.factor) && !!form.state.errors.factor}
                helperText={(form.state.submit.attempted || form.state.blurred.factor) ? form.state.errors.factor : undefined} />
            </Grid>
            <Grid item>
              <TextField
                fullWidth
                variant="outlined"
                margin="normal"
                label={txt.email}
                name={form.fieldIds.email}
                onBlur={form.handleBlur}
                onChange={form.handleChange}
                error={(form.state.submit.attempted || form.state.blurred.email) && !!form.state.errors.email}
                helperText={(form.state.submit.attempted || form.state.blurred.email) ? form.state.errors.email : undefined} />
            </Grid>
            <Grid item>
              <TextField
                fullWidth
                variant="outlined"
                margin="normal"
                label={txt.memo}
                name={form.fieldIds.memo}
                onBlur={form.handleBlur}
                onChange={form.handleChange}
                error={(form.state.submit.attempted || form.state.blurred.memo) && !!form.state.errors.memo}
                helperText={(form.state.submit.attempted || form.state.blurred.memo) ? form.state.errors.memo : undefined} />
            </Grid>
            <Grid item>
              <FormControlLabel
                label={txt.reminduntilseen}
                name={form.fieldIds.reminduntilseen}
                className="MuiFormControl-marginNormal MuiFormControl-fullWidth"
                onChange={form.handleChange as (ev: React.ChangeEvent<HTMLInputElement|{}>) => void}
                control={<Checkbox color="primary" />} />
            </Grid>
            <Grid item>
              <Button
                fullWidth
                disableElevation
                variant="contained"
                size="large"
                color="primary"
                disabled={!Object.values(form.state.dirty).length}
                onClick={trySubscribe} >{txt.subscribe}</Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Box>
  )
}

export default Home
