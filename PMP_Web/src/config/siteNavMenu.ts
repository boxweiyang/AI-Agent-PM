/**
 * 站级侧栏菜单（REQ-M09 §3.2 + REQ-MASTER 模块索引）
 * - 与路由同步的项使用真实 path；未实现页使用占位 index（disabled，不注册路由）。
 * - 维护：新增路由或模块时同步更新本文件与 `docs/FEATURES.md`。
 */
import type { Component } from 'vue'
import {
  Calendar,
  Connection,
  DataLine,
  Document,
  FolderOpened,
  MagicStick,
  Odometer,
  Setting,
} from '@element-plus/icons-vue'

export type SiteNavLeaf = {
  title: string
  /** 路由 path 或唯一占位串（须全局唯一，供 el-menu index） */
  index: string
  disabled?: boolean
  /** 为 true 时仅系统管理员可见 */
  adminOnly?: boolean
}

export type SiteNavGroup = {
  id: string
  title: string
  icon: Component
  children: SiteNavLeaf[]
}

const PLACEHOLDER = (slug: string) => `__dev__/${slug}`

export const siteNavGroups: SiteNavGroup[] = [
  {
    id: 'nav-workbench',
    title: '工作台',
    icon: Odometer,
    children: [{ title: '首页', index: '/' }],
  },
  {
    id: 'nav-project',
    title: '项目与立项',
    icon: FolderOpened,
    children: [
      { title: '项目列表', index: '/projects' },
      /** 进入「最近访问」的项目详情；无记录时由页面引导去列表或新建（REQ-M09/M01） */
      { title: '项目详情', index: '/projects/last' },
    ],
  },
  {
    id: 'nav-req-design',
    title: '需求与设计',
    icon: Document,
    children: [
      { title: '需求与文档', index: PLACEHOLDER('m02/req'), disabled: true },
      { title: '技术设计', index: PLACEHOLDER('m02b/design'), disabled: true },
      { title: '接口管理', index: PLACEHOLDER('m02c/api'), disabled: true },
      { title: '数据库结构', index: PLACEHOLDER('m02d/db'), disabled: true },
    ],
  },
  {
    id: 'nav-iteration',
    title: '迭代与资源',
    icon: Calendar,
    children: [
      { title: '迭代与 Story', index: PLACEHOLDER('m03/iteration'), disabled: true },
      { title: 'Task 与执行', index: PLACEHOLDER('m04/tasks'), disabled: true },
      { title: '人力池与预订', index: PLACEHOLDER('m05/resource'), disabled: true },
    ],
  },
  {
    id: 'nav-change-test',
    title: '变更与测试',
    icon: Connection,
    children: [
      { title: '变更请求 CR', index: PLACEHOLDER('m06/cr'), disabled: true },
      { title: '测试与协同', index: PLACEHOLDER('m07/qe'), disabled: true },
    ],
  },
  {
    id: 'nav-insight',
    title: '度量与收尾',
    icon: DataLine,
    children: [
      { title: '项目 Dashboard', index: PLACEHOLDER('m08/dashboard'), disabled: true },
      { title: '收尾与知识', index: PLACEHOLDER('m10/closure'), disabled: true },
    ],
  },
  {
    id: 'nav-ai',
    title: 'AI 助手',
    icon: MagicStick,
    children: [{ title: 'AI 中心', index: PLACEHOLDER('m11/ai'), disabled: true }],
  },
  {
    id: 'nav-settings',
    title: '设置',
    icon: Setting,
    children: [
      { title: '个人设置', index: PLACEHOLDER('profile'), disabled: true },
      { title: '系统设置', index: PLACEHOLDER('system'), disabled: true, adminOnly: true },
    ],
  },
]

export function filterSiteNavGroups(isSystemAdmin: boolean): SiteNavGroup[] {
  return siteNavGroups
    .map((g) => ({
      ...g,
      children: g.children.filter((c) => !c.adminOnly || isSystemAdmin),
    }))
    .filter((g) => g.children.length > 0)
}

export function siteNavSubgroupIds(groups: SiteNavGroup[]): string[] {
  return groups.map((g) => g.id)
}
