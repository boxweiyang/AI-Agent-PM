/**
 * 立项「技术栈」四类预设选项（项目详情多选下拉）。
 * 存库仍为字符串：见 `joinStackItems` / `parseStackItems`（与 OpenAPI `stack_*` 字段一致）。
 */
export const TECH_STACK_PRESETS = {
  frontend: [
    'Vue 3',
    'React 18',
    'Angular',
    'TypeScript',
    'JavaScript',
    'Element Plus',
    'Ant Design',
    'Vite',
    'Webpack',
    'UniApp',
    '微信小程序',
  ],
  backend: [
    'Python',
    'FastAPI',
    'Django',
    'Java',
    'Spring Boot',
    'Go',
    'Node.js',
    'NestJS',
    '.NET',
    'Rust',
  ],
  database: [
    'PostgreSQL',
    'MySQL',
    'MariaDB',
    'SQL Server',
    'Oracle',
    'MongoDB',
    'Redis',
    'Elasticsearch',
    'ClickHouse',
    'TiDB',
  ],
  middleware: [
    'Redis',
    'Kafka',
    'RabbitMQ',
    'RocketMQ',
    'Nginx',
    'Kubernetes',
    'Docker',
    'Elasticsearch',
    'MinIO',
    'Apollo',
    'Nacos',
  ],
} as const

/** 将 API 返回的字符串拆成多选模型（兼容顿号、中英文逗号、换行） */
export function parseStackItems(raw?: string): string[] {
  const t = raw?.trim()
  if (!t) return []
  const parts = t
    .split(/[,，、\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length > 0) return parts
  return [t]
}

/** 提交 PATCH 时拼回字符串（统一顿号，便于只读区展示） */
export function joinStackItems(items: string[]): string {
  return items.map((s) => s.trim()).filter(Boolean).join('、')
}
