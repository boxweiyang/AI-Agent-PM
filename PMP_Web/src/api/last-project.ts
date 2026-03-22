/** 侧栏「项目详情」与创建后跳转：记住最近访问的项目 id（会话级） */
const STORAGE_KEY = 'pmp_last_project_id'

export function setLastProjectId(id: string): void {
  sessionStorage.setItem(STORAGE_KEY, id)
}

export function getLastProjectId(): string | null {
  return sessionStorage.getItem(STORAGE_KEY)
}
