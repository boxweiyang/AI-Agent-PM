export type DbDialect = 'sqlite' | 'sqlserver' | 'mysql'

export type DbCatalogField = {
  id: string
  name: string
  logical_type: string
  length?: number | null
  description: string
  nullable: boolean
  default_value?: string | null
  primary_key: boolean
  auto_increment: boolean
  unique: boolean
  foreign_key_ref?: string | null
}

export type DbCatalogTable = {
  id: string
  logical_name: string
  physical_name: string
  description: string
  primary_key_notes: string
  fields: DbCatalogField[]
  updated_at: string
}

type DbCatalogProjectState = {
  dialect: DbDialect | null
  tables: DbCatalogTable[]
  latest_alter_by_table_id: Record<string, string>
}

const byProject = new Map<string, DbCatalogProjectState>()

function nowIso() {
  return new Date().toISOString()
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function state(projectId: string): DbCatalogProjectState {
  if (!byProject.has(projectId)) {
    const userTable: DbCatalogTable = {
      id: 'tbl-users',
      logical_name: '用户',
      physical_name: 'pmp_user',
      description: '系统用户与权限相关基础表（Mock）',
      primary_key_notes: 'id 为主键',
      fields: [
        {
          id: 'col-id',
          name: 'id',
          logical_type: 'string',
          length: null,
          description: '主键',
          nullable: false,
          default_value: null,
          primary_key: true,
          auto_increment: false,
          unique: true,
          foreign_key_ref: null,
        },
        {
          id: 'col-username',
          name: 'username',
          logical_type: 'string',
          length: 64,
          description: '登录名',
          nullable: false,
          default_value: null,
          primary_key: false,
          auto_increment: false,
          unique: true,
          foreign_key_ref: null,
        },
        {
          id: 'col-created',
          name: 'created_at',
          logical_type: 'datetime',
          length: null,
          description: '创建时间',
          nullable: false,
          default_value: 'now()',
          primary_key: false,
          auto_increment: false,
          unique: false,
          foreign_key_ref: null,
        },
      ],
      updated_at: nowIso(),
    }

    byProject.set(projectId, {
      dialect: null,
      tables: [userTable],
      latest_alter_by_table_id: {},
    })
  }
  return byProject.get(projectId)!
}

export function getDbCatalogConfig(projectId: string) {
  const s = state(projectId)
  return { dialect: s.dialect }
}

export function patchDbCatalogConfig(projectId: string, body: { dialect?: DbDialect | null }) {
  const s = state(projectId)
  const d = body.dialect ?? null
  s.dialect = d
  return { dialect: s.dialect }
}

export function listDbCatalogTables(projectId: string) {
  const s = state(projectId)
  return { items: s.tables }
}

export function getDbCatalogTable(projectId: string, tableId: string) {
  const s = state(projectId)
  return s.tables.find((t) => t.id === tableId) ?? null
}

export function createDbCatalogTable(projectId: string, body: Partial<DbCatalogTable>) {
  const s = state(projectId)
  const row: DbCatalogTable = {
    id: nextId('tbl'),
    logical_name: String(body.logical_name ?? '').trim() || '未命名表',
    physical_name: String(body.physical_name ?? '').trim() || `table_${s.tables.length + 1}`,
    description: String(body.description ?? ''),
    primary_key_notes: String(body.primary_key_notes ?? ''),
    fields: Array.isArray(body.fields) ? (body.fields as DbCatalogField[]) : [],
    updated_at: nowIso(),
  }
  s.tables.push(row)
  return row
}

function buildLatestAlterSql(dialect: DbDialect | null, table: DbCatalogTable) {
  const header = `-- latest alter (mock)\n-- dialect=${dialect ?? 'unknown'}\n-- table=${table.physical_name}\n`
  return (
    header +
    `-- 说明：V1 mock 先返回“等价迁移”提示，后端实现阶段可替换为精确 ALTER。\n` +
    `-- 建议策略：对比旧结构与新结构，生成 ALTER TABLE / 重建表脚本。\n`
  )
}

export function patchDbCatalogTable(projectId: string, tableId: string, body: Partial<DbCatalogTable>) {
  const s = state(projectId)
  const idx = s.tables.findIndex((t) => t.id === tableId)
  if (idx < 0) return { ok: false as const, message: '表不存在', data: null as never }
  const prev = s.tables[idx]
  const next: DbCatalogTable = {
    ...prev,
    logical_name: body.logical_name !== undefined ? String(body.logical_name) : prev.logical_name,
    physical_name: body.physical_name !== undefined ? String(body.physical_name) : prev.physical_name,
    description: body.description !== undefined ? String(body.description) : prev.description,
    primary_key_notes: body.primary_key_notes !== undefined ? String(body.primary_key_notes) : prev.primary_key_notes,
    fields: Array.isArray(body.fields) ? (body.fields as DbCatalogField[]) : prev.fields,
    updated_at: nowIso(),
  }
  s.tables[idx] = next
  const sql = buildLatestAlterSql(s.dialect, next)
  s.latest_alter_by_table_id[tableId] = sql
  return {
    ok: true as const,
    data: {
      table: next,
      latest_alter: { table_id: tableId, sql },
    },
  }
}

export function deleteDbCatalogTable(projectId: string, tableId: string) {
  const s = state(projectId)
  const before = s.tables.length
  s.tables = s.tables.filter((t) => t.id !== tableId)
  delete s.latest_alter_by_table_id[tableId]
  return before !== s.tables.length
}

export function getDbCatalogTableLatestAlter(projectId: string, tableId: string) {
  const s = state(projectId)
  const sql = s.latest_alter_by_table_id[tableId] ?? ''
  return { table_id: tableId, sql }
}

function dialectType(dialect: DbDialect, f: DbCatalogField) {
  // 仅用于 mock DDL 预览；真实映射表在后端实现阶段维护
  const t = f.logical_type.toLowerCase()
  if (dialect === 'sqlite') {
    if (t.includes('int')) return 'INTEGER'
    if (t.includes('bool')) return 'INTEGER'
    if (t.includes('date') || t.includes('time')) return 'TEXT'
    return 'TEXT'
  }
  if (dialect === 'mysql') {
    if (t.includes('int')) return 'BIGINT'
    if (t.includes('bool')) return 'TINYINT(1)'
    if (t.includes('date') || t.includes('time')) return 'DATETIME'
    const len = f.length && f.length > 0 ? f.length : 255
    return `VARCHAR(${len})`
  }
  // sqlserver
  if (t.includes('int')) return 'BIGINT'
  if (t.includes('bool')) return 'BIT'
  if (t.includes('date') || t.includes('time')) return 'DATETIME2'
  const len = f.length && f.length > 0 ? f.length : 255
  return `NVARCHAR(${len})`
}

export function generateDbCatalogDdl(projectId: string, body: { dialect: DbDialect; scope: 'all' | 'table'; table_id?: string | null; include_database?: boolean; include_mock_data?: boolean }) {
  const s = state(projectId)
  const dialect = body.dialect
  const includeDb = body.include_database !== false
  const includeMockData = body.include_mock_data === true
  const tables =
    body.scope === 'table' && body.table_id ? s.tables.filter((t) => t.id === body.table_id) : s.tables

  const chunks: string[] = []
  chunks.push(`-- PMP 数据库结构脚本（Mock）`)
  chunks.push(`-- dialect=${dialect}`)
  chunks.push(`-- generated_at=${nowIso()}`)
  chunks.push('')

  if (includeDb) {
    if (dialect === 'sqlite') {
      chunks.push(`-- SQLite 无需 CREATE DATABASE；请在数据库工具中选择/创建文件库后执行以下建表语句。`)
    } else if (dialect === 'mysql') {
      chunks.push(`CREATE DATABASE IF NOT EXISTS pmp DEFAULT CHARACTER SET utf8mb4;`)
      chunks.push(`USE pmp;`)
    } else {
      chunks.push(`IF DB_ID('pmp') IS NULL CREATE DATABASE pmp;`)
      chunks.push(`GO`)
      chunks.push(`USE pmp;`)
      chunks.push(`GO`)
    }
    chunks.push('')
  }

  tables.forEach((t) => {
    chunks.push(`-- ${t.logical_name} (${t.physical_name})`)
    const cols = t.fields.map((f) => {
      const colType = dialectType(dialect, f)
      const nullSql = f.nullable ? 'NULL' : 'NOT NULL'
      const defSql = f.default_value ? ` DEFAULT ${f.default_value}` : ''
      const autoSql =
        f.auto_increment && dialect !== 'sqlite'
          ? dialect === 'mysql'
            ? ' AUTO_INCREMENT'
            : ' IDENTITY(1,1)'
          : ''
      return `  ${f.name} ${colType}${autoSql} ${nullSql}${defSql}`
    })
    const pk = t.fields.filter((f) => f.primary_key).map((f) => f.name)
    if (pk.length) cols.push(`  PRIMARY KEY (${pk.join(', ')})`)
    chunks.push(`CREATE TABLE ${t.physical_name} (\n${cols.join(',\n')}\n);`)
    chunks.push('')

    if (includeMockData) {
      const insertCols = t.fields.filter((f) => !f.primary_key && !f.auto_increment)
      if (!insertCols.length) {
        // 主键自增且无非主键列：跳过
        chunks.push(`-- mock data for ${t.physical_name} (skipped: no insertable columns)`)
        chunks.push('')
        return
      }

      const nowExpr =
        dialect === 'mysql' ? 'NOW()' : dialect === 'sqlserver' ? 'GETDATE()' : 'CURRENT_TIMESTAMP'

      const sqlValueForField = (f: DbCatalogField): string => {
        const lt = (f.logical_type || '').toLowerCase()
        if (f.default_value && typeof f.default_value === 'string' && f.default_value.trim()) {
          const dv = f.default_value.trim()
          // 允许把 now() 这类表达式原样用作值（而不是字符串）
          if (/[a-zA-Z_]+\s*\(.*\)\s*$/.test(dv) || dv === 'now()') return dv.replace(/^now\(\)$/i, nowExpr)
        }

        if (lt.includes('int') || lt.includes('number') || lt.includes('bigint') || lt.includes('float') || lt.includes('decimal')) return '1'
        if (lt.includes('bool')) return dialect === 'sqlite' ? '1' : '1'
        if (lt.includes('date') || lt.includes('time') || lt.includes('datetime')) return nowExpr

        // 字符串/兜底
        return dialect === 'sqlserver' ? `N'mock'` : `'mock'`
      }

      const colsSql = insertCols.map((f) => f.name).join(', ')
      const valuesSql = insertCols.map((f) => sqlValueForField(f)).join(', ')

      chunks.push(`-- mock data for ${t.physical_name}`)
      chunks.push(`INSERT INTO ${t.physical_name}(${colsSql}) VALUES (${valuesSql});`)
      chunks.push('')
    }
  })

  return { dialect, sql: chunks.join('\n') }
}

export function aiGenerateDbCatalogSchemaDraft(projectId: string, dialect: DbDialect) {
  const s = state(projectId)
  // Mock：直接返回两张“建议表”，让前端做合并/冲突处理
  const tables: DbCatalogTable[] = [
    {
      id: nextId('tbl'),
      logical_name: '项目',
      physical_name: 'pmp_project',
      description: '项目主数据（来自需求文档 + 技术文档推断，Mock）',
      primary_key_notes: 'id 为主键',
      fields: [
        { id: nextId('col'), name: 'id', logical_type: 'string', length: null, description: '主键', nullable: false, default_value: null, primary_key: true, auto_increment: false, unique: true, foreign_key_ref: null },
        { id: nextId('col'), name: 'name', logical_type: 'string', length: 128, description: '项目名称', nullable: false, default_value: null, primary_key: false, auto_increment: false, unique: false, foreign_key_ref: null },
        { id: nextId('col'), name: 'updated_at', logical_type: 'datetime', length: null, description: '更新时间', nullable: false, default_value: 'now()', primary_key: false, auto_increment: false, unique: false, foreign_key_ref: null },
      ],
      updated_at: nowIso(),
    },
    {
      id: nextId('tbl'),
      logical_name: '任务',
      physical_name: 'pmp_task',
      description: 'Task 与执行（来自需求文档 + 技术文档推断，Mock）',
      primary_key_notes: 'id 为主键；story_id 为外键（可选）',
      fields: [
        { id: nextId('col'), name: 'id', logical_type: 'string', length: null, description: '主键', nullable: false, default_value: null, primary_key: true, auto_increment: false, unique: true, foreign_key_ref: null },
        { id: nextId('col'), name: 'project_id', logical_type: 'string', length: null, description: '所属项目', nullable: false, default_value: null, primary_key: false, auto_increment: false, unique: false, foreign_key_ref: 'pmp_project.id' },
        { id: nextId('col'), name: 'title', logical_type: 'string', length: 200, description: '标题', nullable: false, default_value: null, primary_key: false, auto_increment: false, unique: false, foreign_key_ref: null },
        { id: nextId('col'), name: 'status', logical_type: 'string', length: 32, description: '状态', nullable: false, default_value: `'todo'`, primary_key: false, auto_increment: false, unique: false, foreign_key_ref: null },
      ],
      updated_at: nowIso(),
    },
  ]

  // 如果当前项目已选过方言，尊重配置；否则以请求方言为准（方便前端直接设置）
  if (!s.dialect) s.dialect = dialect

  return { tables }
}

export function generateDbCatalogDesignDoc(projectId: string, dialect: DbDialect, includeDdlSnippets: boolean) {
  const s = state(projectId)
  const tables = s.tables
  const lines: string[] = []
  lines.push(`# 数据库设计文档（Mock）`)
  lines.push('')
  lines.push(`- 方言：${dialect}`)
  lines.push(`- 生成时间：${nowIso()}`)
  lines.push('')
  tables.forEach((t) => {
    lines.push(`## ${t.logical_name}（${t.physical_name}）`)
    if (t.description.trim()) lines.push(t.description.trim())
    lines.push('')
    lines.push(`| 字段 | 类型（逻辑） | 可空 | 主键 | 自增 | 唯一 | 外键 | 说明 |`)
    lines.push(`|---|---|---|---|---|---|---|---|`)
    t.fields.forEach((f) => {
      lines.push(
        `| ${f.name} | ${f.logical_type}${f.length ? `(${f.length})` : ''} | ${f.nullable ? '是' : '否'} | ${f.primary_key ? '是' : '否'} | ${f.auto_increment ? '是' : '否'} | ${f.unique ? '是' : '否'} | ${f.foreign_key_ref || ''} | ${f.description || ''} |`,
      )
    })
    lines.push('')
    if (includeDdlSnippets) {
      const ddl = generateDbCatalogDdl(projectId, { dialect, scope: 'table', table_id: t.id, include_database: false, include_mock_data: false })
      lines.push(`### DDL（片段）`)
      lines.push('')
      lines.push('```sql')
      lines.push(ddl.sql.trim())
      lines.push('```')
      lines.push('')
    }
  })
  return { markdown: lines.join('\n') }
}

