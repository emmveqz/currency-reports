
// tslint: prefer-for-of
import {
  CurrencyEnum,
  HistoryRangeEnum,
  RateAlertBasisEnum,
  RateAlertTypeEnum,
}                                 from "@emmveqz/currency-reports-core-enums"
import IBaseBo, {
  IBaseBoFactory,

}                                 from "@emmveqz/currency-reports-core-interfaces/dist/IBaseBo"
import IBaseDao                   from "@emmveqz/currency-reports-core-interfaces/dist/IBaseDao"
import IMyDb                      from "@emmveqz/currency-reports-core-interfaces/dist/IMyDb"
import {
  QryClause,
  SqlCond,
  SqlOptr,
}                                 from "@emmveqz/currency-reports-core-interfaces/dist/IQueryBuilder"
import AlertSuscription           from "@emmveqz/currency-reports-core/dist/bos/AlertSuscription"
import BaseBo                     from "@emmveqz/currency-reports-core/dist/bos/BaseBo"
import CurrencyRateTick           from "@emmveqz/currency-reports-core/dist/bos/CurrencyRateTick"
import BaseDao                    from "@emmveqz/currency-reports-core/dist/dao/BaseDao"
import MyDb                       from "@emmveqz/currency-reports-core/dist/dao/MyDb"
import CryptoCoinsRateTicker      from "@emmveqz/currency-reports-tools/dist/CryptoCoinsRateTicker"
import BinanceUs                  from "@emmveqz/currency-reports-tools/dist/currency-endpoints/BinanceUs"
import Utils                      from "@emmveqz/currency-reports-tools/dist/Utils"
import Validator                  from "@emmveqz/currency-reports-tools/dist/Validator"
import {
  sendUnaryData,
  ServerUnaryCall,
  ServerWritableStream,
}                                 from "@grpc/grpc-js"
import config                     from "../config/my-config-vars"
import {
  BooleanResponse,
  FloatResponse,
  ServiceResponseStatus,
  StatusResponse,
}                                 from "../proto-types/common_pb"
import {
  ICurrencyServiceServer,
}                                 from "../proto-types/crypto-coins_grpc_pb"
import {
  CurrencyRateTick as GrpcCurrencyRateTick,
  CurrencySupportedRequest,
  HistoryDataRequest,
  HistoryDataResponse,
  MarkAlertAsSeenRequest,
  RealTimeRateRequest,
  SuscribeAlertRequest,
}                                 from "../proto-types/crypto-coins_pb"
import {
  copyMetadata,
  RecordUserAction,
}                                 from "./common"

type IDeclaredKeys<T> = {
  [K in keyof T]: string extends K ? never : (number extends K ? never : K)
} extends { [_ in keyof T]: infer U } ? U : never

type ICurrencyServiceMethods = IDeclaredKeys<ICurrencyServiceServer>

type ICurrencyService = Pick<ICurrencyServiceServer, ICurrencyServiceMethods>

type INewableDao<IDb extends IMyDb, IDao extends IBaseDao> = { new(db: IDb): IDao }

//

export class CurrencyService<IDb extends IMyDb, IDao extends IBaseDao> implements ICurrencyService {

  public static TIMES_TO_REMIND = 3

  private db: IDb
  private DaoFactory: INewableDao<IDb, IDao>

  public constructor() {
    this.db = new MyDb({
      Database:	config.MYVAR_CORE_DB_DEFAULTSCHEMA,
      Host:		config.MYVAR_CORE_DB_HOST,
      Pass:		config.MYVAR_CORE_DB_PASS,
      User:		config.MYVAR_CORE_DB_USER,
    }) as IMyDb as IDb

    this.DaoFactory = BaseDao as INewableDao<IDb, IBaseDao> as INewableDao<IDb, IDao>
  }

  public realTimeRate(call: ServerWritableStream<RealTimeRateRequest, FloatResponse>): void {
    const currency		= getCurrencyEnum( call.request.getCurrency() )
    const rateTicker	= new CryptoCoinsRateTicker(BinanceUs)
    const ticker		= rateTicker.Tick(currency)
    let response: FloatResponse

    (async () => {
      let tick = await ticker.next()

      while (!tick.done && !call.cancelled) {
        response = new FloatResponse()

        response.setStatus(ServiceResponseStatus.SUCCESS)
        response.setStatusmsg("")
        response.setResult(tick.value.rate)

        call.write(response)

        tick = await ticker.next({
          abort: !!call.cancelled,
        })
      }

      call.sendMetadata( copyMetadata(call.metadata) )
      call.end()
    })()
  }

