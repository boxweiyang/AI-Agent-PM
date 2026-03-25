/**
 * AI 提示词模板（前端阶段）
 * - 先在前端集中管理，便于快速迭代；
 * - 后续接后端模板接口时，可保留本文件作为 fallback。
 */

export type PromptTemplateScope = 'requirement_doc' | 'tech_design_doc' | 'tech_selection'

export type RequirementDocPromptVars = {
  versionLabel: string
  markdownExcerpt: string
}

export type TechDesignDocPromptVars = {
  versionLabel: string
  markdownExcerpt: string
}

export type TechSelectionPromptVars = {
  projectName: string
  existingSummary: string
}

export type IterationPlanningPromptVars = {
  projectName: string
  planningBaselineSummary: string
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

const TECH_DESIGN_DOC_BUILTIN_TEMPLATE = `请基于当前技术设计文档 {{versionLabel}}，补齐「技术栈与运行环境、系统上下文与架构、模块与职责、数据与接口边界、非功能需求、风险与待定项」中缺失内容。

当前片段：
{{markdownExcerpt}}`

export function buildTechDesignDocDefaultPrompt(vars: TechDesignDocPromptVars): string {
  return applyTemplate(TECH_DESIGN_DOC_BUILTIN_TEMPLATE, vars)
}

const TECH_DESIGN_DOC_EXTERNAL_TEMPLATE = `你是一名资深系统架构师与技术负责人。请根据用户提供的当前技术设计文档片段，补齐缺失部分，使文档达到可评审、可落地的质量。

【输入】
技术设计版本：{{versionLabel}}

当前片段（可能不完整）：
{{markdownExcerpt}}

【目标】
补齐并完善以下小节（保持标题原样）：
1. ## 技术栈与运行环境
2. ## 系统上下文与架构
3. ## 模块与职责
4. ## 数据与接口边界
5. ## 非功能需求
6. ## 风险与待定项

【输出】
只输出 Markdown 正文，不要额外解释。

【约束】
- 不要编造未确认的需求或接口细节；不确定处标注「待确认」。
- 不要删除用户已有内容，以补齐为主并保持术语一致。
- 非功能需求尽量可度量或可验证。
`

export function buildTechDesignDocExternalPrompt(vars: TechDesignDocPromptVars): string {
  return applyTemplate(TECH_DESIGN_DOC_EXTERNAL_TEMPLATE, vars)
}

const TECH_SELECTION_BUILTIN_TEMPLATE = `你是架构顾问，帮助项目「{{projectName}}」做技术选型。

当前表单摘要（可能为空）：
{{existingSummary}}

请与用户讨论：交付形态拆分、各端技术栈、数据库与存储、架构与部署约束；讨论充分后，由用户在界面点击「根据对话生成技术选型并预览」生成可填入表单的结构化草案。`

export function buildTechSelectionDefaultPrompt(vars: TechSelectionPromptVars): string {
  return applyTemplate(TECH_SELECTION_BUILTIN_TEMPLATE, vars)
}

const TECH_SELECTION_EXTERNAL_TEMPLATE = `你是一名资深系统架构师，通过对话帮助团队确定技术选型。

【项目】{{projectName}}

【当前表单摘要】
{{existingSummary}}

【任务】
1. 澄清业务场景、用户规模、部署环境、团队技能。
2. 建议合理的交付形态拆分（Web / App / 小程序 / 后端服务等）。
3. 对每一段给出技术栈、数据库、架构要点；不确定处标注「待确认」。

【输出约定】
- 对话阶段：自然语言回复即可。
- **外置回填时**：请最终只输出一段可解析的 JSON（也可用 Markdown 的 json 代码块包裹整段），二选一：
  1）**数组**：[{ "delivery_kind": "website", "technologies": "…", "database": "…", "architecture": "…" }, …]
  2）**对象**：{ "tech_delivery_parts": [ … ] }
- 字段：delivery_kind 必填（建议值 website / mobile_app / desktop_exe / mini_program / api_service / ops_tool / other）；other 时填 custom_label；id 可省略（前端会补）；其余字符串字段可选。`

export function buildTechSelectionExternalPrompt(vars: TechSelectionPromptVars): string {
  return applyTemplate(TECH_SELECTION_EXTERNAL_TEMPLATE, vars)
}

const ITERATION_PLANNING_BUILTIN_TEMPLATE = `你是资深敏捷教练兼产品经理助理。请结合项目上下文，与用户讨论如何划分迭代与 Story（目标、范围、验收标准 AC）。

【当前规划摘要（可能为空）】
{{planningBaselineSummary}}

讨论充分后，由用户点击「根据对话生成迭代与 Story 并预览」生成可落库的结构化草案（先 diff 再接受）。`

export function buildIterationPlanningDefaultPrompt(vars: IterationPlanningPromptVars): string {
  return applyTemplate(ITERATION_PLANNING_BUILTIN_TEMPLATE, vars)
}

const ITERATION_PLANNING_EXTERNAL_TEMPLATE = `你协助团队做「迭代 + Story」规划。

【项目】{{projectName}}

【当前规划摘要】
{{planningBaselineSummary}}

【任务】
1. 与用户澄清业务阶段、风险依赖、交付节奏。
2. 建议 1～4 个迭代，每个迭代有名称、目标摘要、范围说明。
3. 每个迭代下列出 Story：标题、多条验收标准（AC）、关联需求锚点（如 REQ-M02）、优先级 0～4。

【输出约定】
- 对话阶段：自然语言即可。
- **外置回填**：最终只输出可解析 JSON（可用 \`\`\`json 代码块包裹），结构为：
{ "iterations": [ { "name": "…", "goal_summary": "…", "scope_notes": "…", "priority": 0 } ], "stories": [ { "iteration_index": 0, "title": "…", "acceptance_criteria": ["…"], "requirement_ref": "…", "priority": 0, "notes": "" } ] }
- iteration_index 为 iterations 数组从 0 开始的下标。
- 用户若选择**增量落库**：迭代名、Story 标题会做规范化比对（去空白、合并空格、忽略大小写）；与已有记录相同则复用迭代或跳过 Story，请勿依赖细微标点差异来区分「同名」条目。`

export function buildIterationPlanningExternalPrompt(vars: IterationPlanningPromptVars): string {
  return applyTemplate(ITERATION_PLANNING_EXTERNAL_TEMPLATE, vars)
}

