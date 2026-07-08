// @vitest-environment node
import {
  buildDeepSeekPayload,
  drainDeepSeekSseBuffer,
  parseDeepSeekData,
} from './deepseekAdapter'

describe('DeepSeek adapter', () => {
  it('builds a streaming chat completion payload with system and user messages', () => {
    const payload = buildDeepSeekPayload({
      prompt: {
        system: 'You are a strict reviewer.',
        user: 'Question and transcript go here.',
      },
      model: 'deepseek-v4-flash',
      temperature: 0.3,
      maxTokens: 900,
    })

    expect(payload.model).toBe('deepseek-v4-flash')
    expect(payload.stream).toBe(true)
    expect(payload.stream_options.include_usage).toBe(true)
    expect(payload.thinking.type).toBe('disabled')
    expect(payload.messages).toEqual([
      { role: 'system', content: 'You are a strict reviewer.' },
      { role: 'user', content: 'Question and transcript go here.' },
    ])
  })

  it('parses DeepSeek text chunks and usage chunks from SSE data', () => {
    const chunk = parseDeepSeekData(
      JSON.stringify({
        choices: [{ delta: { content: 'Hello table' } }],
        usage: null,
      }),
      'deepseek-v4-flash',
    )
    const usage = parseDeepSeekData(
      JSON.stringify({
        choices: [],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30,
        },
      }),
      'deepseek-v4-flash',
    )

    expect(chunk).toEqual({ type: 'chunk', text: 'Hello table', usage: undefined })
    expect(usage).toMatchObject({
      type: 'usage',
      usage: {
        promptTokens: 20,
        completionTokens: 10,
        totalTokens: 30,
        model: 'deepseek-v4-flash',
        source: 'deepseek',
      },
    })
  })

  it('drains completed SSE frames and preserves the partial frame', () => {
    const drained = drainDeepSeekSseBuffer(
      'data: {"choices":[{"delta":{"content":"A"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"B"}}]}',
    )

    expect(drained.data).toHaveLength(1)
    expect(drained.data[0]).toContain('"A"')
    expect(drained.rest).toContain('"B"')
  })

  it('handles CRLF SSE frames', () => {
    const drained = drainDeepSeekSseBuffer(
      'data: {"choices":[{"delta":{"content":"A"}}]}\r\n\r\n',
    )

    expect(drained.data).toHaveLength(1)
    expect(drained.data[0]).toContain('"A"')
    expect(drained.rest).toBe('')
  })
})
