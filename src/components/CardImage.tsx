import { useEffect, useState } from 'react';
import type { CatalogItem } from '../types';

interface Props {
  item: CatalogItem;
  className?: string;
  eager?: boolean;
  full?: boolean;
  decorative?: boolean;
  priority?: 'high' | 'low';
}

function resolveLocalAsset(src: string | undefined): string {
  if (!src) return '';
  if (!src.startsWith('/') || src.startsWith('//')) return src;
  const base = import.meta.env.BASE_URL || './';
  return `${base.endsWith('/') ? base : `${base}/`}${src.slice(1)}`;
}

export function CardImage({
  item,
  className = '',
  eager = false,
  full = false,
  decorative = false,
  priority,
}: Props) {
  const localSrc = resolveLocalAsset(item.localImage);
  const preferred = full ? item.image || item.poster || localSrc : localSrc;
  const [src, setSrc] = useState(preferred);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(preferred);
    setFailed(false);
  }, [preferred, item.id]);

  if (failed) {
    return (
      <div
        className={`image-fallback ${className}`}
        aria-hidden={decorative ? 'true' : undefined}
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : `${item.name}暂无图像`}
      >
        <span aria-hidden="true">{item.name.slice(0, 1)}</span>
      </div>
    );
  }

  // Reserve explicit aspect-ratio dimensions to prevent CLS
  const isPortrait = full && item.kind === 'player';
  const width = full ? 320 : 160;
  const height = isPortrait ? 426 : width;
  // Never combine fetchPriority="high" with loading="lazy"
  const loading = priority === 'high' || eager ? 'eager' : 'lazy';

  return (
    <img
      className={className}
      src={src}
      alt={decorative ? '' : item.name}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      fetchPriority={priority}
      onError={() => {
        if (src !== localSrc) setSrc(localSrc);
        else if (item.image && src !== item.image) setSrc(item.image);
        else setFailed(true);
      }}
    />
  );
}
