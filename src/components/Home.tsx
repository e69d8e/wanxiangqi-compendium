import type { CSSProperties } from 'react';
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Users,
  WandSparkles,
} from 'lucide-react';
import type { CatalogItem, SeasonDataset, View } from '../types';
import { makeHash, makeItemHash } from '../lib/router';
import { CardImage } from './CardImage';

const featuredNames = ['吕布', '安琪拉', '敖隐', '百里玄策', '蒙犽'];
const preferredFactions = ['河洛', '逐鹿', '三分之地', '日落海', '大河流域', '无阵营'];

interface Props {
  season: SeasonDataset;
  onNavigate: (view: View, params?: Record<string, string>) => void;
  onSelect: (item: CatalogItem) => void;
  onSearch: () => void;
}

export function Home({ season, onNavigate, onSelect, onSearch }: Props) {
  const { effects, equipment, heroes, meta, players, talents } = season;
  const named = featuredNames
    .map((name) => heroes.find((hero) => hero.name === name))
    .filter((item): item is CatalogItem => Boolean(item));
  const featured = [
    ...named,
    ...heroes.filter((hero) => !named.includes(hero)).slice(0, Math.max(0, 5 - named.length)),
  ];
  const availableFactions = [
    ...new Set(heroes.map((hero) => hero.faction).filter((faction): faction is string => Boolean(faction))),
  ];
  const factions = [
    ...preferredFactions.filter((faction) => availableFactions.includes(faction)),
    ...availableFactions.filter((faction) => !preferredFactions.includes(faction)),
  ].slice(0, 6);
  const maxFactionCount = Math.max(
    1,
    ...factions.map((faction) => heroes.filter((hero) => hero.faction === faction).length),
  );
  const patch = meta.latestPatch;
  const patchPlayer = patch?.playerName
    ? players.find((player) => player.name === patch.playerName)
    : undefined;

  const categories = [
    { view: 'heroes' as View, icon: Swords, index: '01', title: '英雄棋谱', count: heroes.length, note: '阵营 · 技能 · 觉醒 · 成长' },
    { view: 'players' as View, icon: Users, index: '02', title: '棋手档案', count: players.length, note: '技能 · 秘技 · 专属 · 关联卡' },
    { view: 'talents' as View, icon: Sparkles, index: '03', title: '天赋总览', count: talents.length, note: '品阶 · 天赋包 · 投放阶段' },
    { view: 'equipment' as View, icon: Boxes, index: '04', title: '装备手册', count: equipment.length, note: '铸造 · 类型 · 关联装备' },
    { view: 'effects' as View, icon: WandSparkles, index: '05', title: '效果牌集', count: effects.length, note: '阵营 · 品阶 · 获取方式' },
  ];

  const handleNavClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    view: View,
    params?: Record<string, string>,
  ) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    onNavigate(view, params);
  };

  const handleItemClick = (event: React.MouseEvent<HTMLAnchorElement>, item: CatalogItem) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    onSelect(item);
  };

  const focalHeroIndex = featured.length >= 5 ? 4 : 0;

  return (
    <main className="home-page">
      <section className="home-hero page-shell">
        <div className="hero-copy">
          <div className="season-stamp">
            <span aria-hidden="true" /> {meta.season} <b>{meta.currentPatch}</b>
          </div>
          <span className="eyebrow">THE WANXIANG ARCHIVE · 2026</span>
          <h1 tabIndex={-1}>
            万象<span>棋谱</span>
          </h1>
          <p className="hero-lead">
            纵横万象，有据可循。
            <br />
            一座为棋手而生的<span>可检索棋盘档案馆</span>。
          </p>
          <div className="hero-actions">
            <a
              className="primary-button"
              href={makeHash('heroes', { season: meta.id })}
              onClick={(event) => handleNavClick(event, 'heroes')}
            >
              进入英雄图鉴 <ArrowRight size={17} aria-hidden="true" />
            </a>
            <button type="button" className="search-cta" onClick={onSearch}>
              <Search size={18} aria-hidden="true" /> 全站搜索 <kbd aria-hidden="true">⌘ K</kbd>
            </button>
          </div>
          <div className="hero-trust">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>公告修订优先 · 逐条来源回溯 · 社区数据明确标识</span>
          </div>
        </div>

        <div className="hero-board" role="region" aria-label="精选英雄卡牌">
          <div className="board-coordinates top" aria-hidden="true">
            A　B　C　D　E　F
          </div>
          <div className="board-coordinates side" aria-hidden="true">
            1<br />2<br />3<br />4<br />5<br />6
          </div>
          <div className="board-sigil" aria-hidden="true">
            <span>万</span>
            <i />
          </div>
          {featured.map((item, index) => (
            <a
              key={item.id}
              href={makeItemHash(item, meta.id)}
              className={`hero-card hero-card-${index + 1}`}
              onClick={(event) => handleItemClick(event, item)}
              aria-label={`查看 ${item.name}（${item.faction ?? '英雄'} · ${item.quality ?? ''}阶）`}
            >
              <CardImage
                item={item}
                eager
                decorative
                priority={index === focalHeroIndex ? 'high' : undefined}
              />
              <span className="hero-card-meta" aria-hidden="true">
                <b>{item.name}</b>
                <small>
                  {item.faction} · {item.quality}阶
                </small>
              </span>
            </a>
          ))}
          <span className="board-caption" aria-hidden="true">
            FIG. 01 — 万象棋阵
          </span>
        </div>
      </section>

      <section className="ledger-strip" aria-label="档案概览统计">
        <div className="page-shell">
          <div>
            <strong>{meta.totalCount}</strong>
            <span>
              档案总条目<small>含历史与补充收录</small>
            </span>
          </div>
          <div>
            <strong>{heroes.length}</strong>
            <span>
              英雄棋子<small>六大阵营分类</small>
            </span>
          </div>
          <div>
            <strong>{players.length}</strong>
            <span>
              棋手档案<small>技能与秘技全录</small>
            </span>
          </div>
          <div>
            <strong>{talents.length}</strong>
            <span>
              天赋记录<small>三阶分类检索</small>
            </span>
          </div>
          <div className="ledger-date">
            <span>资料核验日</span>
            <strong>{meta.verifiedAt}</strong>
          </div>
        </div>
      </section>

      <section className="home-section page-shell category-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">EXPLORE THE ARCHIVE</span>
            <h2>五类档案，各就其位</h2>
          </div>
          <p>
            不是排行榜，不猜隐藏概率。
            <br />
            只把每张牌的来历与效果讲清楚。
          </p>
        </div>

        <div className="category-grid">
          {categories.map(({ icon: Icon, ...category }) => (
            <article key={category.view} className="category-card stretched-card">
              <span className="category-index" aria-hidden="true">
                {category.index}
              </span>
              <Icon size={25} strokeWidth={1.4} aria-hidden="true" />
              <div>
                <h3>
                  <a
                    href={makeHash(category.view, { season: meta.id })}
                    className="card-link"
                    onClick={(event) => handleNavClick(event, category.view)}
                  >
                    {category.title}
                  </a>
                </h3>
                <p>{category.note}</p>
              </div>
              <strong className="category-count">
                {category.count}
                <small>条</small>
              </strong>
              <ArrowRight className="category-arrow" size={19} aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="home-section page-shell faction-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              {factions.length === 6 ? 'SIX' : 'MULTI'} FACTIONS / {meta.shortLabel}
            </span>
            <h2>{factions.length === 6 ? '六方势力，一局万象' : '各方势力，一局万象'}</h2>
          </div>
          <p>
            阵营是英雄分类与机制线索，
            <br />
            不直接等同于传统自走棋的羁绊总表。
          </p>
        </div>

        <div className="faction-ledger">
          {factions.map((faction) => {
            const count = heroes.filter((hero) => hero.faction === faction).length;
            const barWidth = `${Math.max(8, (count / maxFactionCount) * 100)}%`;
            return (
              <article key={faction} className="faction-card stretched-card">
                <span className="faction-mark" aria-hidden="true">
                  {faction.replace('阵营', '').slice(0, 1)}
                </span>
                <div>
                  <h3>
                    <a
                      href={makeHash('heroes', { season: meta.id, filter: faction })}
                      className="card-link"
                      onClick={(event) => handleNavClick(event, 'heroes', { filter: faction })}
                    >
                      {faction}
                    </a>
                  </h3>
                  <span className="faction-count">{count} 名英雄</span>
                </div>
                <div className="faction-bar" aria-hidden="true">
                  <i style={{ '--bar-width': barWidth } as CSSProperties} />
                </div>
                <ArrowRight size={17} aria-hidden="true" />
              </article>
            );
          })}
        </div>
      </section>

      {patch && (
        <section className="page-shell patch-section">
          <div className="patch-label">
            <span>最新校勘</span>
            <strong>
              PATCH
              <br />
              {meta.currentPatch}
            </strong>
            <small>{meta.patchDate}</small>
          </div>
          <div className="patch-copy">
            <span className="eyebrow">OFFICIAL UPDATE / {patch.sourceUpdate.id}</span>
            <h2>{patch.title}</h2>
            <p>{patch.changes[0]?.description}</p>
            {patchPlayer ? (
              <a
                href={makeItemHash(patchPlayer, meta.id)}
                onClick={(event) => handleItemClick(event, patchPlayer)}
              >
                查看棋手修订档案 <ArrowRight size={16} aria-hidden="true" />
              </a>
            ) : (
              <a
                href={`https://wxq.qq.com/cp/a20260707sfgw/newsdetail.html?newsid=${patch.sourceUpdate.id}&tab=2`}
                target="_blank"
                rel="noreferrer"
              >
                查看官方公告 {patch.sourceUpdate.id} <ArrowRight size={16} aria-hidden="true" />
              </a>
            )}
          </div>
          <div className="patch-aside">
            <ShieldCheck size={24} aria-hidden="true" />
            <strong>公告优先于旧卡面</strong>
            <p>静态图鉴可能尚未同步热更。所有公告修订均保留来源编号与日期。</p>
          </div>
        </section>
      )}

      <section className="home-section page-shell tools-section">
        <article className="energy-teaser stretched-card">
          <div>
            <span className="eyebrow">RULES &amp; ENERGY</span>
            <h2>
              <a
                href={makeHash('mechanics', { season: meta.id })}
                className="card-link"
                onClick={(event) => handleNavClick(event, 'mechanics')}
              >
                每一步升级，
                <br />
                都算得明白。
              </a>
            </h2>
            <p>基础规则、关键词词典、升级能量阶梯与目标等级计算器。</p>
            <span className="text-link" aria-hidden="true">
              翻阅玩法机制 <ArrowRight size={16} />
            </span>
          </div>
          <div className="energy-steps" aria-hidden="true">
            {[7, 13, 17, 23, 27].map((cost, index) => (
              <div
                key={cost}
                className="energy-step-bar"
                style={{ '--step-height': `${4 + index * 1.05}rem` } as CSSProperties}
              >
                <span>LV.{index + 2}</span>
                <strong>{cost}</strong>
                <small>能</small>
              </div>
            ))}
            <em>社区汇总 · 待端内复核</em>
          </div>
        </article>

        <article className="sources-teaser stretched-card">
          <BookOpen size={28} strokeWidth={1.3} aria-hidden="true" />
          <span className="eyebrow">EVIDENCE FIRST</span>
          <h2>
            <a
              href={makeHash('sources', { season: meta.id })}
              className="card-link"
              onClick={(event) => handleNavClick(event, 'sources')}
            >
              资料可信，
              <br />
              因为边界清楚。
            </a>
          </h2>
          <p>查看官方来源、公告修订规则、数据口径与仍未公开的信息。</p>
          <span className="text-link" aria-hidden="true">
            阅读核验说明 <ArrowRight size={16} />
          </span>
        </article>
      </section>
    </main>
  );
}
