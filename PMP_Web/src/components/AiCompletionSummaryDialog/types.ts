/** 单行描述 + 可选列表（与接口管理「生成结果」弹窗同一信息密度） */
export type AiCompletionSummaryRow = {
  label: string
  /** 主文案（如数量、模式名、时间） */
  value?: string
  /** 明细列表（如名称、标题）；与 value 可同时出现：先 value 再列表 */
  lines?: string[]
}
