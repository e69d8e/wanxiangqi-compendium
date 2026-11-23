import type { SeasonDataset } from '../types';

interface Props {
  seasons: SeasonDataset[];
  currentId: string;
  patch: string;
  onSelect: (seasonId: string) => void;
}

export function SeasonSwitcher({ seasons, currentId, patch, onSelect }: Props) {
  const current = seasons.find((season) => season.meta.id === currentId) ?? seasons[0];

  if (seasons.length <= 1) {
    return <span className="header-version"><i /> {current.meta.shortLabel} · {patch}</span>;
  }

  return <div className="season-switcher" role="group" aria-label="切换赛季">
    {seasons.map((season) => <button key={season.meta.id} className={season.meta.id === currentId ? 'active' : ''} aria-pressed={season.meta.id === currentId} title={season.meta.label} onClick={() => onSelect(season.meta.id)}>{season.meta.shortLabel}</button>)}
    <span className="season-patch">{patch}</span>
  </div>;
}
