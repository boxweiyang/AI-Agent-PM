/**
 * 项目侧栏各模块菜单图标（按路由 `name` 与业务语义匹配 Element Plus 图标）。
 */
import type { Component } from 'vue'
import {
  Calendar,
  CircleCheck,
  Connection,
  Cpu,
  DataAnalysis,
  FolderChecked,
  FolderOpened,
  Grid,
  MagicStick,
  Reading,
  Switch,
  Tickets,
  UserFilled,
} from '@element-plus/icons-vue'

export const PROJECT_MODULE_MENU_ICONS: Record<string, Component> = {
  'project-m02-requirements': Reading,
  'project-m02b-design': Cpu,
  'project-m02c-apis': Connection,
  'project-m02d-schema': Grid,
  'project-m03-iterations': Calendar,
  'project-m04-tasks': Tickets,
  'project-m05-resources': UserFilled,
  'project-m06-changes': Switch,
  'project-m07-quality': CircleCheck,
  'project-m08-dashboard': DataAnalysis,
  'project-m10-closure': FolderChecked,
  'project-m11-ai': MagicStick,
}

export function iconForProjectModuleRoute(routeName: string): Component {
  return PROJECT_MODULE_MENU_ICONS[routeName] ?? FolderOpened
}
