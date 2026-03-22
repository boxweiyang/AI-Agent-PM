/**
 * 与仓库根 contracts/openapi/openapi.yaml 对齐；后续随契约增量追加 handler。
 * @see https://mswjs.io/docs/
 */
import { http, HttpResponse } from 'msw'

type AiInvokeBody = {
  capability?: string
  payload?: Record<string, unknown> & { message?: string }
}

export const handlers = [
  http.get('/api/v1/health', () =>
    HttpResponse.json({
      code: 0,
      message: 'ok',
      data: { status: 'up' },
    }),
  ),

  http.post('/api/v1/ai/invoke', async ({ request }) => {
    let body: AiInvokeBody = {}
    try {
      body = (await request.json()) as AiInvokeBody
    } catch {
      /* empty body */
    }
    const capability = body.capability ?? 'echo'
    const message = (body.payload?.message as string | undefined) ?? ''
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: { echo: message, capability },
    })
  }),
]
