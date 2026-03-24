/**
 * 「修改」行内字词/字符级对比（供需求文档 AI diff 弹窗使用）。
 * - 较短行：diffChars，中文也可逐字对齐；
 * - 过长行：diffWordsWithSpace，避免 Myers 代价过大。
 */
import { diffChars, diffWordsWithSpace, type Change } from 'diff'

export type InlineSegMark = 'eq' | 'del' | 'add'
export type InlineSeg = { value: string; mark: InlineSegMark }

/** 字符 diff 上限：乘积过大会明显卡顿 */
const MAX_CHAR_DIFF_PRODUCT = 1_200_000
const MAX_CHAR_EACH = 2800

function mergeAdjacent(segs: InlineSeg[]): InlineSeg[] {
  const out: InlineSeg[] = []
  for (const s of segs) {
    if (s.value.length === 0) continue
    const last = out[out.length - 1]
    if (last && last.mark === s.mark) last.value += s.value
    else out.push({ value: s.value, mark: s.mark })
  }
  return out
}

function changesToSides(parts: Change[]): { left: InlineSeg[]; right: InlineSeg[] } {
  const left: InlineSeg[] = []
  const right: InlineSeg[] = []
  for (const p of parts) {
    const v = p.value
    if (v.length === 0) continue
    if (p.added) {
      right.push({ value: v, mark: 'add' })
    } else if (p.removed) {
      left.push({ value: v, mark: 'del' })
    } else {
      left.push({ value: v, mark: 'eq' })
      right.push({ value: v, mark: 'eq' })
    }
  }
  return { left: mergeAdjacent(left), right: mergeAdjacent(right) }
}

function nonEmptySides(
  a: string,
  b: string,
  left: InlineSeg[],
  right: InlineSeg[],
): { left: InlineSeg[]; right: InlineSeg[] } {
  const L = left.length ? left : a ? [{ value: a, mark: 'del' as const }] : [{ value: '\u00a0', mark: 'eq' as const }]
  const R = right.length ? right : b ? [{ value: b, mark: 'add' as const }] : [{ value: '\u00a0', mark: 'eq' as const }]
  return { left: L, right: R }
}

/**
 * 将一对「修改」行拆成左右片段列表，用于行内 <span> 着色。
 */
export function buildChangeInlineSegments(oldStr: string, newStr: string): { left: InlineSeg[]; right: InlineSeg[] } {
  const a = oldStr ?? ''
  const b = newStr ?? ''
  if (a === b) {
    return {
      left: [{ value: a || '\u00a0', mark: 'eq' }],
      right: [{ value: b || '\u00a0', mark: 'eq' }],
    }
  }

  const useChars =
    a.length <= MAX_CHAR_EACH &&
    b.length <= MAX_CHAR_EACH &&
    a.length * b.length <= MAX_CHAR_DIFF_PRODUCT

  const parts = useChars ? diffChars(a, b) : diffWordsWithSpace(a, b)
  const { left, right } = changesToSides(parts)
  return nonEmptySides(a, b, left, right)
}
