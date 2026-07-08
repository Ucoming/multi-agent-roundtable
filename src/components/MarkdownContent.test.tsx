import { render, screen } from '@testing-library/react'
import { MarkdownContent } from './MarkdownContent'

describe('MarkdownContent', () => {
  it('renders GFM-style markdown without raw HTML execution', () => {
    render(
      <MarkdownContent content={'**Strong point**\n\n- first item\n\n<script>alert("x")</script>'} />,
    )

    expect(screen.getByText('Strong point').tagName.toLowerCase()).toBe('strong')
    expect(screen.getByText('first item').tagName.toLowerCase()).toBe('li')
    expect(screen.queryByText(/alert/)).not.toBeInTheDocument()
  })
})
