export type Kind = 'hero' | 'player' | 'talent' | 'equipment' | 'effect';
export type View = 'home' | 'heroes' | 'players' | 'talents' | 'equipment' | 'effects' | 'mechanics' | 'sources';

export interface SourceUpdate {
  id: string;
  date: string;
}

export interface RelatedCard {
  id?: string | number;
  name?: string;
  relation?: string;
  entityType?: string;
  descriptionPlain?: string;
  original?: string;
  image?: string;
  referenceId?: string;
  kind?: string;
}

export interface SkillSection {
  type: string;
  name: string;
  text: string;
  cardId?: number;
  currentOfficial?: boolean;
  sourceUpdate?: SourceUpdate;
}

export interface PlayerCard {
  id: number;
  name: string;
  description: string;
  rawDescription?: string;
  path?: string;
  sourceUrl?: string;
  shopBuyCost?: { Type?: number; Count?: number };
  previewCardIDs?: number[];
  sourceCardIDs?: number[];
  sourceUpdate?: SourceUpdate;
}

export interface CatalogItem {
  kind: Kind;
  id: string;
  rawId?: string;
  name: string;
  faction?: string;
  quality?: number;
  image?: string;
  thumbnail?: string;
  portrait?: string;
  avatar?: string;
  poster?: string;
  localImage: string;
  original?: string;
  formal?: string;
  awakening?: string;
  acquisition?: string;
  version?: string;
  versionStatus?: string;
  temporarilyOffShelf?: boolean;
  sourceUpdate?: SourceUpdate;
  imageStatus?: string;
  caveat?: string;
  evidenceLayer?: string;
  sourceUrl: string;
  officialUrl: string;
  searchText: string;
  subtype?: string;
  equipmentType?: string;
  talentGroup?: string;
  talentStage?: string;
  shopCost?: { type?: number; count?: number };
  officialKeywords?: string[];
  resource?: string[];
  trigger?: string[];
  related?: string[];
  relatedCards?: RelatedCard[];
  derivedCards?: RelatedCard[];
  attackDistance?: number;
  attackStyle?: string;
  rawBaseStats?: Record<string, number>;
  officialSkill?: {
    name: string;
    original: string;
    icon?: string;
    enhancements?: { level: number; text: string }[];
  };
  growth?: {
    template?: string;
    baseProperties?: Record<string, number>;
    levelSnapshots?: Record<string, Record<string, number>>;
    templateReference?: { growth?: string; nodes?: string[] };
  };
  skillSections?: SkillSection[];
  cards?: PlayerCard[];
  lordId?: number;
  skillEvidence?: string;
}

export interface CatalogMeta {
  currentPatch: string;
  patchDate: string;
  verifiedAt: string;
  season: string;
  totalCount: number;
  currentCount: number;
  currentDefinition?: string;
  categories?: Record<string, { totalCount: number; currentCount: number }>;
  counts: Record<string, { total: number; current: number }>;
  officialUrl: string;
  officialGuideUrl?: string;
  sourceUrl: string;
  knowledgeSiteUrl?: string;
}
