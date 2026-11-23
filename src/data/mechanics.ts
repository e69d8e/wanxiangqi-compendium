export const officialGuideUrl = "https://wxq.qq.com/cp/a202609xszy/";

export const upgradeCosts = [
  { from: 1, to: 2, cost: 7 },
  { from: 2, to: 3, cost: 13 },
  { from: 3, to: 4, cost: 17 },
  { from: 4, to: 5, cost: 23 },
  { from: 5, to: 6, cost: 27 },
] as const;

// 升级能量来自社区攻略，并非当前官方公告逐项确认的数据。
export const verification = "community" as const;
export const sources = [
  "https://shouyou.3dmgame.com/gl/639843.html",
  "https://www.wandoujia.com/strategy/18193987052139386997.html",
] as const;

export const coreRules = [
  {
    id: "match",
    title: "6 名棋手与生命值",
    text: "万象大赛由 6 位棋手同台竞技，每位棋手初始拥有 60 生命值。生命值为 0 时淘汰，存活到最后者获胜。",
    source: officialGuideUrl,
  },
  {
    id: "level-talent",
    title: "升级天赋三选一",
    text: "棋手消耗能量提升等级；每次提升棋手等级，都可以从 3 个天赋中免费选择 1 个。",
    source: officialGuideUrl,
  },
  {
    id: "level-six-exclusive",
    title: "6 级专属天赋",
    text: "棋手升至 6 级后，可领取该棋手的专属天赋，获得对应的强力效果。",
    source: officialGuideUrl,
  },
  {
    id: "hero-level",
    title: "英雄等级",
    text: "英雄上阵时初始等级为 1 级，最高等级为 999 级；打出已在场上的英雄牌会与其合成并提升等级。",
    source: officialGuideUrl,
  },
  {
    id: "hero-card-cost",
    title: "英雄牌消耗",
    text: "购买英雄牌固定消耗 3 能量；效果牌等卡牌的消耗以卡牌右上角标示为准。",
    source: officialGuideUrl,
  },
  {
    id: "sell-energy",
    title: "出售返还能量",
    text: "出售英雄牌获得 1 能量，出售已上阵英雄同样获得 1 能量。",
    source: officialGuideUrl,
  },
  {
    id: "energy-carryover",
    title: "能量累积",
    text: "每个回合固定获得能量，未使用的能量可以累积到下一回合；部分天赋和效果牌也能提供能量。",
    source: officialGuideUrl,
  },
  {
    id: "auction-bidding",
    title: "竞拍与出价",
    text: "固定回合会共同进入竞拍环节，可选择英雄牌、效果牌等拍品出价。出价无上限，最高价者获得拍品；同价时先出价者获得，竞拍失败不消耗能量。",
    source: officialGuideUrl,
  },
  {
    id: "auction-dividend",
    title: "竞拍分红",
    text: "竞拍时每位玩家的有效出价会进入分红池；竞拍结束后分配给所有玩家，生命值越低的玩家获得的分红比例越大。",
    source: officialGuideUrl,
  },
] as const;

export const glossary = [
  {
    term: "棋手",
    definition: "参与万象大赛的玩家角色，拥有各自的技能、秘技任务和专属天赋。",
  },
  {
    term: "生命值",
    definition: "棋手的生存资源，初始为 60；降为 0 时会被淘汰。",
  },
  {
    term: "能量",
    definition: "购买卡牌、提升棋手等级和参与竞拍所使用的资源，可跨回合累积。",
  },
  {
    term: "英雄牌",
    definition: "用于在战场生成或合成英雄的卡牌，从商店购买时固定消耗 3 能量。",
  },
  {
    term: "合成",
    definition: "打出已在场上的同名英雄牌，使其与场上英雄合成并提升等级。",
  },
  {
    term: "英雄等级",
    definition: "英雄的养成等级，上阵初始为 1 级，最高可达到 999 级。",
  },
  {
    term: "棋手等级",
    definition: "消耗能量提升的等级；升级可选择天赋，部分等级还会增加上阵人数。",
  },
  {
    term: "天赋",
    definition: "棋手升级时从 3 个候选项中免费选择 1 个的强化效果。",
  },
  {
    term: "天赋品阶",
    definition: "天赋分为 1 阶（铜）、2 阶（银）、3 阶（金），品阶越高效果越强。",
  },
  {
    term: "专属天赋",
    definition: "棋手升至 6 级后可领取的专属强化，不同棋手对应不同效果。",
  },
  {
    term: "秘技任务",
    definition: "每位棋手各自拥有的任务，完成后可以获得对应的秘技牌奖励。",
  },
  {
    term: "秘技牌",
    definition: "完成棋手秘技任务后获得的卡牌，具体效果以该牌描述为准。",
  },
  {
    term: "装备牌",
    definition: "可穿戴给英雄并提供属性或特殊效果的卡牌，穿戴限制以卡牌描述为准。",
  },
  {
    term: "效果牌",
    definition: "提供找牌、能量、等级或其他战术效果的卡牌，购买消耗以卡面标示为准。",
  },
  {
    term: "竞拍",
    definition: "固定回合开启的共同竞价环节，出价最高者获得拍品，同价时先出价者优先。",
  },
  {
    term: "分红池",
    definition: "由竞拍中每位玩家的有效出价汇集而成，结束后按生命值情况分配给所有玩家。",
  },
  {
    term: "阵营",
    definition: "英雄所属的玩法分类，不同阵营具有不同的卡牌效果和阵容特色。",
  },
  {
    term: "上阵人数",
    definition: "允许同时部署到战场的英雄数量；棋手升至特定等级时可增加上阵人数。",
  },
] as const;
