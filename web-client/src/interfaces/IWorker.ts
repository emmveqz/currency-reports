
export interface IAction<Actions extends {}, Action extends keyof Actions = keyof Actions> {
  action: Action
  messageId: number
  params: Actions[Action]
}

export interface IResponse<Results extends {}, Action extends keyof Results = keyof Results> {
  messageId: number
  err?: Error
  result: Results[Action]
}
