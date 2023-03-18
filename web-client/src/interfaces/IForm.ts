
import {
  ChangeEvent,
  FocusEvent,
}								from "react"
import {
  IKeyString,
}								from "./IUtils"

export type IFormState<T> = {
  valid: boolean,
  values: { [key in IKeyString<T>]?: any },
  dirty: { [key in keyof T]?: boolean },
  errors: { [key in keyof T]?: string },
  blurred: { [key in keyof T]?: boolean },
  submit: {
    attempted: boolean,
    sent: boolean,
  },
}

export type IFormFieldIds<T> = {
  [key in keyof T]: key
}

export type IValidator = {
  [validator in IValidators]?: {
    message: string,
    [options: string]: any,
  }
}

type IValidators = "date"
  | "datetime"
  | "email"
  | "equality"
  | "exclusion"
  | "format" // Use this for custom RegEx
  | "inclusion"
  | "length"
  | "numericality"
  | "presence"
  | "type"
  | "url" // Use format/regex preferibly

export type IValidatorSchema<T extends {}> = {
  [field in IKeyString<T>]: IValidator
}

type IHandleChangeEvent = {
  persist(): void,
  target: {
    checked?: boolean,
    name: string,
    type: string,
    value: any,
  },
}

export interface IForm<T extends {}> {
  fieldIds: IFormFieldIds<T>
  state: IFormState<T>
  handleChange: (ev: IHandleChangeEvent) => void
  handleBlur: (ev: FocusEvent<HTMLInputElement>) => void
  onSubmit: (sent: boolean) => void
  resetSubmit: () => void
  /**
   * @returns `true` if `newVal` was set successfully, since it needs to be validated. `false` otherwise.
   */
  setVal: (field: IKeyString<T>, newVal: any) => boolean
}
