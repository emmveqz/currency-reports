
import React				from "react"
import LanguageEnum			from "@emmveqz/currency-reports-core-enums/dist/LanguageEnum"
import {
  ClientReadableStream,
  Metadata,
}							from "grpc-web"
import {
  GRPC_ENDPOINT,
  grpcUnaryRequest,
  getUnaryResponse,
  grpcStreamRequest,
  isErrorStatus,
}							from "../../bl/gRpc"
import useForm				from "../../bl/useForm"
import {
  RegExps,
}							from "../../bl/utils"
import consumeGlobalState	from "../../GlobalState"
import {
  IForm,
  IValidatorSchema,
}							from "../../interfaces/IForm"
import IServiceResponse		from "../../interfaces/IServiceResponse"
import {
  INonNullableProps,
  ISubstract,
  MyAsyncGenerator,
}							from "../../interfaces/IUtils"
import FormTranslations		from "../../translations/Form"
import HomeTranslations, {
  ITranslationTags,
}							from "../../translations/Home"
import {
  FloatResponse,
  RateAlertTypeEnum,
  ServiceResponseStatus,
  StatusResponse,
}							from "../../../proto-types/common_pb"
import {
  CurrencyRateTick,
  CurrencySupportedRequest,
  HistoryDataRequest,
  RealTimeRateRequest,
  SuscribeAlertRequest,
}							from "../../../proto-types/crypto-coins_pb"
import {
  CurrencyServiceClient,
}							from "../../../proto-types/Crypto-coinsServiceClientPb"

//

export type IProps = {
  [prop: string]: any,
}

type ISubscribeProps = SuscribeAlertRequest.AsObject & {
}

type ISubscribePropsUI = ISubstract<ISubscribeProps, {
  currentrate: number,
  phonenumber: string,
  timestorepeat: number,
  type: RateAlertTypeEnum,
}>

type IRealTimeRateProps = RealTimeRateRequest.AsObject & {
}

type IHistoryDataProps = HistoryDataRequest.AsObject & {
}

type ICurrencySupportedProps = CurrencySupportedRequest.AsObject & {
}

interface IUseHomeValues {
  txt: ITranslationTags
  lang: LanguageEnum
  form: IForm<ISubscribePropsUI>
  selectedCurrencyLastPrice: number,
  trySubscribe: () => void
}

//

const currencyService		= new CurrencyServiceClient(GRPC_ENDPOINT, null, null)
const formTranslations		= new FormTranslations()
const translations			= new HomeTranslations()
const [useUsrId]			= consumeGlobalState.User.Id()
const [useUsrLoggedIn]		= consumeGlobalState.User.LoggedIn()
const [useUsrName]			= consumeGlobalState.User.Name()
const [useUsrDateformat]	= consumeGlobalState.User.Dateformat()
const [useUsrTimezone]		= consumeGlobalState.User.Timezone()
const [useSettingsLanguage] = consumeGlobalState.Settings.Language()

//

const getHistoryData = async (props: IHistoryDataProps): Promise<IServiceResponse<CurrencyRateTick[]>> => {
  const request = new HistoryDataRequest()
  request.setCurrency		(props.currency)
  request.setHistoryrange	(props.historyrange)

  const result = await grpcUnaryRequest(request, currencyService.historyData, currencyService)

  if (result instanceof Error) {
    return {
      msg: result.message,
      status: ServiceResponseStatus.ERROR,
    }
  }
  if (!result.resp) {
    return {
      msg: "error retrieving data",
      status: ServiceResponseStatus.ERROR,
    }
  }

  return {
    msg: result.resp.getStatusmsg(),
    status: result.resp.getStatus(),
    result: result.resp.getResultList(),
  }
}

const getRealTimeRate = async function* (props: IRealTimeRateProps): MyAsyncGenerator<IServiceResponse<number>> {
  let abort: boolean|undefined
  let msg: string = ""
  let status: ServiceResponseStatus = ServiceResponseStatus.SUCCESS
  const request = new RealTimeRateRequest()
  request.setCurrency(props.currency)

  /**
   * @ToDo Casting needed due to a bug in grpc-web TS generator.
   */
  const method = currencyService.realTimeRate as (req: RealTimeRateRequest, met?: Metadata) => ClientReadableStream<FloatResponse>

  const gentor = grpcStreamRequest(request, method, currencyService)
  let itr = await gentor.next()

  while (!itr.done && !abort) {
    if (itr.value instanceof Error) {
      yield {
        msg: itr.value.message,
        status: ServiceResponseStatus.ERROR,
      }
      break
    }
    if (!itr.value.resp) {
      yield {
        msg: "error retrieving data",
        status: ServiceResponseStatus.ERROR,
      }
      break
    }
    const obj = itr.value.resp.toObject()

    if (!obj.status || obj.status === ServiceResponseStatus.INVALIDSESSION) {
      yield {
        msg: obj.statusmsg,
        status: obj.status,
      }
      break
    }
    if (obj.status !== ServiceResponseStatus.SUCCESS) {
      msg = obj.statusmsg
      status = obj.status
    }

    abort = (yield {
      msg,
      status,
      result: obj.result,
    })?.abort

    itr = await gentor.next({ abort })
  }
}

