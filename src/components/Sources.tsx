import { ArrowRight, ExternalLink, FileCheck2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { makeHash } from '../lib/router';
import type { SeasonDataset, View } from '../types';

export function Sources({
  season,
  onNavigate,
}: {
  season: SeasonDataset;
  onNavigate: (view: View) => void;
}) {
  const { effects, equipment, heroes, meta, players, talents } = season;
  const patch = meta.latestPatch;
  const sources = [
    {
      name: '王者万象棋官方网站',
      url: 'https://wxq.qq.com/cp/a20260707sfgw/index.html',
      label: '官方 / 基础图鉴',
      text: '棋手、英雄、天赋、装备与效果牌卡面及技能原文；静态图鉴可能滞后于正式服公告。',
    },
    {
      name: '官方资讯与版本公告',
      url: 'https://wxq.qq.com/cp/a20260707sfgw/newslist.html',
      label: '官方 / 当前版本',
      text: '判断当前正式服版本与公告修订的首要来源；标题含“体验服”的内容不会混入本站。',
    },
    {
      name: '官方新手指引',
      url: 'https://wxq.qq.com/cp/a202609xszy/',
      label: '官方 / 基础规则',
      text: '6 棋手、60 初始生命、天赋选择、能量获取、英雄合成与竞拍规则。',
    },
    {
      name: '万象棋知识站',
      url: 'https://wzwxq.com/',
      label: '玩家 / 结构化补充',
      text: '用于整理公开官方图鉴、成长字段与关联卡，并提供公告溯源；不是腾讯官方站点。',
    },
  ];

  const ledger = [
    { items: heroes, label: '英雄' },
    { items: players, label: '棋手' },
    { items: talents, label: '天赋' },
    { items: equipment, label: '装备' },
    { items: effects, label: '效果牌' },
  ];

  return (
    <main className="sources-page page-shell">
      <header className="catalog-heading sources-heading">
        <div>
          <span className="chapter-number" aria-hidden="true">
            07
          </span>
          <div>
            <span className="eyebrow">METHODOLOGY / EVIDENCE</span>
            <h1 tabIndex={-1}>来源与核验</h1>
          </div>
        </div>
        <p>
          准确不意味着假装无所不知。
          <br />
          知道数据来自哪里，也知道哪里仍待确认。
        </p>
      </header>

      <section className="evidence-banner">
        <ShieldCheck size={32} aria-hidden="true" />
        <div>
          <span className="eyebrow">CURRENT DATASET</span>
          <h2>
            {meta.label} · {meta.currentPatch}
          </h2>
          <p>
            本站核验日期 {meta.verifiedAt}，共 {meta.totalCount} 条索引。最新正式服公告为{' '}
            {patch?.sourceUpdate.date ?? meta.patchDate} 发布的 {patch?.version ?? meta.currentPatch}。
          </p>
        </div>
        <span className="verification-seal" aria-hidden="true">
          已核
          <br />
          来源
        </span>
      </section>

      <section className="source-list" aria-label="主要参考来源">
        {sources.map((source, index) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
            <span className="source-number" aria-hidden="true">
              0{index + 1}
            </span>
            <div>
              <span className="eyebrow">{source.label}</span>
              <h2>{source.name}</h2>
              <p>{source.text}</p>
            </div>
            <ExternalLink size={20} aria-hidden="true" />
          </a>
        ))}
      </section>

      <div className="sources-columns">
        <section className="method-panel">
          <FileCheck2 size={25} aria-hidden="true" />
          <span className="eyebrow">READING GUIDE</span>
          <h2>如何理解条目徽标</h2>
          <dl>
            <div>
              <dt>当前收录</dt>
              <dd>当前公开图鉴中可见的正式服条目，不代表本站独立完成了端内实测。</dd>
            </div>
            <div>
              <dt>公告修订</dt>
              <dd>已叠加正式服公告；公告文字优先于尚未更新的静态卡面，并附公告编号。</dd>
            </div>
            <div>
              <dt>暂下架 / 历史待核验</dt>
              <dd>保留作资料索引，默认筛选不会混入当前历史待核验条目。</dd>
            </div>
            <div>
              <dt>玩家机制解读</dt>
              <dd>知识站整理的机制线索，不等同于官方描述；不会伪装成确定结论。</dd>
            </div>
          </dl>
        </section>

        <section className="method-panel caution">
          <ShieldAlert size={25} aria-hidden="true" />
          <span className="eyebrow">KNOWN LIMITS</span>
          <h2>公开资料的边界</h2>
          <ul>
            <li>
              官方网页未公开完整逐级升级能量表；机制页的 7 / 13 / 17 / 23 / 27 为社区汇总，需以端内按钮为准。
            </li>
            <li>随机概率、部分隐藏结算与统一“阵营羁绊总表”没有完整官方公开数值，本站不作猜测。</li>
            <li>官网安装包版本不等于当前正式服版本；素材文件日期也不等于数据版本。</li>
            <li>只收录 environment=live 的正式服赛季；体验服测试集独立存放，不进入对应赛季页面。</li>
          </ul>
        </section>
      </div>

      <section className="dataset-ledger">
        <div>
          <span className="eyebrow">DATASET LEDGER</span>
          <h2>本数据集实际收录</h2>
          <p>统计直接来自 {meta.label} 的结构化文件，不照抄第三方首页口径；历史条目单独计算。</p>
        </div>
        <div className="dataset-ledger-counts">
          {ledger.map(({ items, label }) => (
            <span key={label}>
              <strong>{items.length}</strong>
              <small>{label}</small>
            </span>
          ))}
        </div>
      </section>

      <section className="correction-cta">
        <div>
          <span className="eyebrow">CORRECTION</span>
          <h2>发现版本差异？</h2>
          <p>
            优先在当前正式服端内百科、卡面与升级按钮复核，再对照官方公告。不要把体验服截图或其他自走棋产品的数据作为依据。
          </p>
        </div>
        <a
          className="primary-button"
          href={makeHash('mechanics', { season: meta.id })}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
              return;
            }
            event.preventDefault();
            onNavigate('mechanics');
          }}
        >
          查看玩法与待复核项 <ArrowRight size={17} aria-hidden="true" />
        </a>
      </section>
    </main>
  );
}
