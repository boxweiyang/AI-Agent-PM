/**
 * 项目内左侧菜单分组（进入 `ProjectLayout` 后展示）。
 * 子项路由名与 `projectLayoutRoutes.ts` / `projectRelatedModules.ts` 一致。
 */
import type { Component } from 'vue'
import { DataLine, Document } from '@element-plus/icons-vue'

import { iconForProjectModuleRoute } from '@/config/projectModuleMenuIcons'
import { PROJECT_RELATED_MODULES } from '@/config/projectRelatedModules'

export type ProjectSidebarItem = {
  title: string
  icon: Component
  routeName: string
}

export type ProjectSidebarGroup = {
  id: string
  title: string
  items: ProjectSidebarItem[]
}

function modItems(pred: (path: string) => boolean): ProjectSidebarItem[] {
  return PROJECT_RELATED_MODULES.filter((m) => pred(m.path)).map((m) => ({
    title: m.label,
    icon: iconForProjectModuleRoute(m.name),
    routeName: m.name,
  }))
}

export const PROJECT_SIDEBAR_GROUPS: ProjectSidebarGroup[] = [
  {
    id: 'overview',
    title: '概览',
    items: [
      { title: 'Dashboard', icon: DataLine, routeName: 'project-dashboard' },
      { title: '项目详情', icon: Document, routeName: 'project-detail' },
    ],
  },
  {
    id: 'req',
    title: '需求与设计',
    items: modItems((p) => /^(m02\/|m02b|m02c|m02d)/.test(p)),
  },
  {
    id: 'delivery',
    title: '迭代与交付',
    items: modItems((p) => /^(m03|m04|m05)\//.test(p)),
  },
  {
    id: 'quality',
    title: '变更与质量',
    items: modItems((p) => /^(m06|m07)\//.test(p)),
  },
  {
    id: 'insight',
    title: '度量与收尾',
    items: modItems((p) => /^(m08|m10)\//.test(p)),
  },
  {
    id: 'ai',
    title: 'AI',
    items: modItems((p) => /^m11\//.test(p)),
  },
]
