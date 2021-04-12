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
interface SummaryReturnObject { data?: Array<any>, min_value?: number, max_value?: number, avg_value?: number }

// blizzard-api-helpers.ts
type AuctionSummaryData = any;

interface SkillTierCyclicLinks {

}



// cached-data-sources.ts
interface BonusesCache {
    bonuses: Array<any>
}

type StaticSources = {
    bonuses_cache: BonusesCache;
    rank_mappings_cache: RankMappingsCache;
    shopping_recipe_exclusion_list: ShoppingRecipeExclusionList;
    (): void;
}

interface RankMappingsCache {
    available_levels: Array<number>,
        rank_mapping: Array<number>
}

interface ShoppingRecipeExclusionList {
        exclusions: Array<number>
}

// databases.ts
type DatabaseClientFunction = {
    release: () => void;
    query: (query: string, values?: Array<string | number | boolean>) => Promise<any>;
    (): void;
}
type DatabaseManagerFunction = {
    db?: object;
    pool?: object;
    get: (query: string, values?: Array<string | number | boolean>) => Promise<any>;
    run: (query: string, values?: Array<string | number | boolean>) => Promise<any>;
    all: (query: string, values?: Array<string | number | boolean>) => Promise<any>;
    query: (query: string, values?: Array<string | number | boolean>) => Promise<any>;
    serialize: (query: Array<string>, values?: Array<Array<string | number | boolean>>) => Promise<any>;
    getClient: () => Promise<DatabaseClientFunction>;
    (): void;
};

// wow_crafting_profits.ts
interface AHItemPriceObject {
    total_sales:number,
    average: number,
    high: number,
    low: number,
}

interface CraftingStatus {
    recipe_ids: Array<number>,
    craftable: boolean,
    recipes: Array<{
        recipe_id: number
    }>
}

interface ProfitAnalysisRecipe {
    prices: Array<ProfitAnalysisObject>,
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
    bonus_lists: Array<number>,
    recipe_options: Array<ProfitAnalysisRecipe>,
    bonus_prices: Array<ProfitAnalysisBonusPrice>
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
    parts: Array<OutputFormatObject>
}

interface OutputFormatPrice {
    sales: number,
    high: number,
    low: number,
    average: number
}

interface  OutputFormatShoppingList {

}

interface OutputFormatObject {
    name: string,
    id: number,
    required: number,
    recipes: Array<OutputFormatRecipe>,
    ah: OutputFormatPrice,
    vendor: number,
    bonus_prices: Array<OutputFormatBonusPrices>,
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
    price: ProfitAnalysisObject,
    intermediate: OutputFormatObject,
    formatted: string
}

// RunConfiguration.js
interface AddonData {
    inventory: Array< {
        id: ItemID,
        quantity: number
    }>,
    professions: Array<CharacterProfession>,
    realm: {
        region_id?: number,
        region_name: string,
        realm_id?: ConnectedRealmID,
        realm_name: RealmName
    }
}

// Global
type RegionCode = 'us' | 'eu' | 'kr' | 'tw';
type ItemID = number;
type ItemName = string;
type ItemSoftIdentity = ItemID | ItemName;

type ConnectedRealmID = number;
type RealmName = string;
type ConnectedRealmSoftIentity = ConnectedRealmID | RealmName;

type CharacterProfession = 'Jewelcrafting' | 'Tailoring' | 'Alchemy' | 'Herbalism' | 'Inscription' | 'Enchanting' | 'Blacksmithing' | 'Mining' | 'Engineering' | 'Leatherworking' | 'Skinning' | 'Cooking';