import { useEffect } from 'react';

const SITE = 'KOMANDRA';

function setMeta(selector: string, attribute: string, value: string) {
  let node = document.head.querySelector<HTMLMetaElement>(selector);
  if (!node) {
    node = document.createElement('meta');
    const [key, val] = selector.replace('meta[', '').replace(']', '').split('=');
    node.setAttribute(key, val.replace(/"/g, ''));
    document.head.appendChild(node);
  }
  node.setAttribute(attribute, value);
}

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE}` : `${SITE} — Taste The Komandra Experience`;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title || SITE);
    setMeta('meta[property="og:description"]', 'content', description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}${window.location.pathname}`;
  }, [title, description]);
}
