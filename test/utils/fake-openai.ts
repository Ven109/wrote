import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

export interface FakeOpenAi {
  server: Server
  /** Base URL of the Ollama-style root (OpenAI API under `/v1`). */
  url: string
  requests: { messages: { role: string, content?: unknown }[] }[]
  close: () => Promise<void>
}

type Reply = { toolCall: { name: string, arguments: Record<string, unknown> } } | { text: string }

/** Decides the reply from the conversation so far (default: search once, then answer). */
export type Script = (messages: { role: string, content?: unknown }[]) => Reply

const defaultScript: Script = messages => messages.some(message => message.role === 'tool')
  ? { text: 'The harbor appears in "Arrival".' }
  : { toolCall: { name: 'search', arguments: { query: 'harbor' } } }

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let body = ''
  for await (const chunk of request) body += chunk
  return body ? JSON.parse(body) : {}
}

const chunk = (delta: Record<string, unknown>, finish: string | null = null) =>
  `data: ${JSON.stringify({ id: 'c1', object: 'chat.completion.chunk', created: 0, model: 'tiny:latest', choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`

function streamReply(reply: Reply): string {
  if ('text' in reply) return chunk({ role: 'assistant', content: reply.text }) + chunk({}, 'stop') + 'data: [DONE]\n\n'
  const call = { index: 0, id: 'call_1', type: 'function', function: { name: reply.toolCall.name, arguments: JSON.stringify(reply.toolCall.arguments) } }
  return chunk({ role: 'assistant', tool_calls: [call] }) + chunk({}, 'tool_calls') + 'data: [DONE]\n\n'
}

/** A tiny Ollama/OpenAI-compatible server for tests: model list + scripted (streaming) chat completions. */
export async function startFakeOpenAi(script: Script = defaultScript): Promise<FakeOpenAi> {
  const requests: FakeOpenAi['requests'] = []
  const server = createServer(async (request, response) => {
    if (request.url === '/api/tags') {
      response.setHeader('content-type', 'application/json')
      return void response.end(JSON.stringify({ models: [{ name: 'tiny:latest' }] }))
    }
    if (request.url === '/v1/chat/completions') {
      const body = await readJson(request)
      const messages = body.messages as FakeOpenAi['requests'][number]['messages']
      requests.push({ messages })
      const reply = script(messages)
      if (body.stream) {
        response.setHeader('content-type', 'text/event-stream')
        return void response.end(streamReply(reply))
      }
      response.setHeader('content-type', 'application/json')
      const message = 'text' in reply ? { role: 'assistant', content: reply.text } : { role: 'assistant', content: null }
      return void response.end(JSON.stringify({ id: 'c1', object: 'chat.completion', created: 0, model: 'tiny:latest', choices: [{ index: 0, message, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }))
    }
    response.statusCode = 404
    response.end('{}')
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  return {
    server,
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    requests,
    close: () => new Promise(resolve => server.close(() => resolve())),
  }
}
