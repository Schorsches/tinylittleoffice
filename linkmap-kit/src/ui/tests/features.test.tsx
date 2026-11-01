// @vitest-environment jsdom
import { act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { TextField, Features } from '../Features.tsx';
import { useStore } from '../../state/store.ts';
import { emptyDoc } from '../../format/index.ts';
import { setLanguage } from '../../i18n/index.ts';
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it('groups typing, blocks UTF-8 overflow and commits on blur', () => {
  vi.useFakeTimers();
  setLanguage('en');
  const commit = vi.fn();
  render(<TextField value="" limit={4} label="Name" commit={commit} />);
  const input = screen.getByLabelText('Name');
  fireEvent.change(input, { target: { value: 'ä' } });
  fireEvent.change(input, { target: { value: 'ää' } });
  expect(commit).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(501));
  expect(commit).toHaveBeenCalledExactlyOnceWith('ää');
  fireEvent.change(input, { target: { value: 'äää' } });
  expect(screen.getByRole('status').textContent).toContain('limit');
  expect(input.getAttribute('value')).toBe('ää');
  fireEvent.change(input, { target: { value: 'B' } });
  fireEvent.blur(input);
  expect(commit).toHaveBeenLastCalledWith('B');
});
it('renders untrusted names and notes as text with accessible controls', async () => {
  setLanguage('en');
  useStore.getState().replaceDoc({
    ...emptyDoc(),
    features: [{ kind: 'point', coords: [[1, 2]], name: '<script>alert(1)</script>', note: '<img src=x>', color: 0 }],
  });
  useStore.setState({ selected: 0 });
  const { container } = render(
    <main>
      <h1>Linkmap</h1>
      <Features />
    </main>,
  );
  expect(container.querySelector('script')).toBeNull();
  expect(container.querySelector('img')).toBeNull();
  expect(screen.getByText('<script>alert(1)</script>')).toBeTruthy();
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  expect(results.violations).toEqual([]);
});
