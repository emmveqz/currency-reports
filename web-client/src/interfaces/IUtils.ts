
import LanguageEnum			from "@emmveqz/currency-reports-core-enums/dist/LanguageEnum"
import {
  SqlCond,
  SqlOptr,
}							from "../../../proto-types/common_pb"

//

export type NextRequest = { abort?: boolean, waitFor?: Promise<void> } | undefined

export type MyAsyncGenerator<T> = AsyncGenerator<T, void, NextRequest>

export type JsVal = string | boolean | number

/**
 * @note Reflected from core-interfaces
 */
export type SqlJsVal = {
  0: JsVal,
} & JsVal[]

/**
 * @note Reflected from core-interfaces
 */
export type QryClause = {
  Optr: SqlOptr,
  Prop: string,
  RightClauses: undefined,
  InnerClsCond: undefined,
  NextClsCond?: SqlCond,
  Val: SqlJsVal,
} | {
  Optr: SqlOptr,
  Prop: string,
  RightClauses: QryClause[],
  InnerClsCond: SqlCond,
  NextClsCond?: SqlCond,
  Val: SqlJsVal,
}

export type IDateFormat = "american"|"european"

export type IKeyString<T extends {}> = Extract<keyof T, string>

/**
 * Needs to be parsed from a string, using `JSON.parse()`
 */
export type ITextTranslations = Map<LanguageEnum, string>

export type IValOf<T extends {}> = T extends { [prop: string]: infer Val } ? Val : never

export type IArrayEl<A> = A extends Array<infer T> ? T : never

export type IFuncArgs<T> = T extends (...args: infer A) => any ? A : never

export type Extract2<K, T> = K extends T ? (K extends "Unknown" ? never : K) : never

export type IValidLanguages = Extract2<keyof typeof LanguageEnum, string>

export type INullableProps<T> = {
  [prop in keyof T]?: T[prop]
}

export type INonNullableProps<T> = {
  [prop in keyof Required<T>]: NonNullable<T[prop]>
}

export type ISubstract<T extends {}, Sub extends INullableProps<T>> = Omit<T, keyof Sub>
