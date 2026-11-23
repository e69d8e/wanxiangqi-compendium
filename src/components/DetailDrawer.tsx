import { useEffect, useRef } from 'react';
import { ExternalLink, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import type { CatalogItem } from '../types';
import { kindLabels } from '../data';
import { formatNumber, isTextRevised, itemSubtitle } from '../lib/catalog';
import { CardImage } from './CardImage';
import { StatusBadge } from './StatusBadge';

const statLabels: Record<string, string> = {
  hp: '生命', attack: '物攻', spellPower: '法攻', armor: '物防',
  magicResistance: '法防', attackSpeed: '攻速', initialMana: '初始能量', maxMana: '能量上限',
};

export function DetailDrawer({ item, verifiedAt, onClose }: { item: CatalogItem; verifiedAt: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const panel = document.querySelector<HTMLElement>('.detail-drawer');
        const focusable = panel?.querySelectorAll<HTMLElement>('button, a[href], summary, [tabindex="0"]');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [onClose]);

  const related = [...(item.relatedCards ?? []), ...(item.derivedCards ?? [])];
  const snapshots = Object.entries(item.growth?.levelSnapshots ?? {});
  const updateUrl = item.sourceUpdate
    ? `https://wxq.qq.com/cp/a20260707sfgw/newsdetail.html?newsid=${item.sourceUpdate.id}`
    : undefined;

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <div className="drawer-topbar">
          <span className="archive-number">ARCHIVE / {item.rawId ?? item.id}</span>
          <button ref={closeRef} className="icon-button" onClick={onClose} aria-label="关闭详情"><X size={20} /></button>
        </div>
        <div className={`drawer-hero drawer-${item.kind}`}>
          <CardImage item={item} full eager className="drawer-image" />
          <div className="drawer-heading">
            <div className="eyebrow">{kindLabels[item.kind]} · {itemSubtitle(item) || '万象档案'}</div>
            <h2 id="detail-title">{item.name}</h2>
            <div className="drawer-badges">
              {item.quality != null && <span className="quality-badge">{item.quality} 阶</span>}
              <StatusBadge item={item} />
            </div>
          </div>
        </div>

        <div className="drawer-content">
          {item.original && <section className="detail-section primary-effect">
            <span className="section-index">01 / 卡牌效果</span>
            <p>{item.original}</p>
          </section>}

          {item.awakening && <section className="detail-section awakening-note">
            <span className="section-index">觉醒效果</span><p>{item.awakening}</p>
          </section>}

          {item.caveat && <section className="detail-section data-caveat" role="note">
            <span className="section-index"><AlertTriangle size={13} /> 数值分歧 · 待端内复核</span>
            <p>{item.caveat}</p>
          </section>}

          {item.officialSkill && <section className="detail-section">
            <span className="section-index">02 / 英雄技能</span>
            <h3>{item.officialSkill.name}</h3>
            <p>{item.officialSkill.original}</p>
            {item.officialSkill.enhancements?.length ? <div className="level-nodes">
              {item.officialSkill.enhancements.map((node) => <div key={node.level}><strong>{node.level}<small>级</small></strong><p>{node.text}</p></div>)}
            </div> : null}
          </section>}

          {item.rawBaseStats && <section className="detail-section">
            <span className="section-index">03 / 基础属性</span>
            <div className="stats-grid">
              {Object.entries(item.rawBaseStats).map(([key, value]) => <div key={key}><span>{statLabels[key] ?? key}</span><strong>{formatNumber(value)}</strong></div>)}
              {item.attackDistance != null && <div><span>攻击距离</span><strong>{item.attackDistance}</strong></div>}
            </div>
            {item.growth?.templateReference?.growth && <p className="muted-note">成长模板：{item.growth.template} · {item.growth.templateReference.growth}</p>}
          </section>}

          {snapshots.length > 0 && <section className="detail-section">
            <span className="section-index">04 / 等级成长快照</span>
            <div className="table-scroll"><table className="growth-table"><thead><tr><th>等级</th><th>生命</th><th>物攻</th><th>法攻</th><th>物防</th><th>法防</th></tr></thead>
              <tbody>{snapshots.map(([level, stats]) => <tr key={level}><th>{level}</th>{['生命', '物攻', '法攻', '物防', '法防'].map((key) => <td key={key}>{stats[key] == null ? '—' : formatNumber(stats[key])}</td>)}</tr>)}</tbody>
            </table></div>
          </section>}

          {item.skillSections?.length ? <section className="detail-section">
            <span className="section-index">01 / 棋手技能与任务</span>
            <div className="skill-list">{item.skillSections.map((section, index) => <article key={`${section.name}-${index}`}>
              <div><span>{section.type}</span>{section.sourceUpdate && <small>公告 {section.sourceUpdate.date}</small>}</div>
              <h3>{section.name}</h3><p>{section.text}</p>
            </article>)}</div>
          </section> : null}

          {item.cards?.length ? <details className="related-details">
            <summary>展开关联卡牌 <span>{item.cards.length}</span></summary>
            <div className="player-card-list">{item.cards.map((card) => <article key={card.id} id={`card-${card.id}`}>
              <div className="related-card-title"><strong>{card.name}</strong><code>#{card.id}</code></div>
              <p>{card.description}</p>
              {card.sourceUpdate && <small className="revision-copy">已按 {card.sourceUpdate.date} 正式服公告修订</small>}
            </article>)}</div>
          </details> : null}

          {related.length > 0 && <details className="related-details">
            <summary>展开关联与衍生卡 <span>{related.length}</span></summary>
            <div className="related-grid">{related.map((card, index) => <article key={`${card.id}-${index}`}>
              <strong>{card.name ?? '未命名关联卡'}</strong>
              <p>{card.descriptionPlain ?? card.original ?? '暂无效果说明'}</p>
            </article>)}</div>
          </details>}

          {item.acquisition && <section className="detail-section compact"><span className="section-index">获取方式</span><p>{item.acquisition.replace(/^来源:\s*/, '')}</p></section>}
          {item.formal && <section className="detail-section research-note"><span className="section-index">玩家机制解读 · 非官方结论</span><p>{item.formal}</p></section>}

          <section className="source-card">
            <ShieldCheck size={20} />
            <div><strong>资料与版本</strong><p>{item.version ?? item.skillEvidence ?? '官网图鉴整理'} · 本站核验至 {verifiedAt}</p>
              {item.imageStatus && <p className="revision-copy">{item.imageStatus}</p>}
              <div className="source-links">
                <a href={item.officialUrl} target="_blank" rel="noreferrer">官方图鉴 <ExternalLink size={13} /></a>
                <a href={item.sourceUrl} target="_blank" rel="noreferrer">条目来源 <ExternalLink size={13} /></a>
                {updateUrl && <a href={updateUrl} target="_blank" rel="noreferrer">{isTextRevised(item) ? '修订公告' : '相关公告'} {item.sourceUpdate?.id} <ExternalLink size={13} /></a>}
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
