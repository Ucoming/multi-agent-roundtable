import { fireEvent, render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('switches theme and runs a mock streaming discussion', async () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText('Theme style'), {
      target: { value: 'tech-vision' },
    })

    expect(screen.getByText('Tech Vision Roundtable')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /start discussion/i }))

    expect(await screen.findByText(/contributions were made/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /markdown/i })).toBeEnabled()
  })
})
