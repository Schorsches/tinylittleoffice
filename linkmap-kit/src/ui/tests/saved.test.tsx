// @vitest-environment jsdom
import { act } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  api.list.mockResolvedValue([{ key: 'id', title: 'Saved example', payload: 'rabc', savedAt: 1000 }]);
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

it('keeps a broken row deletable while the usable map remains available', async () => {
  api.list.mockResolvedValueOnce([
    { key: 42, title: 'Broken entry', payload: null, savedAt: null },
    { key: 'good', title: 'Keep this map', payload: 'rabc', savedAt: 1000 },
  ]);
  render(<Saved close={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Saved maps' }));
  const broken = (await screen.findByText('Broken entry')).closest('li')!;
  expect(within(broken).getByRole('button', { name: 'Open' }).hasAttribute('disabled')).toBe(true);
  expect(within(broken).getByRole('button', { name: 'Rename' }).hasAttribute('disabled')).toBe(true);
  const good = screen.getByText('Keep this map').closest('li')!;
  expect(within(good).getByRole('button', { name: 'Open' }).hasAttribute('disabled')).toBe(false);
  fireEvent.click(within(broken).getByRole('button', { name: 'Delete' }));
  await vi.waitFor(() => expect(api.remove).toHaveBeenCalledWith(42));
  expect(api.forgetEverything).not.toHaveBeenCalled();
});

it('renders missing dates and hostile-looking titles as text without losing the open action', async () => {
  api.list.mockResolvedValueOnce([{ key: 'good', title: '<img src=x onerror=alert(1)>', payload: 'rabc', savedAt: null }]);
  const { container } = render(<Saved close={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Saved maps' }));
  await screen.findByText('<img src=x onerror=alert(1)>');
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('.saved-list small')).toBeNull();
  expect(screen.getByRole('button', { name: 'Open' }).hasAttribute('disabled')).toBe(false);
});
