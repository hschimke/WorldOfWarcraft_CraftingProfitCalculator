// blizz_oath.ts
interface AccessToken {
    access_token: string,
    token_type: string,
    expires_in: number,
    scope: string,
    fetched: number,
    checkExpired: () => boolean
}

// auction-history.ts
interface SummaryReturnObject { data?: Array<any>, min_value?: number, max_value?: number, avg_value?: number }

// blizzard-api-helpers.ts
interface SearchResultsPage {
    pageCount: number,
    page: number
}

interface ConnectedRealmList {
    href: string
}

interface AllConnectedRealms {
    connected_realms: Array<ConnectedRealmList>
}

interface ConnectedRealm {
    name: string,
}

interface ConnectedRealmDetail {
    realms: Array<ConnectedRealm>,
    id: number
}

interface SkillTierCyclicLinks {

}

// cached-data-sources.ts
interface BonusesCache {
    bonuses: Array<any>
}

// databases.ts
type DatabaseClientFunction = {
    release: () => void;
    query: (query: string, values?: Array<string | number>) => Promise<any>;
    (): void;
}
type DatabaseManagerFunction = {
    db?: object;
    pool?: object;
    get: (query: string, values?: Array<string | number>) => Promise<any>;
    run: (query: string, values?: Array<string | number>) => Promise<any>;
    all: (query: string, values?: Array<string | number>) => Promise<any>;
    query: (query: string, values?: Array<string | number>) => Promise<any>;
    serialize: (query: Array<string>, values?: Array<Array<string | number>>) => Promise<any>;
    getClient: () => Promise<DatabaseClientFunction>;
    (): void;
};

// wow_crafting_profits.ts
interface AHItemPriceObject {

}

interface CraftingStatus {

}

interface ProfitAnalysisRecipe {

}

interface ProfitAnalysisBonusPrice {

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
}

interface OutputFormatObject {
    name: string,
    id: number,
    required: number,
    recipes: Array<OutputFormatRecipe>,
    ah: OutputFormatPrice,
    vendor: number,
    bonus_prices: Array<OutputFormatBonusPrices>,
    shopping_lists: ShoppingList
}

interface RecipeProductionValues {
    min: number,
    max: number,
    value: number
}

interface OutputFormatBonusPrices {

}