  /**
   * @ToDo Change this procedure to a stream, since it might return a big payload.
   */
  public historyData(call: ServerUnaryCall<HistoryDataRequest, HistoryDataResponse>, callback: sendUnaryData<HistoryDataResponse>): void {
    const dao		= new this.DaoFactory(this.db)
    const currency	= getCurrencyEnum( call.request.getCurrency() )
    const range		= call.request.getHistoryrange() as number as HistoryRangeEnum
    const dtStart	= getHistoryDtStart(range)
    const response	= new HistoryDataResponse()
    response.setStatus(ServiceResponseStatus.ERROR)

    const qry: QryClause = {
      Prop:	BaseBo.getPropNames(CurrencyRateTick).Currency,
      Optr:	SqlOptr.Equal,
      Val:	[currency],
      InnerClsCond: SqlCond.AND,
      RightClauses: [{
        Prop:	BaseBo.getPropNames(CurrencyRateTick).CreationDate,
        Optr:	SqlOptr.Greater,
        Val:	[dtStart],
        InnerClsCond: undefined,
        RightClauses: undefined,
      }],
    }

    ;
    (async () => {
      const result = await dao.Query(qry, CurrencyRateTick)

      if (result instanceof Error) {
        response.setStatusmsg("error occurred while searching data.")

        return callback(null, response)
      }

      response.setStatus(ServiceResponseStatus.SUCCESS)
      response.setResultList( getHistory(range, result) )
      callback( null, response, copyMetadata(call.metadata) )
    })()
  }

  public currencySupported(call: ServerUnaryCall<CurrencySupportedRequest, BooleanResponse>, callback: sendUnaryData<BooleanResponse>): void {
    const result	= currencySupported( call.request.getCurrency() )
    const response	= new BooleanResponse()

    response.setStatus(ServiceResponseStatus.SUCCESS)
    response.setResult(result)

    RecordUserAction(
      this.db,
      call.metadata,
      "grpc/CurrencyService.currencySupported",
      JSON.stringify( call.request.toObject() ),
      JSON.stringify( response.toObject() ),
    )

    callback( null, response, copyMetadata(call.metadata) )
  }

  public suscribeAlert(call: ServerUnaryCall<SuscribeAlertRequest, StatusResponse>, callback: sendUnaryData<StatusResponse>): void {
    console.log("suscribeAlert")

    RecordUserAction(
      this.db,
      call.metadata,
      "grpc/CurrencyService.suscribeAlert",
      JSON.stringify( call.request.toObject() ),
      "",
    )

    const dao = new this.DaoFactory(this.db)
    const {
      basis,
      currency,
      currentrate,
      email,
      factor,
      memo,
      phonenumber,
      reminduntilseen,
      timestorepeat,
      type,
    } = call.request.toObject()

    const currencyEnumId = getCurrencyEnum(currency)

    const response = new StatusResponse()
    response.setStatus(ServiceResponseStatus.ERROR)

    const qry: QryClause = {
      Prop:	BaseBo.getPropNames(CurrencyRateTick).Currency,
      Optr:	SqlOptr.Equal,
      Val:	[currencyEnumId],
      InnerClsCond: undefined,
      RightClauses: undefined,
    }

    const newBo				= new AlertSuscription()
    newBo.Basis				= basis as number as RateAlertBasisEnum
    newBo.CreatedByUserId	= 1
    newBo.Currency			= currencyEnumId
    newBo.Email				= email
    newBo.Factor			= parseFloat( factor.toFixed(4) )
    newBo.Memo				= memo
    newBo.PhoneNumber		= phonenumber
    newBo.TimesToRemind		= reminduntilseen ? CurrencyService.TIMES_TO_REMIND : 1
    newBo.TimesToRepeat		= !timestorepeat ? 1 : timestorepeat

    ;
    (async () => {
      const lastRate = await getLastBo(dao, CurrencyRateTick, qry)

      if (lastRate instanceof Error) {
        response.setStatusmsg("error occurred while creating data (1)")

        return callback(null, response)
      }

      if (!lastRate) {
        response.setStatusmsg(`error occurred. could not find data related to ${currency}`)

        return callback(null, response)
      }

      /**
       * @ToDo Calculate `newBo.Type` based on `newBo.Basis`
       */
      newBo.CurrentRate	= lastRate.Rate
      newBo.Type			= factor > lastRate.Rate ? RateAlertTypeEnum.Above : RateAlertTypeEnum.Below

      const savedBo = await dao.Create(newBo)

      if (savedBo instanceof Error) {
        response.setStatusmsg("error occurred while creating data.")

        return callback(null, response)
      }

      response.setStatus(ServiceResponseStatus.SUCCESS)
      response.setStatusmsg("")

      RecordUserAction(
        this.db,
        call.metadata,
        "grpc/CurrencyService.suscribeAlert",
        JSON.stringify( call.request.toObject() ),
        JSON.stringify( response.toObject() ),
      )

      callback( null, response, copyMetadata(call.metadata) )
    })()
  }

