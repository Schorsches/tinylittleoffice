import { useSyncExternalStore } from 'react';
import { en } from './en.ts';
import { de } from './de.ts';
export type Key = keyof typeof en;
let language: 'en' | 'de' = typeof navigator !== 'undefined' && navigator.language.startsWith('de') ? 'de' : 'en';
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export function setLanguage(value: 'en' | 'de') {
  language = value;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = value;
    document.documentElement.dir = 'ltr';
  }
  listeners.forEach((cb) => cb());
}
export function t(key: Key) {
  return (language === 'de' ? de : en)[key];
}
export function useT() {
  useSyncExternalStore((cb) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, getLanguage);
  return t;
}
