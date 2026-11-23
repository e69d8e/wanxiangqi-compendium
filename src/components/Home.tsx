import { ArrowRight, BookOpen, Boxes, Search, ShieldCheck, Sparkles, Swords, Users, WandSparkles } from 'lucide-react';
import type { CatalogItem, SeasonDataset, View } from '../types';
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
  const named = featuredNames.map((name) => heroes.find((hero) => hero.name === name)).filter((item): item is CatalogItem => Boolean(item));
  const featured = [...named, ...heroes.filter((hero) => !named.includes(hero)).slice(0, Math.max(0, 5 - named.length))];
  const availableFactions = [...new Set(heroes.map((hero) => hero.faction).filter((faction): faction is string => Boolean(faction)))];
  const factions = [...preferredFactions.filter((faction) => availableFactions.includes(faction)), ...availableFactions.filter((faction) => !preferredFactions.includes(faction))].slice(0, 6);
  const maxFactionCount = Math.max(1, ...factions.map((faction) => heroes.filter((hero) => hero.faction === faction).length));
  const patch = meta.latestPatch;
  const patchPlayer = patch?.playerName ? players.find((player) => player.name === patch.playerName) : undefined;
  const categories = [
    { view: 'heroes' as View, icon: Swords, index: '01', title: '英雄棋谱', count: heroes.length, note: '阵营 · 技能 · 觉醒 · 成长' },
    { view: 'players' as View, icon: Users, index: '02', title: '棋手档案', count: players.length, note: '技能 · 秘技 · 专属 · 关联卡' },
    { view: 'talents' as View, icon: Sparkles, index: '03', title: '天赋总览', count: talents.length, note: '品阶 · 天赋包 · 投放阶段' },
    { view: 'equipment' as View, icon: Boxes, index: '04', title: '装备手册', count: equipment.length, note: '铸造 · 类型 · 关联装备' },
    { view: 'effects' as View, icon: WandSparkles, index: '05', title: '效果牌集', count: effects.length, note: '阵营 · 品阶 · 获取方式' },
  ];

  return <main className="home-page">
    <section className="home-hero page-shell">
      <div className="hero-copy">
        <div className="season-stamp"><span /> {meta.season} <b>{meta.currentPatch}</b></div>
        <span className="eyebrow">THE WANXIANG ARCHIVE · 2026</span>
        <h1>万象<span>棋谱</span></h1>
        <p className="hero-lead">纵横万象，有据可循。<br />一座为棋手而生的<span>可检索棋盘档案馆</span>。</p>
        <div className="hero-actions"><button className="primary-button" onClick={() => onNavigate('heroes')}>进入英雄图鉴 <ArrowRight size={17} /></button><button className="search-cta" onClick={onSearch}><Search size={18} /> 全站搜索 <kbd>⌘ K</kbd></button></div>
        <div className="hero-trust"><ShieldCheck size={16} /><span>公告修订优先 · 逐条来源回溯 · 社区数据明确标识</span></div>
      </div>
      <div className="hero-board" aria-label="精选英雄卡牌">
        <div className="board-coordinates top">A　B　C　D　E　F</div><div className="board-coordinates side">1<br />2<br />3<br />4<br />5<br />6</div>
        <div className="board-sigil"><span>万</span><i /></div>
        {featured.map((item, index) => <button key={item.id} className={`hero-card hero-card-${index + 1}`} onClick={() => onSelect(item)} aria-label={`查看${item.name}`}><CardImage item={item} eager /><span><b>{item.name}</b><small>{item.faction} · {item.quality}阶</small></span></button>)}
        <span className="board-caption">FIG. 01 — 万象棋阵</span>
      </div>
    </section>

    <section className="ledger-strip"><div className="page-shell"><div><strong>{meta.totalCount}</strong><span>档案总条目<small>含历史与补充收录</small></span></div><div><strong>{heroes.length}</strong><span>英雄棋子<small>六大阵营分类</small></span></div><div><strong>{players.length}</strong><span>棋手档案<small>技能与秘技全录</small></span></div><div><strong>{talents.length}</strong><span>天赋记录<small>三阶分类检索</small></span></div><div className="ledger-date"><span>资料核验日</span><strong>{meta.verifiedAt}</strong></div></div></section>

    <section className="home-section page-shell category-section">
      <div className="section-heading"><div><span className="eyebrow">EXPLORE THE ARCHIVE</span><h2>五类档案，各就其位</h2></div><p>不是排行榜，不猜隐藏概率。<br />只把每张牌的来历与效果讲清楚。</p></div>
      <div className="category-grid">{categories.map(({ icon: Icon, ...category }) => <button key={category.view} onClick={() => onNavigate(category.view)}><span className="category-index">{category.index}</span><Icon size={25} strokeWidth={1.4} /><div><h3>{category.title}</h3><p>{category.note}</p></div><strong>{category.count}<small>条</small></strong><ArrowRight className="category-arrow" size={19} /></button>)}</div>
    </section>

    <section className="home-section page-shell faction-section">
      <div className="section-heading"><div><span className="eyebrow">{factions.length === 6 ? 'SIX' : 'MULTI'} FACTIONS / {meta.shortLabel}</span><h2>{factions.length === 6 ? '六方势力，一局万象' : '各方势力，一局万象'}</h2></div><p>阵营是英雄分类与机制线索，<br />不直接等同于传统自走棋的羁绊总表。</p></div>
      <div className="faction-ledger">{factions.map((faction) => {
        const count = heroes.filter((hero) => hero.faction === faction).length;
        return <button key={faction} onClick={() => onNavigate('heroes', { filter: faction })}><span className="faction-mark">{faction.replace('阵营', '').slice(0, 1)}</span><div><h3>{faction}</h3><span>{count} 名英雄</span></div><div className="faction-bar"><i style={{ width: `${Math.max(8, count / maxFactionCount * 100)}%` }} /></div><ArrowRight size={17} /></button>;
      })}</div>
    </section>

    {patch && <section className="page-shell patch-section">
      <div className="patch-label"><span>最新校勘</span><strong>PATCH<br />{meta.currentPatch}</strong><small>{meta.patchDate}</small></div>
      <div className="patch-copy"><span className="eyebrow">OFFICIAL UPDATE / {patch.sourceUpdate.id}</span><h2>{patch.title}</h2><p>{patch.changes[0]?.description}</p>{patchPlayer && <button onClick={() => onSelect(patchPlayer)}>查看棋手修订档案 <ArrowRight size={16} /></button>}</div>
      <div className="patch-aside"><ShieldCheck size={24} /><strong>公告优先于旧卡面</strong><p>静态图鉴可能尚未同步热更。所有公告修订均保留来源编号与日期。</p></div>
    </section>}

    <section className="home-section page-shell tools-section">
      <button className="energy-teaser" onClick={() => onNavigate('mechanics')}><div><span className="eyebrow">RULES & ENERGY</span><h2>每一步升级，<br />都算得明白。</h2><p>基础规则、关键词词典、升级能量阶梯与目标等级计算器。</p><span className="text-link">翻阅玩法机制 <ArrowRight size={16} /></span></div><div className="energy-steps">{[7, 13, 17, 23, 27].map((cost, index) => <div key={cost} style={{ height: `${38 + index * 18}px` }}><span>LV.{index + 2}</span><strong>{cost}</strong><small>能量</small></div>)}<em>社区汇总 · 待端内复核</em></div></button>
      <button className="sources-teaser" onClick={() => onNavigate('sources')}><BookOpen size={28} strokeWidth={1.3} /><span className="eyebrow">EVIDENCE FIRST</span><h2>资料可信，<br />因为边界清楚。</h2><p>查看官方来源、公告修订规则、数据口径与仍未公开的信息。</p><span className="text-link">阅读核验说明 <ArrowRight size={16} /></span></button>
    </section>
  </main>;
}
