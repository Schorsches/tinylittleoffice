/**
 * Placeholder shell from the kit: proves the format, MapLibre loading and the CSP work together. Phase 2 onwards
 * (prompts/) replaces it with the real app. Keep: the map is read from the fragment and never sent anywhere.
 */
import { useEffect, useRef, useState } from 'react';
import { decodeMap, emptyDoc, LinkError, payloadOf, type MapDoc } from './format/index.ts';
import { createMap } from './map/maplibre.ts';

function readDoc(): { doc: MapDoc; error?: LinkError['code'] } {
  const payload = payloadOf(location.hash);
  if (!payload) return { doc: emptyDoc() };
  try {
    return { doc: decodeMap(payload) };
  } catch (e) {
    return { doc: emptyDoc(), error: e instanceof LinkError ? e.code : 'malformed' };
  }
}

export function App() {
  const ref = useRef<HTMLDivElement>(null);
  const [{ doc, error }] = useState(readDoc);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let map: { remove(): void } | undefined;
    let cancelled = false;
    void createMap(el, doc.view).then((m) => (cancelled ? m.remove() : (map = m)));
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [doc.view]);

  return (
    <div className="app">
      <header>
        <strong>{doc.title || 'Linkmap'}</strong>
        <span className="privacy-note">The map lives in this link. Tiles come from OpenFreeMap; nothing else leaves your browser.</span>
        {error && <span role="alert">This link could not be opened ({error}).</span>}
      </header>
      <div ref={ref} className="map" aria-label="Map" />
    </div>
  );
}
