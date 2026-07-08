// @vitest-environment node
import request from 'supertest'
import { createAgentsFromTemplate, defaultConfig } from '../src/data/templates'
import type { DiscussionMessage, GuidanceMessage } from '../src/types'
import { createApp } from './app'
import type { ServerConfig } from './env'

describe('Express API', () => {
  it('reports health without exposing secrets', async () => {
    const response = await request(createApp(createConfig({ deepseekApiKey: 'secret-key' })))
      .get('/api/health')
      .expect(200)

    expect(response.body).toMatchObject({
      ok: true,
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      hasDeepSeekKey: true,
    })
    expect(JSON.stringify(response.body)).not.toContain('secret-key')
  })

  it('returns a safe SSE error when DEEPSEEK_API_KEY is missing', async () => {
    const agents = createAgentsFromTemplate('brainstorming')
    const response = await request(createApp(createConfig({ deepseekApiKey: '' })))
      .post('/api/agent-turn')
      .send({
        provider: 'deepseek',
        agent: agents[0],
        config: defaultConfig,
        round: 1,
        turnIndex: 0,
        activeAgents: agents,
        previousMessages: [] satisfies DiscussionMessage[],
      })
      .expect(200)

    expect(response.text).toContain('event: error')
    expect(response.text).toContain('DeepSeek API key is not configured')
    expect(response.text).not.toContain('DEEPSEEK_API_KEY=')
  })

  it('returns a safe SSE error for needs guide when DEEPSEEK_API_KEY is missing', async () => {
    const response = await request(createApp(createConfig({ deepseekApiKey: '' })))
      .post('/api/needs-guide')
      .send({
        provider: 'deepseek',
        config: defaultConfig,
        stage: 'story',
        initialQuestion: 'I am not sure what I need.',
        messages: [] satisfies GuidanceMessage[],
      })
      .expect(200)

    expect(response.text).toContain('event: error')
    expect(response.text).toContain('DeepSeek API key is not configured')
    expect(response.text).not.toContain('DEEPSEEK_API_KEY=')
  })

  it('validates needs guide requests safely', async () => {
    const response = await request(createApp(createConfig({ deepseekApiKey: 'secret-key' })))
      .post('/api/needs-guide')
      .send({
        provider: 'deepseek',
        config: defaultConfig,
        stage: 'not-a-stage',
        initialQuestion: 'I am not sure what I need.',
        messages: [] satisfies GuidanceMessage[],
      })
      .expect(200)

    expect(response.text).toContain('event: error')
    expect(response.text).toContain('Missing or invalid guidance stage')
    expect(response.text).not.toContain('secret-key')
  })
})

function createConfig(patch: Partial<ServerConfig> = {}): ServerConfig {
  return {
    apiPort: 3001,
    deepseekApiKey: '',
    deepseekBaseUrl: 'https://api.deepseek.com',
    deepseekModel: 'deepseek-v4-flash',
    ...patch,
  }
}
