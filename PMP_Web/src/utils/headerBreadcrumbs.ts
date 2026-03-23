import type { RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router'

/** 顶栏状态路径：末项为当前页（无 `to`），前项可点击返回对应路由 */
export type HeaderBreadcrumbItem = {
  label: string
  to?: RouteLocationRaw
}

function projectDisplayFallback(projectId: string, nameTrim: string): string {
  const n = nameTrim.trim()
  if (n) return n
  return `项目 ${projectId}`
}

function buildProjectItems(
  route: RouteLocationNormalizedLoaded,
  projectId: string,
  projectDisplayNameTrim: string,
): HeaderBreadcrumbItem[] {
  const label = projectDisplayFallback(projectId, projectDisplayNameTrim)
  const items: HeaderBreadcrumbItem[] = [
    { label: '工作台', to: { name: 'workspace-home' } },
    { label: '项目管理', to: { name: 'workspace-projects' } },
    { label, to: { name: 'project-dashboard', params: { projectId } } },
  ]

  const rname = route.name
  if (rname === 'project-dashboard') {
    items.push({ label: '项目 Dashboard', to: undefined })
    return items
  }
  if (rname === 'project-detail') {
    items.push({ label: '项目详情', to: undefined })
    return items
  }

  const t = route.meta.title
  items.push({
    label: typeof t === 'string' && t.length > 0 ? t : '模块',
    to: undefined,
  })
  return items
}

function buildWorkbenchItems(route: RouteLocationNormalizedLoaded): HeaderBreadcrumbItem[] {
  const name = route.name

  if (name === 'workspace-home') {
    return [{ label: '工作台', to: undefined }]
  }

  const root: HeaderBreadcrumbItem = { label: '工作台', to: { name: 'workspace-home' } }

  if (name === 'workspace-projects') {
    return [root, { label: '项目管理', to: undefined }]
  }

  if (name === 'enter-last-project') {
    return [root, { label: '进入最近项目', to: undefined }]
  }

  if (name === 'settings-ai') {
    return [root, { label: '设置', to: undefined }, { label: 'AI 设置', to: undefined }]
  }
  if (name === 'settings-profile') {
    return [root, { label: '设置', to: undefined }, { label: '个人设置', to: undefined }]
  }
  if (name === 'settings-system') {
    return [root, { label: '设置', to: undefined }, { label: '系统设置', to: undefined }]
  }

  const title = typeof route.meta.title === 'string' ? route.meta.title : '页面'
  return [root, { label: title, to: undefined }]
}

/**
 * 根据当前路由生成顶栏完整路径（工作台 / 项目内）。
 * @param projectDisplayName 项目内来自 `GET /projects/:id` 的名称；未加载时传空由兜底文案代替
 */
export function buildHeaderBreadcrumbs(
  route: RouteLocationNormalizedLoaded,
  projectDisplayName: string,
): HeaderBreadcrumbItem[] {
  const pid = route.params.projectId
  if (typeof pid === 'string' && pid.length > 0) {
    return buildProjectItems(route, pid, projectDisplayName)
  }
  return buildWorkbenchItems(route)
}
