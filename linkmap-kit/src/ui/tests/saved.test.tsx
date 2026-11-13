// @vitest-environment jsdom
import { act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Saved } from '../Saved.tsx';
import { setLanguage } from '../../i18n/index.ts';
const api = vi.hoisted(() => ({
  save: vi.fn(),
  list: vi.fn(),
  rename: vi.fn(),
  remove: vi.fn(),
  forgetEverything: vi.fn(),
  enableOffline: vi.fn(),
  snapshot: vi.fn(),
}));
vi.mock('../../storage/saved.ts', () => api);
vi.mock('../../state/saved-snapshot.ts', () => ({ savedSnapshot: api.snapshot }));
beforeEach(() => {
  vi.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  setLanguage('en');
  api.snapshot.mockResolvedValue({ title: 'Protected map', payload: 'Encrypted-payload' });
  api.save.mockResolvedValue('id');
  api.list.mockResolvedValue([{ id: 'id', title: 'Saved example', payload: 'rabc', savedAt: 1000 }]);
});
afterEach(cleanup);
it('allows only one pending save and disables conflicting actions until it completes', async () => {
  render(<Saved close={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Saved maps' }));
  await screen.findByText('Saved example');
  let finish = () => {};
  api.save.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const button = screen.getByRole('button', { name: 'Save on this device' });
  act(() => {
    fireEvent.click(button);
    fireEvent.click(button);
  });
  await vi.waitFor(() => expect(api.save).toHaveBeenCalledOnce());
  expect(api.snapshot).toHaveBeenCalledOnce();
  expect(api.save).toHaveBeenCalledWith({ title: 'Protected map', payload: 'Encrypted-payload' }, 'en');
  for (const name of ['Open', 'Rename', 'Delete', 'Enable offline app', 'Forget everything'])
    expect(screen.getByRole('button', { name }).hasAttribute('disabled')).toBe(true);
  await act(async () => finish());
  await screen.findByText('Map saved on this device');
});
it('does not write a changed snapshot and allows a retry after the error', async () => {
  api.snapshot.mockRejectedValueOnce(Error('map changed'));
  render(<Saved close={vi.fn()} />);
  const button = screen.getByRole('button', { name: 'Save on this device' });
  fireEvent.click(button);
  await screen.findByText('Local storage is unavailable.');
  expect(api.save).not.toHaveBeenCalled();
  await vi.waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
  fireEvent.click(button);
  await screen.findByText('Map saved on this device');
  expect(api.save).toHaveBeenCalledOnce();
});
