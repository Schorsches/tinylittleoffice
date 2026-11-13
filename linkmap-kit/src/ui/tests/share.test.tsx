// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SimplifyPanel, Share } from '../Share.tsx';
import { useStore } from '../../state/store.ts';
import { emptyDoc } from '../../format/index.ts';
import { startLinkSync } from '../../state/link.ts';
import { setLanguage } from '../../i18n/index.ts';
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  setLanguage('en');
  useStore.getState().replaceDoc(emptyDoc());
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
  else Reflect.deleteProperty(navigator, 'clipboard');
});
it('shows a recoverable limit message instead of crashing on an oversized simplification preview', () => {
  useStore.getState().replaceDoc({
    ...emptyDoc(),
    features: Array.from({ length: 600 }, () => ({
      kind: 'point',
      coords: [[8.3, 49.2]],
      color: 0,
      name: '',
      note: 'x'.repeat(4000),
      info: { address: '', category: '', services: [], hours: '' },
    })),
  });
  const close = vi.fn();
  render(<SimplifyPanel close={close} />);
  expect(screen.getByRole('alert').textContent).toBe('The limit was reached. Shorten the text or simplify the map.');
  expect(screen.getByRole('button', { name: 'Apply' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(close).toHaveBeenCalledOnce();
});
it.each(['missing', 'rejected', 'throwing'])('selects the link as a manual fallback when Clipboard API is %s', async (failure) => {
  const stop = startLinkSync({ read: () => '', write: () => {}, listen: () => () => {} });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value:
      failure === 'missing'
        ? undefined
        : {
            writeText: () => {
              if (failure === 'throwing') throw Error('denied');
              return Promise.reject(Error('denied'));
            },
          },
  });
  try {
    render(<Share close={vi.fn()} password={vi.fn()} />);
    const input = await screen.findByRole('textbox');
    await vi.waitFor(() => expect((input as HTMLTextAreaElement).value).not.toBe(''));
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await screen.findByText('Select the link and press Ctrl/Cmd+C.');
    expect((input as HTMLTextAreaElement).selectionStart).toBe(0);
    expect((input as HTMLTextAreaElement).selectionEnd).toBe((input as HTMLTextAreaElement).value.length);
  } finally {
    stop();
  }
});
