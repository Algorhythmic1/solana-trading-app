import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    globals: true
  }
});

// Example component test
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TokenSelector } from './TokenSelector';

describe('TokenSelector', () => {
  it('renders with placeholder', () => {
    render(<TokenSelector placeholder="Select a token" />);
    expect(screen.getByPlaceholderText('Select a token')).toBeInTheDocument();
  });
});