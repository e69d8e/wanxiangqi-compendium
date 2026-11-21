import type { CatalogItem } from '../types';
import { statusHint, statusLabel } from '../lib/catalog';

export function StatusBadge({ item }: { item: CatalogItem }) {
  const status = statusLabel(item);
  const tone = item.versionStatus === 'historical_pending' || item.temporarilyOffShelf
    ? 'warning'
    : item.sourceUpdate ? 'revised' : 'current';
  return <span className={`status-badge ${tone}`} title={statusHint(item)}>{status}</span>;
}