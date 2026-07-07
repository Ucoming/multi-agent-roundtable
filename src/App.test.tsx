import { fireEvent, render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('switches theme and runs a mock streaming discussion', async () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('Theme style'), {
      target: { value: 'tech-vision' },
    })
    fireEvent.change(screen.getByLabelText('Visual scene'), {
      target: { value: 'future-lab' },
    })

    expect(screen.getByRole('heading', { name: 'Future Lab' })).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Add agent'))
    expect(screen.getByText(/5 total/i)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Remove last agent'))
    expect(screen.getByText(/4 total/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /start discussion/i }))

    expect(await screen.findByText(/contributions were made/i)).toBeInTheDocument()
    expect(screen.getByText(/spoke last/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /markdown/i })).toBeEnabled()
  })
})
