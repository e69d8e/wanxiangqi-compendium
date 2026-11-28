import { useId, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Calculator, ExternalLink, ScrollText } from 'lucide-react';
import {
  coreRules,
  glossary,
  keywordSourceLinks,
  officialGuideUrl,
  relatedMechanicGlossary,
  triggerKeywordGlossary,
  upgradeCosts,
} from '../data/mechanics';
import type { SeasonDataset } from '../types';

export function Mechanics({ season }: { season: SeasonDataset }) {
  const latestPatch = season.meta.latestPatch;
  const [from, setFrom] = useState(1);
  const [target, setTarget] = useState(6);
  const energyCaptionId = useId();
  const fromId = useId();
  const targetId = useId();

  const needed = useMemo(
    () =>
      upgradeCosts
        .filter((step) => step.from >= from && step.to <= target)
        .reduce((sum, step) => sum + step.cost, 0),
    [from, target],
  );
  const total = upgradeCosts.reduce((sum, step) => sum + step.cost, 0);

  return (
    <main className="mechanics-page page-shell">
      <header className="catalog-heading">
        <div>
          <span className="chapter-number" aria-hidden="true">
            06
          </span>
          <div>
            <span className="eyebrow">RULEBOOK / ENERGY · {season.meta.shortLabel}</span>
            <h1 tabIndex={-1}>玩法机制</h1>
          </div>
        </div>
        <p>
          从第一位棋手入场，到最后一次出价。
          <br />
          基础规则依据官方指引，社区数值单独标记。
        </p>
      </header>

      <section className="rules-layout">
        <div className="rules-intro">
          <span className="eyebrow">OFFICIAL BASICS</span>
          <h2>
            开局之前，
            <br />
            先读懂棋盘。
          </h2>
          <p>
            以下规则整理自官方「万象启航」新手指引。官网未标注统一更新日期，若与当前端内规则不同，请以正式服端内说明和最新公告为准。
          </p>
          <a href={officialGuideUrl} target="_blank" rel="noreferrer">
            打开官方新手指引 <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
        <div className="rule-grid">
          {coreRules.map((rule, index) => (
            <article key={rule.id}>
              <span className="rule-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <small>官方规则</small>
              <h3>{rule.title}</h3>
              <p>{rule.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="energy-section">
        <div className="energy-heading">
          <div>
            <span className="eyebrow">LEVEL UP / ENERGY</span>
            <h2>棋手升级能量</h2>
          </div>
          <span className="community-badge">
            <AlertTriangle size={15} aria-hidden="true" /> 社区汇总 · 待端内复核
          </span>
        </div>

        <div className="energy-content">
          <div
            className="energy-table-wrap"
            tabIndex={0}
            role="region"
            aria-labelledby={energyCaptionId}
          >
            <table className="energy-data-table">
              <caption id={energyCaptionId}>棋手 1 级至 6 级升级所需能量与累计（社区汇总）</caption>
              <thead>
                <tr>
                  <th scope="col">等级路径</th>
                  <th scope="col">所需能量</th>
                  <th scope="col">累计（从 1 级）</th>
                </tr>
              </thead>
              <tbody>
                {upgradeCosts.map((step) => {
                  const cumulative = upgradeCosts
                    .filter((item) => item.to <= step.to)
                    .reduce((sum, item) => sum + item.cost, 0);
                  return (
                    <tr key={step.from}>
                      <th scope="row">
                        <span className="energy-path">
                          <b>LV.{step.from}</b>
                          <ArrowRight size={15} aria-hidden="true" />
                          <span>LV.{step.to}</span>
                        </span>
                      </th>
                      <td className="energy-cost-cell">{step.cost}</td>
                      <td className="energy-cum-cell">{cumulative}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">1 级升至 6 级</th>
                  <td colSpan={2}>
                    {total} <small>能量</small>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="energy-calculator">
            <Calculator size={24} aria-hidden="true" />
            <span className="eyebrow">ENERGY PLANNER</span>
            <h3>升级能量计算器</h3>
            <div className="calculator-selects">
              <label htmlFor={fromId}>
                当前等级
                <select
                  id={fromId}
                  name="current-level"
                  className="themed-select"
                  value={from}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setFrom(value);
                    if (target <= value) setTarget(value + 1);
                  }}
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      {level} 级
                    </option>
                  ))}
                </select>
              </label>
              <ArrowRight size={18} aria-hidden="true" />
              <label htmlFor={targetId}>
                目标等级
                <select
                  id={targetId}
                  name="target-level"
                  className="themed-select"
                  value={target}
                  onChange={(event) => setTarget(Number(event.target.value))}
                >
                  {[2, 3, 4, 5, 6].map((level) => (
                    <option key={level} value={level} disabled={level <= from}>
                      {level} 级
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <output
              className="calculator-result"
              htmlFor={`${fromId} ${targetId}`}
              aria-live="polite"
            >
              <span>预计需要</span>
              <strong>{needed}</strong>
              <small>点能量</small>
            </output>
            <p>结果仅按社区汇总表计算，不包含棋手技能、天赋或效果牌提供的能量与费用变化。</p>
          </div>
        </div>

        <div className="energy-disclaimer">
          <AlertTriangle size={19} aria-hidden="true" />
          <p>
            <strong>为什么标记“待复核”？</strong>
            官方指引只明确“升级按钮处即为当前升级所需能量”，未公开完整逐级数值表。上述费用来自内容相近的二手攻略，不能视为独立官方证明；实际对局请以端内按钮为准。
          </p>
          <div>
            <a href="https://shouyou.3dmgame.com/gl/639843.html" target="_blank" rel="noreferrer">
              社区来源 A <ExternalLink size={12} aria-hidden="true" />
            </a>
            <a
              href="https://www.wandoujia.com/strategy/18193987052139386997.html"
              target="_blank"
              rel="noreferrer"
            >
              社区来源 B <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {latestPatch && (
        <section className="patch-mechanics">
          <div>
            <span className="eyebrow">LATEST OFFICIAL PATCH / {latestPatch.date}</span>
            <h2>
              {latestPatch.version} · {latestPatch.title}
            </h2>
            <p>最新正式服公告摘要与修订要点：</p>
          </div>
          {latestPatch.before ? (
            <div className="before-after">
              <article>
                <span>调整前</span>
                <p>{latestPatch.before}</p>
              </article>
              <ArrowRight size={22} aria-hidden="true" />
              <article>
                <span>{latestPatch.changes[0]?.label ?? '调整后'}</span>
                <p>{latestPatch.changes[0]?.description ?? '公告未提供调整后文本'}</p>
              </article>
            </div>
          ) : (
            <div className="before-after">
              {latestPatch.changes.map((change) => (
                <article key={change.label}>
                  <span>{change.label}</span>
                  <p>{change.description}</p>
                </article>
              ))}
            </div>
          )}
          <a
            href={`https://wxq.qq.com/cp/a20260707sfgw/newsdetail.html?newsid=${latestPatch.sourceUpdate.id}&tab=2`}
            target="_blank"
            rel="noreferrer"
          >
            查看官方公告 {latestPatch.sourceUpdate.id} <ExternalLink size={14} aria-hidden="true" />
          </a>
        </section>
      )}

      <section className="glossary-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">KEYWORD DICTIONARY</span>
            <h2>关键词词典</h2>
          </div>
          <p>
            从「登场」到「转瞬」，
            <br />
            把卡面里最常被略过的规则一次讲清。
          </p>
        </div>

        <div className="glossary-groups">
          <div className="glossary-group">
            <div className="glossary-group-head">
              <div>
                <span className="eyebrow">BASIC TERMS</span>
                <h3>
                  基础术语<span>{glossary.length} 条</span>
                </h3>
              </div>
              <p>只列官方指引或卡牌原文可直接解释的术语，不把推测写成机制。</p>
            </div>
            <div className="glossary-grid">
              {glossary.map((entry, index) => (
                <article key={entry.term}>
                  <span className="glossary-index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <ScrollText size={18} aria-hidden="true" />
                  <h4>{entry.term}</h4>
                  <p>{entry.definition}</p>
                </article>
              ))}
            </div>
          </div>

          <KeywordGroup
            eyebrow="CARD TRIGGER KEYWORDS"
            title="触发关键词"
            description="英雄牌面直接标注的触发词；「合成」已归入基础术语。"
            entries={triggerKeywordGlossary}
          />

          <KeywordGroup
            eyebrow="RELATED MECHANICS"
            title="相关机制术语"
            description="卡面与攻略中频繁出现、影响等级与结算的机制。"
            entries={relatedMechanicGlossary}
          />
        </div>

        <div className="glossary-note">
          <AlertTriangle size={17} aria-hidden="true" />
          <div>
            <p>
              <strong>证据说明：</strong>
              关键词名称与牌面效果可在官方卡牌原文中核对；官方尚未发布统一关键词释义，触发时机与结算细节由多篇社区攻略交叉归纳，统一标记为「待端内复核」。
            </p>
            <div className="glossary-sources">
              {keywordSourceLinks.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                  {source.label} <ExternalLink size={12} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function KeywordGroup({
  eyebrow,
  title,
  description,
  entries,
}: {
  eyebrow: string;
  title: string;
  description: string;
  entries: readonly { term: string; timing: string; definition: string; note?: string }[];
}) {
  return (
    <div className="glossary-group">
      <div className="glossary-group-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3>
            {title}
            <span>{entries.length} 条</span>
          </h3>
        </div>
        <p>{description}</p>
      </div>
      <div className="glossary-grid keyword-grid">
        {entries.map((entry, index) => (
          <article key={entry.term}>
            <span className="glossary-index" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <ScrollText size={18} aria-hidden="true" />
            <small className="keyword-timing">{entry.timing}</small>
            <h4>{entry.term}</h4>
            <p>{entry.definition}</p>
            {entry.note && <p className="keyword-note">{entry.note}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
