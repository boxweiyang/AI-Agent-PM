/**
 * REQ-M02B：技术选型 — 交付形态选项（`tech_delivery_parts[].delivery_kind`）。
 */

export type TechDeliveryKindCode =
  | 'website'
  | 'mobile_app'
  | 'desktop_exe'
  | 'mini_program'
  | 'api_service'
  | 'ops_tool'
  | 'other'

export const TECH_DELIVERY_KIND_OPTIONS: { value: TechDeliveryKindCode; label: string }[] = [
  { value: 'website', label: '网站 / Web' },
  { value: 'mobile_app', label: '移动 App' },
  { value: 'desktop_exe', label: '桌面 / 客户端（exe 等）' },
  { value: 'mini_program', label: '小程序' },
  { value: 'api_service', label: '后端 API / 服务' },
  { value: 'ops_tool', label: '运维 / 脚本 / 工具' },
  { value: 'other', label: '其它（自填名称）' },
]
