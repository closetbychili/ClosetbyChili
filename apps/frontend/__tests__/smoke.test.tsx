import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Frontend Smoke Test', () => {
  it('should pass a basic truthiness test', () => {
    expect(true).toBe(true);
  });

  it('should render a simple component', () => {
    render(<div>Hello Closet by Chilli</div>);
    expect(screen.getByText('Hello Closet by Chilli')).toBeInTheDocument();
  });
});
