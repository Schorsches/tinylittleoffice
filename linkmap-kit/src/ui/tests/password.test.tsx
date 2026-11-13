// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Password } from '../Password.tsx';
import { useStore } from '../../state/store.ts';
import { setLanguage } from '../../i18n/index.ts';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('starts an editable new map from a locked visitor link', () => {
  setLanguage('en');
  useStore.getState().gateDocument('needs-password', 'Encrypted');
  useStore.setState({ mode: 'view' });
  const replace = vi.spyOn(history, 'replaceState').mockImplementation(() => {});
  render(<Password opening done={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'New map' }));
  expect(replace).toHaveBeenCalled();
  expect(useStore.getState().status).toBe('ready');
  expect(useStore.getState().mode).toBe('edit');
});
