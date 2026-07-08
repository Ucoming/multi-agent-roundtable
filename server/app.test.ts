// @vitest-environment node
import request from 'supertest'
import { createAgentsFromTemplate, defaultConfig } from '../src/data/templates'
import type { DiscussionMessage } from '../src/types'
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
