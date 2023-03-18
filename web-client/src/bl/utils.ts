
export const RegExps = {
  Email: /^[a-zA-Z0-9]+(?:[.!#$%&'*+/=?^_`{|}~-]*[a-zA-Z0-9]+)?@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9]))+$/,
  RealNumber: /^[+-]?(?:\d+\.?\d*|\d*\.\d+)$/,
  IAlpNum: /^[a-zA-Z0-9]*$/,
}

export const extractEnumNumbers = (en: { [prop: string]: number|string } | Array<string>): number[] => {
  return Object
    .values(en as { [prop: string]: number })
    .filter( (val) => Number.isInteger(val)  )
}
