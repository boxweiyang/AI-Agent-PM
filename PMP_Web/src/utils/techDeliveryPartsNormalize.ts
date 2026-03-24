/**
 * 将未知 JSON 规范化为 `TechDeliveryPart[]`（契约与 MSW、AI 抽屉共用）。
 * 含选型表 **文本化**（供 DiffDialog 左右栏对照）。
 */
import { TECH_DELIVERY_KIND_OPTIONS } from '@/config/techDeliveryPartKinds'
import type { TechDeliveryPart } from '@/types/api-contract'

export function normalizeTechDeliveryPartsFromUnknown(raw: unknown): TechDeliveryPart[] {
  if (!Array.isArray(raw)) return []
  const cleaned: TechDeliveryPart[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const id =
      typeof o.id === 'string' && o.id.trim()
        ? o.id.trim()
        : `tdp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const delivery_kind =
      typeof o.delivery_kind === 'string' && o.delivery_kind.trim() ? o.delivery_kind.trim() : ''
    if (!delivery_kind) continue
    cleaned.push({
      id,
      delivery_kind,
      custom_label: typeof o.custom_label === 'string' ? o.custom_label.trim() || undefined : undefined,
      technologies: typeof o.technologies === 'string' ? o.technologies.trim() || undefined : undefined,
      database: typeof o.database === 'string' ? o.database.trim() || undefined : undefined,
      architecture: typeof o.architecture === 'string' ? o.architecture.trim() || undefined : undefined,
      notes: typeof o.notes === 'string' ? o.notes.trim() || undefined : undefined,
    })
  }
  return cleaned
}

export function labelForDeliveryKind(code: string): string {
  const hit = TECH_DELIVERY_KIND_OPTIONS.find((x) => x.value === code)
  return hit?.label ?? code
}

function unwrapPossibleJsonFence(text: string): string {
  const t = text.trim()
  if (!t.includes('```')) return t
  const open = t.indexOf('```')
  let inner = t.slice(open + 3)
  const nl = inner.indexOf('\n')
  if (nl >= 0) inner = inner.slice(nl + 1)
  const close = inner.lastIndexOf('```')
  if (close >= 0) inner = inner.slice(0, close)
  return inner.trim()
}

/**
 * 从用户粘贴文本解析 `TechDeliveryPart[]`：支持裸 JSON 数组、`{ "tech_delivery_parts": [...] }`，以及 Markdown \`\`\`json 代码块。
 * 解析失败或无效条目为空时返回 `null`。
 */
export function parseTechDeliveryPartsExternalPaste(raw: string): TechDeliveryPart[] | null {
  const t = unwrapPossibleJsonFence(raw)
  if (!t) return null
  try {
    const data = JSON.parse(t) as unknown
    let arr: unknown
    if (Array.isArray(data)) arr = data
    else if (data && typeof data === 'object' && Array.isArray((data as { tech_delivery_parts?: unknown }).tech_delivery_parts)) {
      arr = (data as { tech_delivery_parts: unknown[] }).tech_delivery_parts
    } else return null
    const parts = normalizeTechDeliveryPartsFromUnknown(arr)
    return parts.length > 0 ? parts : null
  } catch {
    return null
  }
}

export function formatTechDeliveryPartsForDiff(parts: TechDeliveryPart[]): string {
  if (!parts.length) return '（当前选型表为空）'
  return parts
    .map((p, i) => {
      const kindLabel =
        p.delivery_kind === 'other' && p.custom_label?.trim()
          ? p.custom_label.trim()
          : labelForDeliveryKind(p.delivery_kind)
      const lines = [
        `【${i + 1}】${kindLabel}`,
        `· 技术栈：${p.technologies?.trim() || '（未填）'}`,
        `· 数据库：${p.database?.trim() || '（未填）'}`,
        `· 架构：${p.architecture?.trim() || '（未填）'}`,
      ]
      if (p.notes?.trim()) lines.push(`· 备注：${p.notes.trim()}`)
      return lines.join('\n')
    })
    .join('\n\n────────────\n\n')
}
