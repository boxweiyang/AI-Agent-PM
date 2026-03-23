import { marked } from 'marked'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function markdownToHtmlFragment(md: string): string {
  return marked.parse(md, { async: false }) as string
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportRequirementMarkdown(filenameBase: string, markdown: string) {
  const safe = filenameBase.replace(/[/\\?%*:|"<>]/g, '-')
  downloadTextFile(`${safe}.md`, markdown, 'text/markdown')
}

export function exportRequirementHtml(filenameBase: string, title: string, markdown: string) {
  const inner = markdownToHtmlFragment(markdown)
  const doc = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 920px; margin: 24px auto; padding: 0 16px; line-height: 1.6; color: #1a1a1a; }
    pre, code { font-family: ui-monospace, monospace; font-size: 0.92em; }
    pre { overflow: auto; padding: 12px; background: #f5f5f5; border-radius: 8px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  </style>
</head>
<body>
<article>
${inner}
</article>
</body>
</html>`
  const safe = filenameBase.replace(/[/\\?%*:|"<>]/g, '-')
  downloadTextFile(`${safe}.html`, doc, 'text/html')
}

/**
 * 打开新窗口展示排版后的 HTML，由用户在本机「打印 → 存储为 PDF」。
 * 避免引入 pdf 生成库，与需求「导出 PDF」在浏览器侧对齐。
 */
export function printMarkdownAsPdf(title: string, markdown: string): boolean {
  const inner = markdownToHtmlFragment(markdown)
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 920px; margin: 24px auto; padding: 0 16px; line-height: 1.6; color: #1a1a1a; }
    pre, code { font-family: ui-monospace, monospace; font-size: 0.92em; }
    pre { overflow: auto; padding: 12px; background: #f5f5f5; border-radius: 8px; }
    @media print { body { margin: 0; max-width: none; } }
  </style>
</head>
<body>
<h1 style="font-size:1.25rem;margin-bottom:1rem">${escapeHtml(title)}</h1>
<article>${inner}</article>
</body>
</html>`)
  w.document.close()
  w.focus()
  setTimeout(() => {
    w.print()
  }, 250)
  return true
}
