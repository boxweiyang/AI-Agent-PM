# `src/components/` 约定

## 一组件一文件夹

每个业务级组件使用**独立子目录**，目录名与组件主名一致（PascalCase），内含：

| 文件 | 说明 |
|------|------|
| **`<Name>.vue`** | 组件本体 |
| **`index.ts`** | `export { default } from './<Name>.vue'`，便于 `import X from '@/components/X'` |
| **`README.md`** | 该组件的用途、Props、Emits、示例；**仅父组件使用的子组件**可只在父目录 README 中说明 |

**仅属于某一父组件**的子组件（不单独对外复用）放在**父组件目录内**；若后续会多处复用，应提升为顶层文件夹（例如公用 **`DiffDialog`**，由 `AiAssistDrawer` 与其它页面共用）。

## 占位目录

- **`base/`**、**`business/`**：预留给分类组件，当前可为空或 `.gitkeep`。

## 引入方式

优先使用目录导入（解析到 `index.ts`）：

```ts
import AppHeaderBar from '@/components/AppHeaderBar'
import AiAssistDrawer from '@/components/AiAssistDrawer'
import DiffDialog from '@/components/DiffDialog'
```

避免写 `*.vue` 全路径（除非有特殊需求）。

## 修订记录

| 日期 | 摘要 |
|------|------|
| 2026-03-24 | 初版：目录约定与 `index.ts` 说明。 |
