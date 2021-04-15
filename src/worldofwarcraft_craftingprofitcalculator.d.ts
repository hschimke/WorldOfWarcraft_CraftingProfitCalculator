// blizz_oath.ts
interface AccessToken {
    access_token: string,
    token_type: string,
    expires_in: number,
    scope: string,
    fetched: number,
    checkExpired: () => boolean
}

// blizzard-api-calls.ts

// auction-history.ts
interface SummaryReturnObject { data?: any[], min_value?: number, max_value?: number, avg_value?: number }

// blizzard-api-helpers.ts
interface AuctionPriceSummaryRecord {
    data?: SalesCountSummaryPrice[],
    min_value: number,
    max_value: number,
    avg_value: number
}

interface SalesCountSummary {
    sales_at_price: number,
    quantity_at_price: number
}

interface SalesCountSummaryPrice extends SalesCountSummary {
    price: number
}

interface AuctionSummaryData {
    min: number;
    max: number;
    avg: number;
    latest: number;
    price_map: Record<string | number, AuctionPriceSummaryRecord>;
    archives: {
        timestamp: string;
        data: SalesCountSummaryPrice[];
        min_value: number;
        max_value: number;
        avg_value: number;
    }[];
}

type SkillTierCyclicLinks = Record<number, {
    id: number,
    takes: number,
    makes: number
}[]>;

type SkillTierCyclicLinksBuild = {
    id: number[],
    quantity: number
}[][];


// cached-data-sources.ts
type BonusesCache = Record<number | string, {
    id: number,
    level?: number,
    quality?: number,
    socket?: number
}>;

type StaticSources = {
    bonuses_cache: BonusesCache;
    rank_mappings_cache: RankMappingsCache;
    shopping_recipe_exclusion_list: ShoppingRecipeExclusionList;
    (): void;
}

interface RankMappingsCache {
    available_levels: number[],
    rank_mapping: number[]
}

interface ShoppingRecipeExclusionList {
    exclusions: number[]
}

// databases.ts
type DatabaseClientFunction = {
    release: () => void;
    query: (query: string, values?: Array<string | number | boolean | null>) => Promise<any>;
    (): void;
}
type DatabaseManagerFunction = {
    db: any;
    pool: any;
    get: (query: string, values?: Array<string | number | boolean | null>) => Promise<any>;
    run: (query: string, values?: Array<string | number | boolean | null>) => Promise<any>;
    all: (query: string, values?: Array<string | number | boolean | null>) => Promise<any>;
    query: (query: string, values?: Array<string | number | boolean | null>) => Promise<any>;
    serialize: (query: Array<string>, values: Array<Array<string | number | boolean | null>>) => Promise<any>;
    getClient: () => Promise<DatabaseClientFunction>;
    (): void;
};

// wow_crafting_profits.ts
interface AHItemPriceObject {
    total_sales: number,
    average: number,
    high: number,
    low: number,
}

interface CraftingStatus {
    recipe_ids: number[],
    craftable: boolean,
    recipes: {
        recipe_id: number,
        crafting_profession: CharacterProfession,
    }[]
}

interface ProfitAnalysisRecipe {
    prices: ProfitAnalysisObject[],
    recipe: {
        recipe_id: number
    },
    rank: number,
    rank_ah: AHItemPriceObject
}

interface ProfitAnalysisBonusPrice {
    level: number,
    ah: AHItemPriceObject
}

interface ProfitAnalysisObject {
    item_id: number,
    item_name: string,
    ah_price: AHItemPriceObject,
    item_quantity: number,
    vendor_price: number,
    crafting_status: CraftingStatus
    bonus_lists: number[][],
    recipe_options: ProfitAnalysisRecipe[],
    bonus_prices: ProfitAnalysisBonusPrice[]
}

interface ShoppingList {
    quantity: number,
    id: ItemID,
    name: ItemName,
    cost: {
        vendor: number,
        ah: OutputFormatPrice
    }
}

interface OutputFormatRecipe {
    name: string,
    rank: number,
    id: number,
    output: RecipeProductionValues,
    ah: OutputFormatPrice,
    high: number,
    low: number,
    average: number,
    parts: OutputFormatObject[]
}

interface OutputFormatPrice {
    sales: number,
    high: number,
    low: number,
    average: number
}

type OutputFormatShoppingList = Record<number | string, ShoppingList[]>;

interface OutputFormatObject {
    name: string,
    id: number,
    required: number,
    recipes: OutputFormatRecipe[],
    ah: OutputFormatPrice,
    vendor: number,
    bonus_prices: OutputFormatBonusPrices[],
    shopping_lists: OutputFormatShoppingList
}

interface RecipeProductionValues {
    min: number,
    max: number,
    value: number
}

interface OutputFormatBonusPrices {
    level: number,
    ah: OutputFormatPrice
}

interface RunReturn {
    price?: ProfitAnalysisObject,
    intermediate?: OutputFormatObject,
    formatted: string
}

// RunConfiguration.js
interface AddonData {
    inventory: {
        id: ItemID,
        quantity: number
    }[],
    professions: CharacterProfession[],
    realm: {
        region_id?: number,
        region_name: string,
        realm_id?: ConnectedRealmID,
        realm_name: RealmName
    }
}

// server.js
interface SeenItemBonusesReturn {
    bonuses: Record<string, string>[],
    mapped: {
        text: string,
        parsed: Array<number | string>,
        reduced: string | undefined,
    }[],
    collected: {
        ilvl: {
            id: string | number,
            level: number,
        }[],
        socket: {
            id: string | number,
            sockets: number | undefined,
        }[],
        quality: {
            id: string | number,
            quality: number | undefined,
        }[],
        unknown: (string | number)[],
        empty: boolean,
    }
}

interface ServerErrorReturn {
    ERROR: string
}
type AuctionHistoryReturn = AuctionSummaryData;
type ServerRunResultReturn = OutputFormatObject;

// Global
type RegionCode = 'us' | 'eu' | 'kr' | 'tw';
type ItemID = number;
type ItemName = string;
type ItemSoftIdentity = ItemID | ItemName;

type ConnectedRealmID = number;
type RealmName = string;
type ConnectedRealmSoftIentity = ConnectedRealmID | RealmName;

type CharacterProfession = 'Jewelcrafting' | 'Tailoring' | 'Alchemy' | 'Herbalism' | 'Inscription' | 'Enchanting' | 'Blacksmithing' | 'Mining' | 'Engineering' | 'Leatherworking' | 'Skinning' | 'Cooking';