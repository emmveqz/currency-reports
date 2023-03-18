
import React					from "react"
import validate					from "validate.js"
import {
  IForm,
  IFormFieldIds,
  IFormState,
  IValidatorSchema,
}								from "../interfaces/IForm"
import {
  IKeyString,
}								from "../interfaces/IUtils"

//

// tslint:disable-next-line: max-line-length
export const useForm = <T extends { [prop: string]: any }>(schema: IValidatorSchema<T>, options?: validate.ValidateOption, initialValues: { [key in IKeyString<T>]?: any } = {}, initiallyValid?: boolean): IForm<T> => {
  const fields = Object.keys(schema)
  const fieldIds = fields.reduce<IFormFieldIds<T>>((obj, field) => ({ ...obj, [field]: field }), {} as IFormFieldIds<T>)

  const [formState, setFormState] = React.useState<IFormState<T>>({
    valid: !!initiallyValid,
    values: initialValues,
    dirty: {},
    errors: {},
    blurred: {},
    submit: {
      attempted: false,
      sent: false,
    },
  })

  const resetSubmit = React.useCallback<IForm<T>["resetSubmit"]>(() => {
    setFormState( (prevState) => ({ ...prevState, submit: { attempted: false, sent: false } }) )
  }, [1])

  const onSubmit = React.useCallback<IForm<T>["onSubmit"]>((sent) => {
    setFormState( (prevState) => ({
      ...prevState,
      errors: sent ? prevState.errors : Object
        .entries(schema)
        .filter(([field, validator]) => !!validator.presence && !prevState.values[field as IKeyString<T>])
        .reduce((errors2, [field, validator]) => ({ ...errors2, [field]: (validator.presence as { message: string }).message }),
          Object
            .keys(prevState.errors)
            .filter((errorField) => fields.includes(errorField))
            .reduce((prevErrors, errorField) => ({ ...prevErrors, [errorField]: prevState.errors[errorField] }), {}) ),
      dirty: sent ? {} : prevState.dirty,
      submit: {
        attempted: true,
        sent,
      },
    }) )
  }, [schema])

  const handleBlur = React.useCallback<IForm<T>["handleBlur"]>((ev) => {
    ev.persist()

    setFormState( (prevState) => ({
      ...prevState,
      blurred: {
        ...prevState.blurred,
        [String(ev.target.name)]: true,
      },
    }) )
  }, [1])

  const handleChange = React.useCallback<IForm<T>["handleChange"]>((ev) => {
    ev.persist()
    const field	= String(ev.target.name)
    let error	= validate({ [field]: ev.target.value }, schema, options)
    error		= !error || !error[field] ? undefined : error[field][0]

    setFormState((prevState) => {
      const errors = {
        ...prevState.errors,
        [field]: error,
      }
      const values = {
        ...prevState.values,
        [field]: ev.target.type === "checkbox"
          ? !!ev.target.checked
          : typeof ev.target.value === typeof ""
            ? ev.target.value.trim()
            : ev.target.value,
      }
      const valid = !Object.values(errors).find((err) => !!err) &&
        !Object.entries(schema).find(([_field, validator]) => !!validator.presence && !values[_field])

      return {
        valid,
        values,
        dirty: {
          ...prevState.dirty,
          [field]: true,
        },
        errors,
        blurred: prevState.blurred,
        submit: prevState.submit,
      }
    })
  }, [schema])

  const setVal = React.useCallback<IForm<T>["setVal"]>((field, newVal) => {
    if (!newVal && schema[field].presence) {
      return false
    }
    let error	= validate({ [field]: newVal }, schema, options)
    error		= !error || !error[field] ? undefined : error[field][0]

    if (error) {
      return false
    }

    setFormState((prevState) => {
      const values = {
        ...prevState.values,
        [field]: typeof prevState.values[field] === typeof true
          ? !!newVal
          : typeof newVal === typeof ""
            ? newVal.trim()
            : newVal,
      }

      return {
        ...prevState,
        values,
        dirty: {
          ...prevState.dirty,
          [field]: true,
        },
      }
    })

    return true
  }, [schema])

  React.useMemo(() => {
    setFormState( (prevState) => ({
      ...prevState,
      values: initialValues,
    }) )
  }, [!Object.keys(initialValues).length || initialValues])

  return {
    fieldIds,
    state: formState,
    onSubmit,
    resetSubmit,
    handleChange,
    handleBlur,
    setVal,
  }
}

export default useForm