  public markAlertAsSeen(call: ServerUnaryCall<MarkAlertAsSeenRequest, StatusResponse>, callback: sendUnaryData<StatusResponse>): void {
    const dao = new this.DaoFactory(this.db)
    const {
      alertid,
      email,
      phonenumber,
    } = call.request.toObject()

    const response = new StatusResponse()
    response.setStatus(ServiceResponseStatus.ERROR)

    ;
    (async () => {
      const alert = await dao.Get(alertid, AlertSuscription)

      if (!alert || alert instanceof Error) {
        response.setStatusmsg("error occurred while finding data.")

        return callback(null, response)
      }
      if ( (!email || alert.Email.toLowerCase() !== email.toLowerCase()) &&
        (!phonenumber || Validator.GetOnlyNumbers(phonenumber) !== Validator.GetOnlyNumbers(alert.PhoneNumber)) ) {
        response.setStatusmsg("error, cannot update (1)")

        return callback(null, response)
      }

      alert.TimesToRemind = 0

      const updated = await dao.Update(alert)

      if (!updated || updated instanceof Error) {
        response.setStatusmsg("error, cannot update (2)")

        return callback(null, response)
      }

      response.setStatus(ServiceResponseStatus.SUCCESS)
      response.setStatusmsg("")
      callback( null, response, copyMetadata(call.metadata) )
    })()
  }

}

//

export const currencySupported = (currency: string): boolean => {
  return String(currency).toUpperCase() in CurrencyEnum
}

export const getCurrencyEnum = (currency: string): CurrencyEnum => {
  type CurrencyEnumKey = keyof typeof CurrencyEnum
  return currencySupported(currency) ? CurrencyEnum[String(currency).toUpperCase() as CurrencyEnumKey] : CurrencyEnum.None1
}

export const getHistory = (range: HistoryRangeEnum, data: CurrencyRateTick[]): GrpcCurrencyRateTick[] => {
  let tick: GrpcCurrencyRateTick
  let stepsSum = 0
  let secondsInBetween = 0
  const list: GrpcCurrencyRateTick[] = []

  if (range === HistoryRangeEnum.Hourly) {
    secondsInBetween = 16
  }
  else if (range === HistoryRangeEnum.FourHourly) {
    secondsInBetween = 64
  }
  else if (range === HistoryRangeEnum.Daily) {
    // 5 Minutes
    secondsInBetween = 300
  }
  else if (range === HistoryRangeEnum.Weekly) {
    // 30 Minutes
    secondsInBetween = 1800
  }
  else if (range === HistoryRangeEnum.Monthly) {
    // 3 Hours
    secondsInBetween = 10800
  }
  else if (range === HistoryRangeEnum.Yearly) {
    // 24 Hours
    secondsInBetween = 86400
  }

  const skipStep = Math.floor(secondsInBetween / CryptoCoinsRateTicker.SECONDS_GAP)
  data.sort((a, b) => a.CreationDate > b.CreationDate ? 1 : -1)

  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < data.length; i++) {
    stepsSum += data[i].Rate

    if (i % skipStep) {
      continue
    }
    tick = new GrpcCurrencyRateTick()

    tick.setRate(stepsSum / skipStep)
    tick.setCreationdate(data[i].CreationDate)

    list.push(tick)
    stepsSum = 0
  }

  /**
   * @ToDo FIX: implement actual time checking.
   * Result is based on an algorithm that assumes database records were created on a successful API pull.
   */
  return list
}

export const getHistoryDtStart = (range: HistoryRangeEnum): string => {
  let hoursDiff = 0

  if (range === HistoryRangeEnum.Hourly) {
    hoursDiff = 1
  }
  else if (range === HistoryRangeEnum.FourHourly) {
    hoursDiff = 4
  }
  else if (range === HistoryRangeEnum.Daily) {
    hoursDiff = 24
  }
  else if (range === HistoryRangeEnum.Weekly) {
    hoursDiff = 168
  }
  else if (range === HistoryRangeEnum.Monthly) {
    hoursDiff = 720
  }
  else if (range === HistoryRangeEnum.Yearly) {
    hoursDiff = 8760
  }

  return Utils.DatetimeToString( Utils.DatetimeDiff(new Date(), -hoursDiff) )
}

export const getLastBo = async <T extends IBaseBo>(dao: IBaseDao, factory: IBaseBoFactory<T>, qry?: QryClause): Promise<T | Error | undefined> => {
  dao
    .setPaging({
      Page: 1,
      Size: 1,
    })
    .setOrderBy({
      Prop: BaseBo.getPropNames(factory).Id,
      Desc: true,
    })

  const list = await ( !qry ? dao.List(factory) : dao.Query(qry, factory) )

  return list instanceof Error ? list : list[0]
}

export default CurrencyService
