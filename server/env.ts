import dotenv from 'dotenv'

dotenv.config()

export interface ServerConfig {
  apiPort: number
  deepseekApiKey: string
  deepseekBaseUrl: string
  deepseekModel: string
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    apiPort: parsePort(env.API_PORT),
    deepseekApiKey: env.DEEPSEEK_API_KEY?.trim() ?? '',
    deepseekBaseUrl: env.DEEPSEEK_BASE_URL?.trim() || 'https://api.deepseek.com',
    deepseekModel: env.DEEPSEEK_MODEL?.trim() || 'deepseek-v4-flash',
  }
}

function parsePort(value: string | undefined) {
  const port = Number(value ?? 3001)
  return Number.isInteger(port) && port > 0 ? port : 3001
}
