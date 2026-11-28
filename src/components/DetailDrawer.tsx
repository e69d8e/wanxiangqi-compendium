import { useId } from 'react';
import { AlertTriangle, Bookmark, ExternalLink, Share2, ShieldCheck, X } from 'lucide-react';
import type { CatalogItem, Kind } from '../types';
import { formatNumber, isTextRevised, itemSubtitle } from '../lib/catalog';
import type { FavoriteSyncMode } from '../lib/useFavorites';
import { useModalDialog } from '../lib/useModalDialog';
import { CardImage } from './CardImage';
import { StatusBadge } from './StatusBadge';

const kindLabels: Record<Kind, string> = {
  hero: '英雄',
  player: '棋手',
  talent: '天赋',
  equipment: '装备',
  effect: '效果牌',
};

const statLabels: Record<string, string> = {
  hp: '生命',
  attack: '物攻',
  spellPower: '法攻',
  armor: '物防',
  magicResistance: '法防',
  attackSpeed: '攻速',
  initialMana: '初始能量',
  maxMana: '能量上限',
};

interface Props {
  item: CatalogItem;
  verifiedAt: string;
  favorited?: boolean;
  syncMode?: FavoriteSyncMode;
  syncNotice?: string | null;
  onToggleFavorite?: () => void;
  onShare?: () => void;
  onClose: () => void;
}

