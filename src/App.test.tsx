import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { App } from './App'

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', undefined)
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('switches topic space and runs a mock streaming discussion', async () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('Topic space'), {
      target: { value: 'philosophy' },
    })
    fireEvent.change(screen.getByLabelText('Visual scene'), {
      target: { value: 'future-lab' },
    })

    expect(
      screen.getByRole('heading', {
        name: 'Think through hard questions with contrasting philosophical lenses.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Future Lab' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Contradiction & Practice Lens')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Add agent'))
    expect(screen.getByText(/6 total/i)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Remove last agent'))
    expect(screen.getByText(/5 total/i)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Remove last agent'))
    fireEvent.change(screen.getByLabelText('Add preset agent'), {
      target: { value: 'ethics-referee' },
    })
    expect(screen.getAllByDisplayValue('Ethics Referee').length).toBeGreaterThan(0)
    expect(screen.queryByText('CBT Reframer')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /start discussion/i }))

    expect(await screen.findByText(/Theory Link/i)).toBeInTheDocument()
    expect(screen.getByText(/spoke last/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /markdown/i })).toBeEnabled()
  })

  it('auto-saves a completed discussion and restores it from history', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /start discussion/i }))

    expect(await screen.findByText(/Theory Link/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/1 saved discussions/i)).toBeInTheDocument())

    const questionInput = screen.getByLabelText('Question')
    const originalQuestion = (questionInput as HTMLTextAreaElement).value
    fireEvent.change(questionInput, { target: { value: 'Temporary changed question.' } })

    const currentOpenButton = screen.getAllByRole('button', { name: /^open /i })[0]
    expect(currentOpenButton).toBeEnabled()
    fireEvent.click(currentOpenButton)
    expect(await screen.findByDisplayValue(originalQuestion)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^new$/i }))
    expect(screen.getByText(/Ask a question, choose a template/i)).toBeInTheDocument()

    const loadButton = screen.getAllByRole('button', { name: /^open /i })[0]
    fireEvent.click(loadButton)

    expect(await screen.findByText(/Theory Link/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /markdown/i })).toBeEnabled()
  })

  it('shows a live mode error returned by the local API', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        'event: error\ndata: {"error":"DeepSeek API key is not configured."}\n\n',
        {
          headers: { 'Content-Type': 'text/event-stream' },
        },
      )
    }) as typeof fetch

    try {
      render(<App />)

      fireEvent.change(screen.getByLabelText('Provider mode'), {
        target: { value: 'deepseek' },
      })
      fireEvent.click(screen.getByRole('button', { name: /start discussion/i }))

      expect(await screen.findByText(/DeepSeek API key is not configured/i)).toBeInTheDocument()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('guides the user through needs clarification and applies the summary to the question', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /guide me first/i }))
    expect(await screen.findByLabelText('Needs guide conversation')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Answer the guide in your own words.'), {
      target: { value: '我们最近总是误解对方，我不知道该不该继续解释。' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }))
    expect(await screen.findByText(/Feelings and needs/i)).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Answer the guide in your own words.'), {
      target: { value: '我很焦虑，也想被认真理解。' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }))
    expect(await screen.findByText(/Boundary or request/i)).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Answer the guide in your own words.'), {
      target: { value: '我想约一次平静谈话，也希望对方不要打断。' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }))
    expect(await screen.findByRole('button', { name: /generate needs summary/i })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: /generate needs summary/i }))
    expect(await screen.findByText(/圆桌问题/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /use for roundtable/i }))
    expect(screen.getByDisplayValue(/如何理解自己的感受/i)).toBeInTheDocument()
  })
})
