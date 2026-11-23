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

// 关键词名称与牌面效果可在官方卡牌原文中核对；官方尚未发布统一释义，
// 触发时机与结算细节由多篇社区攻略交叉归纳，站内统一标记为“待端内复核”。
export const triggerKeywordGlossary = [
  {
    term: "登场",
    timing: "打出时",
    definition: "英雄牌被打出、在战场生成该英雄时触发；卡面「登场：」之后即为对应效果。",
    note: "同名英雄已在场时，重复打出并触发合成也会再次触发登场。",
  },
  {
    term: "夺取",
    timing: "登场时",
    definition: "携带该关键词的英雄登场时，夺取周围 1 格内随机 1 名己方英雄的等级，最多 10 级，且不包含临时等级。",
    note: "效果牌「夺取之术」为指定目标夺取最近 1 名己方英雄，范围结算与英雄牌不同。",
  },
  {
    term: "整备",
    timing: "回合开始",
    definition: "回合开始时触发；卡面「整备：」之后即为对应效果。",
    note: "本回合刚打出的整备英雄，要到下回合开始才会首次触发。",
  },
  {
    term: "开团",
    timing: "战斗开始",
    definition: "战斗开始时触发；卡面「开团：」之后即为对应效果。",
    note: "开团效果可能引发登场、整备等连锁结算，具体顺序以端内战斗为准。",
  },
  {
    term: "闪现",
    timing: "战斗开始",
    definition: "战斗开始时，英雄跳跃至敌方战场的镜像位置。",
    note: "落点与双方站位有关，以端内实际战斗画面为准。",
  },
  {
    term: "图腾",
    timing: "常驻",
    definition: "大河流域阵营专属的召唤单位，存活时提供特殊效果；部分英雄会与图腾的数量或等级联动。",
    note: "图腾被摧毁或离场后，依赖它的效果会随之失效。",
  },
  {
    term: "牺牲",
    timing: "阵亡时",
    definition: "英雄阵亡时触发；卡面「牺牲：」之后即为对应效果。",
    note: "一场战斗中可多次触发，配合复生能反复结算。",
  },
  {
    term: "复生",
    timing: "阵亡后",
    definition: "英雄阵亡后复活，并恢复 50% 最大生命值；单个回合内，每名英雄最多复活 10 次。",
    note: "复活次数与复活后的生命比例可被装备、天赋或英雄效果改变。",
  },
  {
    term: "退场",
    timing: "出售时",
    definition: "场上已上阵的该英雄被出售时触发；卡面「退场：」之后即为对应效果。",
    note: "退场结算针对已上阵英雄，手牌中的同名英雄牌本身没有退场效果。",
  },
  {
    term: "凯旋",
    timing: "胜利时",
    definition: "英雄上阵期间，己方战斗胜利时触发；卡面「凯旋：」之后即为对应效果。",
    note: "部分凯旋效果会在下一回合准备阶段结算。",
  },
  {
    term: "败阵",
    timing: "失败时",
    definition: "英雄上阵期间，己方战斗失败时触发；卡面「败阵：」之后即为对应效果。",
    note: "梦奇的败阵会提升英雄兑换券的品阶。",
  },
] as const;

export const relatedMechanicGlossary = [
  {
    term: "完美复生",
    timing: "阵亡后",
    definition: "复生的强化形态：英雄阵亡后以 100% 生命值满血复活。",
    note: "铠觉醒后自带完美复生；太乙真人觉醒后可使距离最近的 1 名英雄获得完美复生；部分天赋也能提供。",
  },
  {
    term: "觉醒",
    timing: "合成 3 次",
    definition: "单个英雄累计完成 3 次合成（共打出 4 张同名英雄牌）后进入觉醒形态，技能与数值获得强化。",
    note: "觉醒进度按单个英雄单独计算；觉醒后该英雄以觉醒形态回到手牌，可再次上阵。",
  },
  {
    term: "临时等级",
    timing: "战斗结束清除",
    definition: "只在当前回合或战斗内有效的等级加成，战斗结束时会被清除，不计入英雄的永久等级。",
    note: "夺取等效果会明确排除临时等级；部分效果可将临时等级转化为永久等级。",
  },
  {
    term: "永久等级",
    timing: "跨回合保留",
    definition: "不会随战斗结束清除、可以跨回合保留的等级；英雄的基础等级与卡面标注「永久+」的成长都属于永久等级。",
    note: "临时等级与永久等级分开计算，卡面会分别标注。",
  },
  {
    term: "阿科米亚核心",
    timing: "战斗开始",
    definition: "日落海阵营的核心机制：战斗开始时，核心等级会以临时等级的形式平均分配给己方【日落海】英雄，单名英雄的分配上限为 50%。",
    note: "核心拥有独立等级，马可波罗等英雄的登场效果可以直接提升核心等级。",
  },
  {
    term: "转瞬",
    timing: "本回合限定",
    definition: "卡牌标签：带转瞬的牌只在本回合准备阶段可用；进入战斗阶段时仍未打出或使用的转瞬牌会直接消失，不返还能量，也无法出售换取能量。",
    note: "消失的是牌本身；效果牌提供的增益按卡面持续，加等级通常永久，护盾、法力上限等会标注本回合。",
  },
  {
    term: "古币",
    timing: "本回合限定",
    definition: "河洛阵营的转瞬效果牌：古币指定 1 名【河洛】英雄等级 +2，精致古币 +4。",
    note: "古币必须当回合用掉，留在手里会在进入战斗阶段时消失。",
  },
] as const;

export const keywordGlossary = [...triggerKeywordGlossary, ...relatedMechanicGlossary] as const;

export const keywordSourceLinks = [
  { label: "9K9K · 14 个关键词汇总", url: "https://m.9k9k.com/gonglue/327372.html" },
  { label: "9game · 关键词触发时机", url: "https://a.9game.cn/wzwxq/12118039.html" },
  { label: "18183 · 转瞬机制", url: "https://m.18183.com/gonglue/202609/l9u6e8mi.html" },
  { label: "9game · 复生机制", url: "https://www.9game.cn/wzwxq/12118027.html" },
  { label: "9game · 觉醒机制", url: "https://www.9game.cn/wangzhewanxiangqi/12080801.html" },
] as const;