const currencySupported = async (props: ICurrencySupportedProps): Promise<IServiceResponse<boolean>> => {
  const request = new CurrencySupportedRequest()
  request.setCurrency		(props.currency)

  const result = await grpcUnaryRequest(request, currencyService.currencySupported, currencyService)

  if (result instanceof Error) {
    return {
      msg: result.message,
      status: ServiceResponseStatus.ERROR,
    }
  }
  if (!result.resp) {
    return {
      msg: "error retrieving data",
      status: ServiceResponseStatus.ERROR,
    }
  }

  return {
    msg: result.resp.getStatusmsg(),
    status: result.resp.getStatus(),
    result: result.resp.getResult(),
  }
}

const suscribeAlert = async (props: ISubscribeProps): Promise<IServiceResponse<StatusResponse>> => {
  const request = new SuscribeAlertRequest()
  request.setBasis			(props.basis)
  request.setCurrency			(props.currency)
  request.setCurrentrate		(props.currentrate)
  request.setEmail			(props.email)
  request.setFactor			(props.factor)
  request.setMemo				(props.memo)
  request.setPhonenumber		(props.phonenumber)
  request.setReminduntilseen	(props.reminduntilseen)
  request.setTimestorepeat	(props.timestorepeat)
  request.setType				(props.type)

  const result = await grpcUnaryRequest(request, currencyService.suscribeAlert, currencyService)

  return getUnaryResponse(result)
}

//

export const useHomeBl = (props: IProps): IUseHomeValues => {
  const [lang]	= useSettingsLanguage()
  const txt		= translations		.from(lang) || translations		.translations.eng
  const formTxt	= formTranslations	.from(lang) || formTranslations	.translations.eng

  const [
    selectedCurrencyLastPrice,
    setSelectedCurrencyLastPrice,
  ]				= React.useState(0)

  const [
    currencyFound,
    setCurrencyFound,
  ]				= React.useState(false)

  const schema: IValidatorSchema<ISubscribePropsUI> = {
    basis: {
      presence: {
        message: formTxt.errorFieldRequired,
      },
      numericality: {
        greaterThan: 0,
        message: formTxt.errorFieldRequired,
      },
    },
    currency: {
      presence: {
        message: formTxt.errorFieldRequired,
      },
      format: {
        pattern: RegExps.IAlpNum,
        message: formTxt.errorFieldInvalidFormat,
      },
      length: {
        maximum: 10,
        message: formTxt.errorFieldMaximum,
      },
      /*
      */
    },
    email: {
      presence: {
        message: formTxt.errorFieldRequired,
      },
      format: {
        pattern: RegExps.Email,
        message: formTxt.errorFieldInvalidFormat,
      },
    },
    factor: {
      presence: {
        message: formTxt.errorFieldRequired,
      },
      format: {
        pattern: RegExps.RealNumber,
        message: formTxt.errorFieldInvalidFormat,
      },
    },
    /*
    phonenumber: {
      length: {
        minimum: 8,
        message: formTxt.errorFieldMinimum.replace("{0}", "8"),
      },
      presence: {
        message: formTxt.errorFieldRequired,
      },
      numericality: {
        onlyInteger: true,
        message: formTxt.errorFieldInteger,
      },
    },
    */
    reminduntilseen: {
    },
    memo: {
    },
  }

  const form		= useForm(schema, { fullMessages: false })

  const currencyChanged = async (currency: string) => {
    setCurrencyFound(false)

    if (!currency) {
      setSelectedCurrencyLastPrice(0)
      return
    }

    const supportedResult = await currencySupported({
      currency,
    })

    if ( isErrorStatus(supportedResult.status) ) {
      globalThis.alert(`error ${supportedResult.msg}`)
      return
    }

    if (!supportedResult.result) {
      console.log(`${currency} ${txt.currencyUnsupported}`)
      setSelectedCurrencyLastPrice(0)
      return
    }

    const gentor = getRealTimeRate({
      currency,
    })

    const itr = await gentor.next({ abort: true })

    if (itr.done || !itr.value || !itr.value.result) {
      globalThis.alert(`error: ${txt.errMsgCantRetrieveData}`)
      return
    }

    if ( isErrorStatus(itr.value.status) ) {
      globalThis.alert(`error ${itr.value.msg}`)
      return
    }

    setCurrencyFound(true)

    const rate = parseFloat( (itr.value.result || 0).toFixed(6) )

    setSelectedCurrencyLastPrice(rate)
    !rate || form.setVal( "factor", rate.toString() )

    await gentor.next({ abort: true })
  }

  const trySubscribe = React.useCallback(() => {

      form.onSubmit(form.state.submit.sent)

      if (!currencyFound) {
        globalThis.alert(`${form.state.values.currency} ${txt.currencyUnsupported}`)
        return
      }

      if (!form.state.valid || !Object.values(form.state.dirty).find((dirty) => !!dirty) || form.state.submit.sent) {
        return
      }
      form.onSubmit(true)

      ;
      (async () => {
        const result = await suscribeAlert({
          ...form.state.values as INonNullableProps<typeof form.state.values>,
          currentrate: 0,
          phonenumber: "",
          timestorepeat: 1,
          type: RateAlertTypeEnum.ABOVE,
        })

        if ( isErrorStatus(result.status) ) {
          globalThis.alert(`error ${result.msg}`)
          return
        }

        globalThis.alert( String(txt.currencyAlertCreated).replace("{0}", form.state.values.currency) )
        form.onSubmit(false)

      })()
  }, [form.state, currencyFound])

  React.useEffect(() => {
    currencyChanged(form.state.values.currency)
  }, [form.state.values.currency])

  return {
    txt,
    lang,
    form,
    selectedCurrencyLastPrice,

    trySubscribe,
  }
}

export default useHomeBl
