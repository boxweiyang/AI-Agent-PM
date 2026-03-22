/**
 * 权限与导航（占位 + 说明）
 *
 * **产品**：REQ-M09（路由 meta、菜单过滤）、TECH-004（`permission_codes`、系统管理员短路）。
 *
 * **当前阶段**：Mock 固定管理员，菜单在 `MainLayout.vue` 内联渲染。
 * **后续**：在此集中定义 `NavItem[]`、根据 `useAuthStore().user` 过滤可见项，
 * 并与后端返回的 `permission_codes` 对齐（禁止仅依赖前端隐藏，后端仍需鉴权）。
 */

/** 示例：稳定权限编码（与 TECH-004 字符串约定一致，供后续菜单/按钮复用） */
export const PermissionCodes = {
  projectCreate: 'project.create',
  documentRead: 'document.read',
  documentWrite: 'document.write',
} as const
