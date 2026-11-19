import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import App from './App'

test('counts steps and resets to the initial state', async () => {
  const user = userEvent.setup()
  render(<App />)
  const reset = screen.getByRole<HTMLButtonElement>('button', { name: 'Reset' })
  const step = screen.getByRole('button', { name: 'Take a step' })

  expect(screen.getByRole('status').textContent).toBe('0 steps forward')
  expect(reset.disabled).toBe(true)
  await user.click(step)
  expect(screen.getByRole('status').textContent).toBe('1 step forward')
  expect(reset.disabled).toBe(false)
  await user.click(step)
  expect(screen.getByRole('status').textContent).toBe('2 steps forward')
  await user.click(reset)
  expect(screen.getByRole('status').textContent).toBe('0 steps forward')
  expect(reset.disabled).toBe(true)
})

test('supports the primary interaction from the keyboard', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.tab()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Take a step' }))
  await user.keyboard('{Enter}')
  expect(screen.getByRole('status').textContent).toBe('1 step forward')
})
