import { useEffect, useState } from 'react';
import type { CatalogItem } from '../types';

interface Props {
  item: CatalogItem;
  className?: string;
  eager?: boolean;
  full?: boolean;
}

export function CardImage({ item, className = '', eager = false, full = false }: Props) {
  const preferred = full ? item.image || item.poster || item.localImage : item.localImage;
  const [src, setSrc] = useState(preferred);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(preferred);
    setFailed(false);
  }, [preferred, item.id]);

  if (failed) {
    return <div className={`image-fallback ${className}`} aria-label={`${item.name}暂无图像`}><span>{item.name.slice(0, 1)}</span></div>;
  }

  return (
    <img
      className={className}
      src={src}
      alt={item.name}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => {
        if (src !== item.localImage) setSrc(item.localImage);
        else if (item.image && src !== item.image) setSrc(item.image);
        else setFailed(true);
      }}
    />
  );
}
