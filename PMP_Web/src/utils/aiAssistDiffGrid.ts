/**
 * 公用 **`DiffDialog`** 行级 diff 网格数据（与 {@link buildChangeInlineSegments} 配合）。
 * 亦被 AI 辅助等任意「双稿对比」场景使用。
 */
import { buildChangeInlineSegments, type InlineSeg } from '@/utils/inlineTextDiff'

export type DiffRowVariant = 'equal' | 'del' | 'add' | 'change'

export type DiffGridRow = {
  variant: DiffRowVariant
  oldNum: number | null
  newNum: number | null
  left: string
  right: string
  leftTone: 'eq' | 'del' | 'pad' | 'chgL'
  rightTone: 'eq' | 'add' | 'pad' | 'chgR'
  inlineLeft?: InlineSeg[]
  inlineRight?: InlineSeg[]
}

type LineOpKind = 'equal' | 'del' | 'add'
type LineOp = { kind: LineOpKind; line: string }
type RefinedKind = 'equal' | 'change' | 'del' | 'add'

const DIFF_LCS_MAX_CELLS = 520 * 520

function lineDiffLCS(oldLines: string[], newLines: string[]): { ops: LineOp[]; truncated: boolean } {
  const m = oldLines.length
  const n = newLines.length
  if (m === 0 && n === 0) return { ops: [], truncated: false }
  if (m * n > DIFF_LCS_MAX_CELLS) {
    const ops: LineOp[] = []
    for (const line of oldLines) ops.push({ kind: 'del', line })
    for (const line of newLines) ops.push({ kind: 'add', line })
    return { ops, truncated: true }
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] =
        oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const ops: LineOp[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ kind: 'equal', line: oldLines[i] })
      i += 1
      j += 1
      continue
    }
    if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ kind: 'del', line: oldLines[i] })
      i += 1
    } else {
      ops.push({ kind: 'add', line: newLines[j] })
      j += 1
    }
  }
  while (i < m) {
    ops.push({ kind: 'del', line: oldLines[i] })
    i += 1
  }
  while (j < n) {
    ops.push({ kind: 'add', line: newLines[j] })
    j += 1
  }
  return { ops, truncated: false }
}

function refineLineOpsToPairs(ops: LineOp[]): Array<{ kind: RefinedKind; left: string; right: string }> {
  const out: Array<{ kind: RefinedKind; left: string; right: string }> = []
  let idx = 0
  while (idx < ops.length) {
    const op = ops[idx]
    if (op.kind === 'equal') {
      out.push({ kind: 'equal', left: op.line, right: op.line })
      idx += 1
      continue
    }
    if (op.kind === 'del') {
      const dels: string[] = []
      while (idx < ops.length && ops[idx].kind === 'del') {
        dels.push(ops[idx].line)
        idx += 1
      }
      const adds: string[] = []
      while (idx < ops.length && ops[idx].kind === 'add') {
        adds.push(ops[idx].line)
        idx += 1
      }
      const maxLen = Math.max(dels.length, adds.length)
      for (let k = 0; k < maxLen; k += 1) {
        const d = dels[k]
        const a = adds[k]
        if (d !== undefined && a !== undefined) {
          out.push({ kind: 'change', left: d, right: a })
        } else if (d !== undefined) {
          out.push({ kind: 'del', left: d, right: '' })
        } else if (a !== undefined) {
          out.push({ kind: 'add', left: '', right: a })
        }
      }
      continue
    }
    const adds: string[] = []
    while (idx < ops.length && ops[idx].kind === 'add') {
      adds.push(ops[idx].line)
      idx += 1
    }
    for (const a of adds) {
      out.push({ kind: 'add', left: '', right: a })
    }
  }
  return out
}

function emptyCell(s: string): string {
  return s.length ? s : '\u00a0'
}

export function buildDiffGridRows(oldText: string, newText: string): { rows: DiffGridRow[]; truncated: boolean } {
  const oldLines = (oldText ?? '').split('\n')
  const newLines = (newText ?? '').split('\n')
  const { ops, truncated } = lineDiffLCS(oldLines, newLines)
  const pairs = refineLineOpsToPairs(ops)
  const rows: DiffGridRow[] = []
  let oldNum = 1
  let newNum = 1
  for (const p of pairs) {
    if (p.kind === 'equal') {
      rows.push({
        variant: 'equal',
        oldNum,
        newNum,
        left: p.left,
        right: p.right,
        leftTone: 'eq',
        rightTone: 'eq',
      })
      oldNum += 1
      newNum += 1
    } else if (p.kind === 'change') {
      const { left: inlineLeft, right: inlineRight } = buildChangeInlineSegments(p.left, p.right)
      rows.push({
        variant: 'change',
        oldNum,
        newNum,
        left: p.left,
        right: p.right,
        leftTone: 'chgL',
        rightTone: 'chgR',
        inlineLeft,
        inlineRight,
      })
      oldNum += 1
      newNum += 1
    } else if (p.kind === 'del') {
      rows.push({
        variant: 'del',
        oldNum,
        newNum: null,
        left: p.left,
        right: emptyCell(p.right),
        leftTone: 'del',
        rightTone: 'pad',
      })
      oldNum += 1
    } else {
      rows.push({
        variant: 'add',
        oldNum: null,
        newNum,
        left: emptyCell(p.left),
        right: p.right,
        leftTone: 'pad',
        rightTone: 'add',
      })
      newNum += 1
    }
  }
  return { rows, truncated }
}

export function diffPrefixLeft(row: DiffGridRow): string {
  if (row.leftTone === 'del' || row.leftTone === 'chgL') return '-'
  return ' '
}

export function diffPrefixRight(row: DiffGridRow): string {
  if (row.rightTone === 'add' || row.rightTone === 'chgR') return '+'
  return ' '
}
