/**
 * AI 提示词模板（前端阶段）
 * - 先在前端集中管理，便于快速迭代；
 * - 后续接后端模板接口时，可保留本文件作为 fallback。
 */

export type PromptTemplateScope = 'requirement_doc'

export type RequirementDocPromptVars = {
  versionLabel: string
  markdownExcerpt: string
}

const REQUIREMENT_DOC_BUILTIN_TEMPLATE = `请基于当前需求文档 {{versionLabel}}，补齐「目标、功能清单、交互流程、业务规则、异常处理、验收标准」中缺失内容。

当前片段：
{{markdownExcerpt}}`

function applyTemplate(template: string, vars: Record<string, string>): string {
  let out = template
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v)
  }
  return out
}

export function buildRequirementDocDefaultPrompt(vars: RequirementDocPromptVars): string {
  return applyTemplate(REQUIREMENT_DOC_BUILTIN_TEMPLATE, vars)
}

const REQUIREMENT_DOC_EXTERNAL_TEMPLATE = `你是一名资深需求分析师与产品技术顾问。你的任务是根据用户提供的当前需求文档片段，补齐缺失部分，使其具备可验收、可落库、可执行的描述质量。

【角色】
- 需求分析专家：能把碎片需求整理成结构化、可验收的需求条目。
- 软件工程协作者：用清晰的边界、状态、约束减少后续返工。

【输入上下文】
需求版本：{{versionLabel}}

当前片段（可能不完整）：
{{markdownExcerpt}}

【目标】
补齐并完善「目标、功能清单、交互流程、业务规则、异常处理、验收标准」中缺失内容。

【输出格式（必须遵守）】
请只输出 Markdown 正文，不要输出任何解释性文字。
必须包含以下小节标题（保持原样）：
1. ## 目标
2. ## 功能清单
3. ## 交互流程
4. ## 业务规则
5. ## 异常处理
6. ## 验收标准

【约束（必须遵守）】
- 不要编造未提供的信息；无法确定的地方请标注「待确认」。
- 不要删除或重写用户已存在的片段，只补齐缺失部分（如需要可引用片段中的命名/字段保持一致）。
- 交互流程至少包含「主流程」与「异常流程」。
- 验收标准要可观察、可验证，尽量量化或明确验证方式。
`

export function buildRequirementDocExternalPrompt(vars: RequirementDocPromptVars): string {
  return applyTemplate(REQUIREMENT_DOC_EXTERNAL_TEMPLATE, vars)
}

