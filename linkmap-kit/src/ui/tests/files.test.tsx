// @vitest-environment jsdom
import { act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Files } from '../Files.tsx';
import { importTemplate } from '../../io/import-guide.ts';
import { emptyDoc } from '../../format/index.ts';
import { useStore } from '../../state/store.ts';
import { setLanguage } from '../../i18n/index.ts';
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  setLanguage('en');
  useStore.getState().replaceDoc({ ...emptyDoc(), title: 'My map' });
});
afterEach(cleanup);
it('previews pasted data without changing the map and applies only on request', async () => {
  const close = vi.fn();
  render(<Files close={close} />);
  fireEvent.click(screen.getByText('Paste GeoJSON', { selector: 'summary' }));
  fireEvent.change(screen.getByLabelText('Paste GeoJSON'), { target: { value: importTemplate } });
  fireEvent.click(screen.getByRole('button', { name: 'Check data' }));
  await screen.findByText('Example meeting point');
  expect(useStore.getState().doc.title).toBe('My map');
  expect(useStore.getState().doc.features).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Add to map' }));
  expect(useStore.getState().doc.title).toBe('My map');
  expect(useStore.getState().doc.features).toHaveLength(3);
  expect(close).toHaveBeenCalledOnce();
  act(() => useStore.getState().undo());
  expect(useStore.getState().doc.title).toBe('My map');
  expect(useStore.getState().doc.features).toHaveLength(0);
});
it('clears a previous preview when pasted data changes or fails validation', async () => {
  render(<Files close={vi.fn()} />);
  fireEvent.click(screen.getByText('Paste GeoJSON', { selector: 'summary' }));
  const input = screen.getByLabelText('Paste GeoJSON');
  fireEvent.change(input, { target: { value: importTemplate } });
  fireEvent.click(screen.getByRole('button', { name: 'Check data' }));
  await screen.findByText('Example meeting point');
  fireEvent.change(input, { target: { value: '{' } });
  expect(screen.queryByRole('button', { name: 'Replace map' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Check data' }));
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: 'Add to map' })).toBeNull();
  expect(useStore.getState().doc.features).toHaveLength(0);
});
it('ignores late file reads after a newer import has failed', async () => {
  render(<Files close={vi.fn()} />);
  let finish: (s: string) => void = () => {};
  const slow = new File([''], 'slow.json');
  Object.defineProperty(slow, 'text', {
    value: () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  });
  const bad = new File([''], 'bad.json');
  Object.defineProperty(bad, 'text', { value: () => Promise.resolve('{') });
  const input = screen.getByLabelText('Import file');
  fireEvent.change(input, { target: { files: [slow] } });
  fireEvent.change(input, { target: { files: [bad] } });
  await screen.findByRole('alert');
  await act(async () => finish(importTemplate));
  expect(screen.queryByRole('button', { name: 'Replace map' })).toBeNull();
});

it('blocks empty results from replacing the current map', async () => {
  const close = vi.fn();
  render(<Files close={close} />);
  fireEvent.click(screen.getByText('Paste GeoJSON', { selector: 'summary' }));
  fireEvent.change(screen.getByLabelText('Paste GeoJSON'), { target: { value: '{"type":"FeatureCollection","features":[]}' } });
  fireEvent.click(screen.getByRole('button', { name: 'Check data' }));
  const replace = await screen.findByRole('button', { name: 'Replace map' });
  expect(replace.hasAttribute('disabled')).toBe(true);
  fireEvent.click(replace);
  expect(close).not.toHaveBeenCalled();
  expect(useStore.getState().doc.title).toBe('My map');
});