export function DetailDrawer({
  item,
  verifiedAt,
  favorited = false,
  syncMode = 'local',
  syncNotice,
  onToggleFavorite,
  onShare,
  onClose,
}: Props) {
  const titleId = useId();
  const growthCaptionId = useId();
  const { dialogRef, requestClose, closedByProps } = useModalDialog(true, onClose);

  const related = [...(item.relatedCards ?? []), ...(item.derivedCards ?? [])];
  const snapshots = Object.entries(item.growth?.levelSnapshots ?? {});
  const updateUrl = item.sourceUpdate
    ? `https://wxq.qq.com/cp/a20260707sfgw/newsdetail.html?newsid=${item.sourceUpdate.id}`
    : undefined;

  return (
    <dialog
      ref={dialogRef}
      className="archive-dialog detail-drawer"
      aria-labelledby={titleId}
      {...closedByProps}
    >
      <div className="drawer-topbar">
        <span className="archive-number">ARCHIVE / {item.rawId ?? item.id}</span>
        <div className="drawer-topbar-actions">
          {onToggleFavorite && (
            <button
              type="button"
              className={`favorite-toggle ${favorited ? 'is-favorited' : ''}`}
              onClick={onToggleFavorite}
              aria-pressed={favorited}
              title={syncMode === 'cloud' ? '已启用 B站 Toy 云收藏同步' : '保存在本机收藏'}
            >
              <Bookmark size={15} aria-hidden="true" />
              <span>{favorited ? '已收藏' : '收藏'}</span>
            </button>
          )}
          {onShare && (
            <button
              type="button"
              className="icon-button"
              onClick={onShare}
              aria-label={`分享${item.name}档案`}
            >
              <Share2 size={17} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            onClick={() => void requestClose()}
            autoFocus
            aria-label="关闭详情"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {syncNotice && (
        <p className="sync-notice" role="status" aria-live="polite">
          {syncNotice}
        </p>
      )}

      <div className={`drawer-hero drawer-${item.kind}`}>
        <CardImage item={item} full eager decorative className="drawer-image" />
        <div className="drawer-heading">
          <div className="eyebrow">
            {kindLabels[item.kind]} · {itemSubtitle(item) || '万象档案'}
          </div>
          <h1 id={titleId}>{item.name}</h1>
          <div className="drawer-badges">
            {item.quality != null && <span className="quality-badge">{item.quality} 阶</span>}
            <StatusBadge item={item} />
          </div>
        </div>
      </div>

      <div className="drawer-content">
        {item.original && (
          <section className="detail-section primary-effect">
            <span className="section-index">01 / 卡牌效果</span>
            <p>{item.original}</p>
          </section>
        )}

        {item.awakening && (
          <section className="detail-section awakening-note">
            <span className="section-index">觉醒效果</span>
            <p>{item.awakening}</p>
          </section>
        )}

        {item.caveat && (
          <section className="detail-section data-caveat" role="note">
            <span className="section-index">
              <AlertTriangle size={14} aria-hidden="true" /> 数值分歧 · 待端内复核
            </span>
            <p>{item.caveat}</p>
          </section>
        )}

        {item.officialSkill && (
          <section className="detail-section">
            <span className="section-index">02 / 英雄技能</span>
            <h2>{item.officialSkill.name}</h2>
            <p>{item.officialSkill.original}</p>
            {item.officialSkill.enhancements?.length ? (
              <div className="level-nodes">
                {item.officialSkill.enhancements.map((node) => (
                  <div key={node.level}>
                    <strong>
                      {node.level}
                      <small>级</small>
                    </strong>
                    <p>{node.text}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        )}

        {item.rawBaseStats && (
          <section className="detail-section">
            <span className="section-index">03 / 基础属性</span>
            <div className="stats-grid">
              {Object.entries(item.rawBaseStats).map(([key, value]) => (
                <div key={key}>
                  <span>{statLabels[key] ?? key}</span>
                  <strong>{formatNumber(value)}</strong>
                </div>
              ))}
              {item.attackDistance != null && (
                <div>
                  <span>攻击距离</span>
                  <strong>{item.attackDistance}</strong>
                </div>
              )}
            </div>
            {item.growth?.templateReference?.growth && (
              <p className="muted-note">
                成长模板：{item.growth.template} · {item.growth.templateReference.growth}
              </p>
            )}
          </section>
        )}

        {snapshots.length > 0 && (
          <section className="detail-section">
            <span className="section-index">04 / 等级成长快照</span>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-labelledby={growthCaptionId}
            >
              <table className="growth-table">
                <caption id={growthCaptionId}>{item.name} 各等级属性成长快照</caption>
                <thead>
                  <tr>
                    <th scope="col">等级</th>
                    <th scope="col">生命</th>
                    <th scope="col">物攻</th>
                    <th scope="col">法攻</th>
                    <th scope="col">物防</th>
                    <th scope="col">法防</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map(([level, stats]) => (
                    <tr key={level}>
                      <th scope="row">{level}</th>
                      {['生命', '物攻', '法攻', '物防', '法防'].map((key) => (
                        <td key={key}>{stats[key] == null ? '—' : formatNumber(stats[key])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {item.skillSections?.length ? (
          <section className="detail-section">
            <span className="section-index">01 / 棋手技能与任务</span>
            <div className="skill-list">
              {item.skillSections.map((section, index) => (
                <article key={`${section.name}-${index}`}>
                  <div className="skill-list-meta">
                    <span>{section.type}</span>
                    {section.sourceUpdate && <small>公告 {section.sourceUpdate.date}</small>}
                  </div>
                  <h3>{section.name}</h3>
                  <p>{section.text}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {item.cards?.length ? (
          <details className="related-details">
            <summary>
              展开关联卡牌 <span>{item.cards.length}</span>
            </summary>
            <div className="player-card-list">
              {item.cards.map((card) => (
                <article key={card.id} id={`card-${card.id}`}>
                  <div className="related-card-title">
                    <strong>{card.name}</strong>
                    <code>#{card.id}</code>
                  </div>
                  <p>{card.description}</p>
                  {card.sourceUpdate && (
                    <small className="revision-copy">
                      已按 {card.sourceUpdate.date} 正式服公告修订
                    </small>
                  )}
                </article>
              ))}
            </div>
          </details>
        ) : null}

        {related.length > 0 && (
          <details className="related-details">
            <summary>
              展开关联与衍生卡 <span>{related.length}</span>
            </summary>
            <div className="related-grid">
              {related.map((card, index) => (
                <article key={`${card.id}-${index}`}>
                  <strong>{card.name ?? '未命名关联卡'}</strong>
                  <p>{card.descriptionPlain ?? card.original ?? '暂无效果说明'}</p>
                </article>
              ))}
            </div>
          </details>
        )}

        {item.acquisition && (
          <section className="detail-section compact">
            <span className="section-index">获取方式</span>
            <p>{item.acquisition.replace(/^来源:\s*/, '')}</p>
          </section>
        )}

        {item.formal && (
          <section className="detail-section research-note">
            <span className="section-index">玩家机制解读 · 非官方结论</span>
            <p>{item.formal}</p>
          </section>
        )}

        <section className="source-card">
          <ShieldCheck size={20} aria-hidden="true" />
          <div>
            <strong>资料与版本</strong>
            <p>
              {item.version ?? item.skillEvidence ?? '官网图鉴整理'} · 本站核验至 {verifiedAt}
            </p>
            {item.imageStatus && <p className="revision-copy">{item.imageStatus}</p>}
            <div className="source-links">
              <a href={item.officialUrl} target="_blank" rel="noreferrer">
                官方图鉴 <ExternalLink size={13} aria-hidden="true" />
              </a>
              <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                条目来源 <ExternalLink size={13} aria-hidden="true" />
              </a>
              {updateUrl && (
                <a href={updateUrl} target="_blank" rel="noreferrer">
                  {isTextRevised(item) ? '修订公告' : '相关公告'} {item.sourceUpdate?.id}{' '}
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </section>
      </div>
    </dialog>
  );
}
