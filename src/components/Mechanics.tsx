import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Calculator, ExternalLink, ScrollText } from 'lucide-react';
import { coreRules, glossary, officialGuideUrl, upgradeCosts } from '../data/mechanics';
import type { SeasonDataset } from '../types';

export function Mechanics({ season }: { season: SeasonDataset }) {
  const latestPatch = season.meta.latestPatch;
  const [from, setFrom] = useState(1);
  const [target, setTarget] = useState(6);
  const needed = useMemo(() => upgradeCosts.filter((step) => step.from >= from && step.to <= target).reduce((sum, step) => sum + step.cost, 0), [from, target]);
  const total = upgradeCosts.reduce((sum, step) => sum + step.cost, 0);

  return <main className="mechanics-page page-shell">
    <header className="catalog-heading"><div><span className="chapter-number">06</span><div><span className="eyebrow">RULEBOOK / ENERGY · {season.meta.shortLabel}</span><h1>玩法机制</h1></div></div><p>从第一位棋手入场，到最后一次出价。<br />基础规则依据官方指引，社区数值单独标记。</p></header>

    <section className="rules-layout">
      <div className="rules-intro"><span className="eyebrow">OFFICIAL BASICS</span><h2>开局之前，<br />先读懂棋盘。</h2><p>以下规则整理自官方「万象启航」新手指引。官网未标注统一更新日期，若与当前端内规则不同，请以正式服端内说明和最新公告为准。</p><a href={officialGuideUrl} target="_blank" rel="noreferrer">打开官方新手指引 <ExternalLink size={15} /></a></div>
      <div className="rule-grid">{coreRules.map((rule, index) => <article key={rule.title}><span>{String(index + 1).padStart(2, '0')}</span><small>官方规则</small><h3>{rule.title}</h3><p>{rule.text}</p></article>)}</div>
    </section>

    <section className="energy-section">
      <div className="energy-heading"><div><span className="eyebrow">LEVEL UP / ENERGY</span><h2>棋手升级能量</h2></div><span className="community-badge"><AlertTriangle size={15} /> 社区汇总 · 待端内复核</span></div>
      <div className="energy-content">
        <div className="energy-table"><div className="energy-table-head"><span>等级路径</span><span>所需能量</span><span>累计（从 1 级）</span></div>{upgradeCosts.map((step) => <div className="energy-row" key={step.from}><span><b>LV.{step.from}</b><ArrowRight size={16} /><strong>LV.{step.to}</strong></span><strong>{step.cost}</strong><span>{upgradeCosts.filter((item) => item.to <= step.to).reduce((sum, item) => sum + item.cost, 0)}</span></div>)}<div className="energy-total"><span>1 级升至 6 级</span><strong>{total} <small>能量</small></strong></div></div>
        <div className="energy-calculator"><Calculator size={25} /><span className="eyebrow">ENERGY PLANNER</span><h3>升级能量计算器</h3><div className="calculator-selects"><label>当前等级<select value={from} onChange={(event) => { const value = Number(event.target.value); setFrom(value); if (target <= value) setTarget(value + 1); }}>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level} 级</option>)}</select></label><ArrowRight size={18} /><label>目标等级<select value={target} onChange={(event) => setTarget(Number(event.target.value))}>{[2, 3, 4, 5, 6].map((level) => <option key={level} value={level} disabled={level <= from}>{level} 级</option>)}</select></label></div><div className="calculator-result"><span>预计需要</span><strong>{needed}</strong><small>点能量</small></div><p>结果仅按社区汇总表计算，不包含棋手技能、天赋或效果牌提供的能量与费用变化。</p></div>
      </div>
      <div className="energy-disclaimer"><AlertTriangle size={19} /><p><strong>为什么标记“待复核”？</strong>官方指引只明确“升级按钮处即为当前升级所需能量”，未公开完整逐级数值表。上述费用来自内容相近的二手攻略，不能视为独立官方证明；实际对局请以端内按钮为准。</p><div><a href="https://shouyou.3dmgame.com/gl/639843.html" target="_blank" rel="noreferrer">社区来源 A <ExternalLink size={12} /></a><a href="https://www.wandoujia.com/strategy/18193987052139386997.html" target="_blank" rel="noreferrer">社区来源 B <ExternalLink size={12} /></a></div></div>
    </section>

    {latestPatch && <section className="patch-mechanics"><div><span className="eyebrow">LATEST OFFICIAL PATCH / {latestPatch.date}</span><h2>{latestPatch.version} · {latestPatch.title}</h2><p>最新正式服公告中与图鉴直接相关的修订：</p></div><div className="before-after"><article><span>调整前</span><p>{latestPatch.before ?? '公告未提供调整前原文'}</p></article><ArrowRight size={22} /><article><span>{latestPatch.changes[0]?.label ?? '调整后'}</span><p>{latestPatch.changes[0]?.description ?? '公告未提供调整后文本'}</p></article></div><a href={`https://wxq.qq.com/cp/a20260707sfgw/newsdetail.html?newsid=${latestPatch.sourceUpdate.id}`} target="_blank" rel="noreferrer">查看官方公告 {latestPatch.sourceUpdate.id} <ExternalLink size={14} /></a></section>}

    <section className="glossary-section"><div className="section-heading"><div><span className="eyebrow">KEYWORD DICTIONARY</span><h2>关键词词典</h2></div><p>只收录能从官方规则或卡牌原文明确解释的术语，<br />不把推测写成机制。</p></div><div className="glossary-grid">{glossary.map((entry, index) => <article key={entry.term}><span>{String(index + 1).padStart(2, '0')}</span><ScrollText size={18} /><h3>{entry.term}</h3><p>{entry.definition}</p></article>)}</div></section>
  </main>;
}
