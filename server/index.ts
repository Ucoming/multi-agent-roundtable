import { createApp } from './app'
import { loadServerConfig } from './env'

const config = loadServerConfig()
const app = createApp(config)

app.listen(config.apiPort, '127.0.0.1', () => {
  console.log(`Roundtable API listening at http://127.0.0.1:${config.apiPort}`)
  console.log(
    config.deepseekApiKey
      ? `DeepSeek live mode is configured with model ${config.deepseekModel}.`
      : 'DeepSeek live mode needs DEEPSEEK_API_KEY in .env.',
  )
})
