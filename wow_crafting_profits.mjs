import fs from 'fs/promises';
import got from 'got';
import { getBlizzardAPIResponse, shutdownApiManager } from './blizzard-api-call.mjs';
import { getAuthorizationToken } from './blizz_oath.mjs';
import { bonuses_cache, cacheCheck, cacheGet, cacheSet, rank_mappings_cache, saveCache, shopping_recipe_exclusion_list } from './cache/cached-data-sources.mjs';
import { parentLogger } from './logging.mjs';

const logger = parentLogger.child();

const raidbots_bonus_lists = bonuses_cache;
const rankings = rank_mappings_cache;
const shopping_recipe_exclusions = shopping_recipe_exclusion_list;

const exclude_before_shadowlands = false;

// Cache namespace constants
const ITEM_SEARCH_CACHE = 'item_search_cache';
const CONNECTED_REALM_ID_CACHE = 'connected_realm_data';
const ITEM_DATA_CACHE = 'fetched_item_data';
const PROFESSION_SKILL_TIER_DETAILS_CACHE = 'fetched_profession_skill_tier_detail_data';
const PROFESSION_RECIPE_DETAIL_CACHE = 'fetched_profession_recipe_detail_data';
const CRAFTABLE_BY_PROFESSION_SET_CACHE = 'craftable_by_professions_cache';
const CRAFTABLE_BY_SINGLE_PROFESSION_CACHE = 'craftable_by_profession';
const AUCTION_DATA_CACHE = 'fetched_auctions_data';

/**
 * Search through the item database for a string, returning the item id of the item.
 * @param {!string} region The region in which to search.
 * @param {!string} item_name The name of the item to search for
 */
async function getItemId(region, item_name) {
    logger.info(`Searching for itemId for ${item_name}`);

    if (await cacheCheck(ITEM_SEARCH_CACHE, item_name)) {
        return cacheGet(ITEM_SEARCH_CACHE, item_name);
    }

    const search_api_uri = '/data/wow/search/item';
    let item_id = -1;

    // Step 1: Get the initial results to see if we get anything
    const initial_page = await getBlizzardAPIResponse(region, await getAuthorizationToken(), {
        'namespace': 'static-us',
        'locale': 'en_US',
        'name.en_US': item_name,
        'orderby': 'id:desc',
    },
        search_api_uri);

    // Check how many pages, if there are more pages, loop through them and fetch each.
    const page_count = initial_page.pageCount;
    logger.debug(`Found ${page_count} pages for item search ${item_name}`);
    if (page_count > 0) {
        // Check if results are on the first page
        let page_item_id = await checkPageSearchResults(initial_page, item_name);
        if (page_item_id > 0) {
            // We found it, we're done!
            item_id = page_item_id;
            logger.debug(`Found ${item_id} for ${item_name} on first page.`);
        } else {
            // loop through all the remaining pages and check
            for (let cp = initial_page.page; cp <= page_count; cp++) {
                logger.debug(`Checking page ${cp} for ${item_name}`);
                if (page_item_id <= 0) {
                    const current_page = await getBlizzardAPIResponse(region, await getAuthorizationToken(), {
                        'namespace': 'static-us',
                        'locale': 'en_US',
                        'name.en_US': item_name,
                        'orderby': 'id:desc',
                        '_page': cp,
                    },
                        search_api_uri);
                    page_item_id = await checkPageSearchResults(current_page, item_name);
                    if (page_item_id > 0) {
                        item_id = page_item_id;
                        logger.debug(`Found ${item_id} for ${item_name} on page ${cp} of ${page_count}.`);
                        break;
                    }
                }
            }
        }
    } else {
        // We didn't get any results, that's an error
        logger.error(`No items match search ${item_name}`);
        throw (new Error('No Results'));
    }

    if (item_id > 0) {
        cacheSet(ITEM_SEARCH_CACHE, item_name, item_id);
    }

    return item_id;

    /**
     * Search a specific page for the item.
     * @param {!number} page The page to retrieve and search.
     * @param {!string} item_name The name of the item we are searching for.
     * @return The item id of the item, or -1 if it doesn't.
     */
    async function checkPageSearchResults(page, item_name) {
        let found_item_id = -1;
        for (let result of page.results) {
            //console.log(result);
            if (result.data.name['en_US'].localeCompare(item_name, undefined, { sensitivity: 'accent' }) == 0) {
                logger.debug(`Found ${item_name} with id ${result.data.id}`);
                found_item_id = result.data.id;
                break;
            }
        }
        return found_item_id;
    };
}

/**
 * Find the connected realm id for a server, some connected realms have only one server
 * while others have multiples.
 * @param {!string} server_name The name of the server to look for.
 * @param {!string} server_region The region in which the server is hosted.
 * @return {Promise.<number>} The number associated with the connected realm for the server.
 */
async function getConnectedRealmId(server_name, server_region) {
    const connected_realm_key = `${server_region}::${server_name}`;

    if (await cacheCheck(CONNECTED_REALM_ID_CACHE, connected_realm_key)) {
        return cacheGet(CONNECTED_REALM_ID_CACHE, connected_realm_key);
    }

    const list_connected_realms_api = '/data/wow/connected-realm/index';
    const list_connected_realms_form = {
        'namespace': 'dynamic-us',
        'locale': 'en_US'
    };
    const get_connected_realm_form = {
        'namespace': 'dynamic-us',
        'locale': 'en_US'
    };
    const access_token = await getAuthorizationToken();

    let realm_id = 0;

    // Get a list of all connected realms
    const all_connected_realms = await getBlizzardAPIResponse(
        server_region,
        access_token,
        list_connected_realms_form,
        list_connected_realms_api);

    // Pull the data for each connection until you find one with the server name in question
    for (let realm_href of all_connected_realms.connected_realms) {
        logger.debug(`Check realm with href: ${realm_href.href}`);
        const hr = realm_href.href;
        const connected_realm_detail = await got(hr, {
            reponseType: 'json',
            method: 'GET',
            headers: {
                'Connection': 'keep-alive',
                'Authorization': `Bearer ${access_token.access_token}`
            },
            searchparams: get_connected_realm_form
        }).json();
        const realm_list = connected_realm_detail.realms;
        let found_realm = false;
        for (let rlm of realm_list) {
            logger.debug(`Realm ${rlm.name['en_US']}`);
            if (rlm.name['en_US'].localeCompare(server_name, undefined, { sensitivity: 'accent' }) == 0) {
                logger.debug(`Realm ${rlm} matches ${server_name}`);
                found_realm = true;
                break;
            }
        }
        if (found_realm == true) {
            realm_id = connected_realm_detail.id;
            break;
        }
    }

    cacheSet(CONNECTED_REALM_ID_CACHE, connected_realm_key, realm_id);
    logger.info(`Found Connected Realm ID: ${realm_id} for ${server_region} ${server_name}`);

    // Return that connected realm ID
    return realm_id;
}

/**
 * Get the full details for an item.
 * @param {!number} item_id The item id for the item to retrieve.
 * @param {!string} region The region in which we are searching.
 */
async function getItemDetails(item_id, region) {
    const key = item_id

    if (await cacheCheck(ITEM_DATA_CACHE, key)) {
        return cacheGet(ITEM_DATA_CACHE, key);
    }

    const profession_item_detail_uri = `/data/wow/item/${item_id}`;
    //categories[array].recipes[array].name categories[array].recipes[array].id
    const result = await getBlizzardAPIResponse(region, await getAuthorizationToken(), {
        'namespace': 'static-us',
        'locale': 'en_US'
    },
        profession_item_detail_uri);

    cacheSet(ITEM_DATA_CACHE, key, result);
    return result;
}

/**
 * Get a list of all professions available.
 * @param {!string} region The region to search
 */
async function getBlizProfessionsList(region) {
    const profession_list_uri = '/data/wow/profession/index'; // professions.name / professions.id
    return getBlizzardAPIResponse(region, await getAuthorizationToken(), {
        'namespace': 'static-us',
        'locale': 'en_US'
    }, profession_list_uri);
}

/**
 * Get the details for the specified profession.
 * @param profession_id The id of the profession to fetch.
 * @param region The region in which to search.
 */
async function getBlizProfessionDetail(profession_id, region) {
    const profession_detail_uri = `/data/wow/profession/${profession_id}`; // skill_tiers.name skill_tiers.id
    return getBlizzardAPIResponse(region, await getAuthorizationToken(), {
        'namespace': 'static-us',
        'locale': 'en_US'
    },
        profession_detail_uri);
}

/**
 * Fetch the skill tier detail for a profession, the skill tier is
 * what contains things like recipe lists.
 * @param {!number} profession_id The id of the profession.
 * @param {!number} skillTier_id The skill tier id we are interested in.
 * @param {!string} region The region in which to search.
 */
async function getBlizSkillTierDetail(profession_id, skillTier_id, region) {
    const key = `${region}::${profession_id}::${skillTier_id}`;

    if (await cacheCheck(PROFESSION_SKILL_TIER_DETAILS_CACHE, key)) {
        return cacheGet(PROFESSION_SKILL_TIER_DETAILS_CACHE, key);
    }

    const profession_skill_tier_detail_uri = `/data/wow/profession/${profession_id}/skill-tier/${skillTier_id}`;
    //categories[array].recipes[array].name categories[array].recipes[array].id
    const result = await getBlizzardAPIResponse(region, await getAuthorizationToken(), {
        'namespace': 'static-us',
        'locale': 'en_US'
    },
        profession_skill_tier_detail_uri);

    cacheSet(PROFESSION_SKILL_TIER_DETAILS_CACHE, key, result);

    return result;
}

/**
 * Fetch the details for a recipe, recipe details will include information about
 * required reagents.
 * @param recipe_id The id of the recipe to fetch.
 * @param region The region in which to search.
 */
async function getBlizRecipeDetail(recipe_id, region) {
    const key = `${region}::${recipe_id}`;

    if (await cacheCheck(PROFESSION_RECIPE_DETAIL_CACHE, key)) {
        return cacheGet(PROFESSION_RECIPE_DETAIL_CACHE, key);
    }

    const profession_recipe_uri = `/data/wow/recipe/${recipe_id}`;
    //crafted_item.name crafted_item.id / reagents[array].name reagents[array].id reagents[array].quantity

    const result = await getBlizzardAPIResponse(region, await getAuthorizationToken(), {
        'namespace': 'static-us',
        'locale': 'en_US'
    },
        profession_recipe_uri);

    cacheSet(PROFESSION_RECIPE_DETAIL_CACHE, key, result);

    return result;
}

/**
 * Check if an item can be crafted using a given set of professions.
 * @param {!number} item_id The id of the item to check.
 * @param {!Array.<string>}character_professions The list of professions available to the user.
 * @param {!string} region The region in which to search.
 */
async function checkIsCrafting(item_id, character_professions, region) {
    // Check if we've already run this check, and if so return the cached version, otherwise keep on
    const key = `${region}::${item_id}::${JSON.stringify(character_professions)}`;

    if (await cacheCheck(CRAFTABLE_BY_PROFESSION_SET_CACHE, key)) {
        return cacheGet(CRAFTABLE_BY_PROFESSION_SET_CACHE, key);
    }

    const profession_list = await getBlizProfessionsList(region);

    const recipe_options = {
        craftable: false,
        recipes: [],
        recipe_ids: []
    };

    // Check if a vendor is mentioned in the item description and if so just short circuit
    const item_detail = await getItemDetails(item_id, region);
    if ('description' in item_detail) {
        if (item_detail.description.includes('vendor')) {
            logger.debug('Skipping vendor recipe');
            cacheSet(CRAFTABLE_BY_PROFESSION_SET_CACHE, key, recipe_options);
            return recipe_options;
        }
    }

    const profession_result_array = [];

    // This may be too many concurrent promises
    const character_profession_check_promises = [];
    for (let prof of character_professions) {
        character_profession_check_promises.push(checkProfessionCrafting(profession_list, prof, region, item_id, item_detail));
    }

    (await Promise.all(character_profession_check_promises)).forEach((check) => {
        profession_result_array.push(check);
    });


    // This doesn't spawn nearly as many threads.
    /*
    for (let prof of character_professions) {
        profession_result_array.push(await checkProfessionCrafting(profession_list, prof, region, item_id, item_detail));
    }
    */

    // collate professions
    for (let profession_crafting_check of profession_result_array) {
        recipe_options.recipes = recipe_options.recipes.concat(profession_crafting_check.recipes);
        recipe_options.recipe_ids = recipe_options.recipe_ids.concat(profession_crafting_check.recipe_ids);
        recipe_options.craftable = recipe_options.craftable || profession_crafting_check.craftable;
    }

    cacheSet(CRAFTABLE_BY_PROFESSION_SET_CACHE, key, recipe_options);
    //{craftable: found_craftable, recipe_id: found_recipe_id, crafting_profession: found_profession};
    return recipe_options;
}

/**
 * Check a single profession to see if an item is craftable by it.
 * @param {Array<object>} profession_list List of all available professions from Blizzard.
 * @param {string} prof The current profession to check.
 * @param {string} region The region in which to search.
 * @param {number} item_id The item id of the item we are checking.
 * @param {object} item_detail Details about the item we are checking.
 */
async function checkProfessionCrafting(profession_list, prof, region, item_id, item_detail) {
    const cache_key = `${region}:${prof}:${item_id}`;
    if (await cacheCheck(CRAFTABLE_BY_SINGLE_PROFESSION_CACHE, cache_key)) {
        return cacheGet(CRAFTABLE_BY_SINGLE_PROFESSION_CACHE, cache_key);
    }

    const profession_recipe_options = {
        craftable: false,
        recipes: [],
        recipe_ids: []
    };

    const check_profession_id = profession_list.professions.find((item) => {
        return (item.name.localeCompare(prof, undefined, { sensitivity: 'accent' }) == 0);
    }).id;

    // Get a list of the crafting levels for the professions
    const profession_detail = await getBlizProfessionDetail(check_profession_id, region);
    const crafting_levels = profession_detail.skill_tiers;

    logger.debug(`Scanning profession: ${profession_detail.name}`);

    // checkProfessionTierCrafting on each crafting level, concurrently.
    await Promise.all(crafting_levels.map(checkProfessionTierCrafting));

    cacheSet(CRAFTABLE_BY_SINGLE_PROFESSION_CACHE, cache_key, profession_recipe_options);

    return profession_recipe_options;

    /**
     * Scan a tier of a given profession to see if it can craft an item.
     * @param skill_tier The tier level to check.
     */
    async function checkProfessionTierCrafting(skill_tier) {
        let check_scan_tier = skill_tier.name.includes('Shadowlands');
        if (!exclude_before_shadowlands) {
            check_scan_tier = true;
        }
        if (check_scan_tier) {
            logger.debug(`Checking: ${skill_tier.name} for: ${item_id}`);
            // Get a list of all recipes each level can do
            const skill_tier_detail = await getBlizSkillTierDetail(check_profession_id, skill_tier.id, region);

            let checked_categories = 0;
            let recipes_checked = 0;

            if (skill_tier_detail.categories != undefined) {
                const categories = skill_tier_detail.categories;

                checked_categories += categories.length;
                for (let cat of categories) {
                    for (let rec of cat.recipes) {
                        const recipe = await getBlizRecipeDetail(rec.id, region);
                        recipes_checked++;
                        //logger.debug(`Check recipe ${recipe.name}`);
                        if (!(recipe.name.includes('Prospect') || recipe.name.includes('Mill'))) {
                            let crafty = false;
                            if ('alliance_crafted_item' in recipe) {
                                if (recipe.alliance_crafted_item.id == item_id) {
                                    crafty = true;
                                }
                            }
                            if ('horde_crafted_item' in recipe) {
                                if (recipe.horde_crafted_item.id == item_id) {
                                    crafty = true;
                                }
                            }
                            if ('crafted_item' in recipe) {
                                if (recipe.crafted_item.id == item_id) {
                                    crafty = true;
                                }
                            }
                            if (crafty) {
                                logger.info(`Found recipe (${recipe.id}): ${recipe.name} for (${item_detail.id}) ${item_detail.name}`);

                                profession_recipe_options.recipes.push(
                                    {
                                        recipe_id: recipe.id,
                                        crafting_profession: prof
                                    }
                                );
                                profession_recipe_options.recipe_ids.push(recipe.id);
                                profession_recipe_options.craftable = true;
                            }
                        } else {
                            //logger.debug(`Skipping Recipe: (${recipe.id}) "${recipe.name}"`);
                        }
                    }
                }
            } else {
                logger.debug(`Skill tier ${skill_tier.name} has no categories.`);
            }
            logger.debug(`Checked ${recipes_checked} recipes in ${checked_categories} categories for ${item_id} in ${skill_tier.name}`);
        }
    }
}

/**
 * 
 * @param recipe_id The id of the recipe to check.
 * @param region The region in which to search.
 */
async function getCraftingRecipe(recipe_id, region) {
    const recipe = getBlizRecipeDetail(recipe_id, region);
    return recipe;
}

/**
 * Fetch a snapshot of the auction house for a given connected realm.
 * @param {!number} server_id The connected realm id to fetch.
 * @param {!string} server_region The region in which the realm exists.
 */
async function getAuctionHouse(server_id, server_region) {
    // Download the auction house for the server_id
    // If the auction house is older than an hour then remove it from the cached_data.fetched_auction_houses array
    if (await cacheCheck(AUCTION_DATA_CACHE, server_id, 3.6e+6)) {
        return cacheGet(AUCTION_DATA_CACHE, server_id);
    }

    logger.info('Auction house is out of date, fetching it fresh.')

    const auction_house_fetch_uri = `/data/wow/connected-realm/${server_id}/auctions`;
    const ah = await getBlizzardAPIResponse(
        server_region,
        await getAuthorizationToken(),
        {
            'namespace': 'dynamic-us',
            'locale': 'en_US'
        },
        auction_house_fetch_uri);

    cacheSet(AUCTION_DATA_CACHE, server_id, ah);

    return ah;
}

/**
 * Find the value of an item on the auction house.
 * Items might be for sale on the auction house and be available from vendors.
 * The auction house items have complicated bonus types.
 * @param {number} item_id The id of the item to search for.
 * @param {object} auction_house An auction house to search through.
 * @param {?number} bonus_level_required An optional bonus level for crafted legendary base items.
 */
async function getAHItemPrice(item_id, auction_house, bonus_level_required) {
    // Find the item and return best, worst, average prices

    let auction_high = Number.MIN_VALUE;
    let auction_low = Number.MAX_VALUE;
    let auction_average = 0;
    let auction_counter = 0;
    let auction_average_accumulator = 0;

    /**
     * Issue: for items with multiple version availble on the auction house
     * you will find that they all have the same id. The difference comes
     * from the 'bonus_lists' array
     */
    auction_house.auctions.forEach((auction) => {
        if (auction.item.id == item_id) {
            if (((bonus_level_required != undefined) && (('bonus_lists' in auction.item) && auction.item.bonus_lists.includes(bonus_level_required))) || (bonus_level_required == undefined)) {
                if ('buyout' in auction) {
                    if (auction.buyout > auction_high) {
                        auction_high = auction.buyout;
                    }
                    if (auction.buyout < auction_low) {
                        auction_low = auction.buyout;
                    }
                    auction_average_accumulator += (auction.buyout * auction.quantity);
                } else {
                    if (auction.unit_price > auction_high) {
                        auction_high = auction.unit_price;
                    }
                    if (auction.unit_price < auction_low) {
                        auction_low = auction.unit_price;
                    }
                    auction_average_accumulator += (auction.unit_price * auction.quantity);
                }
                auction_counter += auction.quantity;
            }
        }
    });

    auction_average = auction_average_accumulator / auction_counter;

    return {
        high: auction_high,
        low: auction_low,
        average: auction_average,
        total_sales: auction_counter,
    };
}

/**
 * Retrieve the value of the item from the vendor price,
 * items that cannot be bought from
 * vendors are given a value of -1.
 * @param {Number} item_id 
 * @param {String} region 
 */
async function findNoneAHPrice(item_id, region) {
    // Get the item from blizz and see what the purchase price is
    // The general method is to get the item and see if the description mentions the auction house,
    // if it does then return -1, if it doesn't return the 'purchase_price' options
    const item = await getItemDetails(item_id, region);
    let vendor_price = -1;
    if ('description' in item) {
        if (item.description.includes('vendor')) {
            vendor_price = item.purchase_price;
        }
        if (!item.description.includes('auction')) {
            vendor_price = item.purchase_price;
        }
    } else {
        vendor_price = item.purchase_price;
    }
    if ('purchase_quantity' in item) {
        vendor_price = vendor_price / item.purchase_quantity;
    }
    return vendor_price;
}

/**
 * Get a list of bonus item values for a given item.
 * 
 * Finds all of the bonus-list types associated with a given item id,
 * currently the only way to do that is by pulling an auction house down
 * and then scanning it. If no bonus lists are found an empty array is
 * returned.
 * 
 * @param {number} item_id Item ID to scan
 * @param {object} auction_house The auction house data to use as a source.
 */
async function getItemBonusLists(item_id, auction_house) {
    let bonus_lists = [];
    let bonus_lists_set = [];
    auction_house.auctions.forEach((auction) => {
        if (auction.item.id == item_id) {
            if ('bonus_lists' in auction.item) {
                bonus_lists.push(auction.item.bonus_lists);
            }
        }
    });
    bonus_lists.forEach((list) => {
        let found = false;
        bonus_lists_set.forEach((i) => {
            if (i.length == list.length && i.every(function (u, i) {
                return u === list[i];
            })
            ) {
                found = true;
            }
        });
        if (!found) {
            bonus_lists_set.push(list);
        }
    });
    logger.debug(`Item ${item_id} has ${bonus_lists_set.length} bonus lists.`);
    return bonus_lists_set;
}

/**
 * Bonus levels correspond to a specific increase in item level over base,
 * get the item level delta for that bonus id.
 * @param bonus_id The bonus ID to check.
 */
function getLvlModifierForBonus(bonus_id) {
    if (bonus_id in raidbots_bonus_lists) {
        if ('level' in raidbots_bonus_lists[bonus_id]) {
            return raidbots_bonus_lists[bonus_id].level;
        } else {
            return -1;
        }
    } else {
        return -1;
    }
}

/**
 * Analyze the profit potential for constructing or buying an item based on available recipes.
 * @param {!string} region The region in which to search.
 * @param {!string} server The server on which to search, server is used for auction house data and prices.
 * @param {Array<string>} character_professions An array of all the available professions.
 * @param {string|number} item The item id or the item name to analyze.
 * @param {number} qauntity The number of items required.
 * @param {?object} passed_ah If an auction house is already available, pass it in and it will be used.
 */
async function performProfitAnalysis(region, server, character_professions, item, qauntity, passed_ah) {
    // Check if we have to figure out the item id ourselves
    let item_id = 0;
    if (Number.isFinite(Number(item))) {
        item_id = item;
    } else {
        item_id = await getItemId(region, item);
        if (item_id < 0) {
            logger.error(`No itemId could be found for ${item}`);
            throw (new Error(`No itemId could be found for ${item}`));
        }
        logger.info(`Found ${item_id} for ${item}`);
    }

    const item_detail = await getItemDetails(item_id, region);

    const base_ilvl = item_detail.level;

    let price_obj = {
        item_id: item_id,
        item_name: item_detail.name
    };

    logger.info(`Analyzing profits potential for ${item_detail.name} (${item_id})`);

    // Get the realm id
    const server_id = await getConnectedRealmId(server, region);

    //Get the auction house
    const auction_house = (passed_ah !== undefined) ? passed_ah : await getAuctionHouse(server_id, region);

    // Get Item AH price
    price_obj.ah_price = await getAHItemPrice(item_id, auction_house);

    price_obj.item_quantity = qauntity;

    const item_craftable = await checkIsCrafting(item_id, character_professions, region);

    // Get NON AH price
    if (!item_craftable.craftable) {
        price_obj.vendor_price = await findNoneAHPrice(item_id);
    } else {
        price_obj.vendor_price = -1;
    }

    price_obj.crafting_status = item_craftable;

    // Eventually bonus_lists should be treated as separate items and this should happen first
    // When that's the case we should actually return an entire extra set of price data based on each
    // possible bonus_list. They're actually different items, blizz just tells us they aren't.
    price_obj.bonus_lists = Array.from(new Set(await getItemBonusLists(item_id, auction_house)));
    let bonus_link = {};
    const bl_flat = Array.from(new Set(price_obj.bonus_lists.flat())).filter((bonus) => bonus in raidbots_bonus_lists && 'level' in raidbots_bonus_lists[bonus]);
    for (const bonus of bl_flat) {
        const mod = getLvlModifierForBonus(bonus);
        if (mod !== -1) {
            const new_level = base_ilvl + mod
            bonus_link[new_level] = bonus;
            logger.debug(`Bonus level ${bonus} results in crafted ilvl of ${new_level}`);
        }
    }
    
    const recipe_id_list = item_craftable.recipe_ids.sort();

    price_obj.recipe_options = [];

    if (item_craftable.craftable) {
        logger.debug(`Item ${item_detail.name} (${item_id}) has ${item_craftable.recipes.length} recipes.`);
        for (let recipe of item_craftable.recipes) {
            // Get Reagents
            const item_bom = await getCraftingRecipe(recipe.recipe_id, region);

            // Get prices for BOM
            const bom_prices = [];

            logger.debug(`Recipe ${item_bom.name} (${recipe.recipe_id}) has ${item_bom.reagents.length} reagents`);

            const bom_promises = item_bom.reagents.map((reagent) => {
                return performProfitAnalysis(region, server, character_professions, reagent.reagent.id, reagent.quantity, auction_house)
            });

            (await Promise.all(bom_promises)).forEach((price) => {
                bom_prices.push(price);
            });

            let rank_level = 0;
            let rank_AH = {};
            if (recipe_id_list.length > 1) {
                rank_level = recipe_id_list.indexOf(recipe.recipe_id) > -1 ? rankings.available_levels[rankings.rank_mapping[recipe_id_list.indexOf(recipe.recipe_id)]] : 0;
                if (bonus_link[rank_level] != undefined) {
                    logger.debug(`Looking for AH price for ${item_id} for level ${rank_level} using bonus is ${bonus_link[rank_level]}`);
                    rank_AH = await getAHItemPrice(item_id, auction_house, bonus_link[rank_level]);
                } else {
                    logger.debug(`Item ${item_id} has no auctions for level ${rank_level}`);
                }
            }

            price_obj.recipe_options.push({
                recipe: recipe,
                prices: bom_prices,
                rank: rank_level,
                rank_ah: rank_AH,
            });
        }
    } else {
        logger.debug(`Item ${item_detail.name} (${item_id}) not craftable with professions: ${character_professions}`);
        if (price_obj.bonus_lists.length > 0) {
            price_obj.bonus_prices = [];
            for (const bonus of bl_flat) {
                const level_uncrafted_ah_cost = {
                    level: base_ilvl + raidbots_bonus_lists[bonus].level,
                    ah: await getAHItemPrice(item_id, auction_house, bonus)
                };
                price_obj.bonus_prices.push(level_uncrafted_ah_cost);
            }
        }
    }

    return price_obj;
}

/**
 * Figure out the best/worst/average cost to construct a recipe given all items required.
 * @param recipe_option The recipe to price.
 */
async function recipeCostCalculator(recipe_option) {
    /**
     * For each recipe
     *   For each component
     *     if component is vendor: cost = price * quantity
     *     if component is on AH: cost = h/l/a * quantity (tuple)
     *     if component is craftable: cost = h/l/a of each recipe option
     */
    const cost = {
        high: 0,
        low: 0,
        average: 0
    };

    for (let component of recipe_option.prices) {
        if (component.vendor_price != -1) {
            cost.high += component.vendor_price * component.item_quantity;
            cost.low += component.vendor_price * component.item_quantity;
            cost.average += component.vendor_price * component.item_quantity;
            logger.debug(`Use vendor price for ${component.item_name} (${component.item_id})`);
        } else if (component.crafting_status.craftable == false) {
            let high = Number.MIN_VALUE;
            let low = Number.MAX_VALUE;
            let average = 0;
            let count = 0;
            if (component.ah_price.total_sales > 0) {
                average += component.ah_price.average;
                if (component.ah_price.high > high) {
                    high = component.ah_price.high;
                }
                if (component.ah_price.low < low) {
                    low = component.ah_price.low;
                }
                count++;
            }
            cost.average += (average / count) * component.item_quantity;
            cost.high += high * component.item_quantity;
            cost.low += low * component.item_quantity;
            logger.debug(`Use auction price for uncraftable item ${component.item_name} (${component.item_id})`);
        } else {
            logger.debug(`Recursive check for item ${component.item_name} (${component.item_id})`);
            let ave_acc = 0;
            let ave_cnt = 0;

            let high = Number.MIN_VALUE;
            let low = Number.MAX_VALUE;

            let rc_price_promises = [];
            for (let opt of component.recipe_options) {
                rc_price_promises.push(recipeCostCalculator(opt));
            }

            (await Promise.all(rc_price_promises)).forEach((recurse_price) => {
                if (high < recurse_price.high * component.item_quantity) {
                    high = recurse_price.high * component.item_quantity;
                }

                if (low > recurse_price.low * component.item_quantity) {
                    low = recurse_price.low * component.item_quantity;
                }

                ave_acc += recurse_price.average * component.item_quantity;
                ave_cnt++;
            });

            cost.low = low;
            cost.high = high;
            cost.average += ave_acc / ave_cnt;
        }
    }

    return cost;
}

/**
 * Provide a string to indent a preformatted text.
 * @param level The number of indents to include.
 */
function indentAdder(level) {
    let str = '';
    for (let i = 0; i < level; i++) {
        str += '  ';
    }
    return str;
}

/**
 * Format a raw value into a string for Gold, Silver, and Copper
 * @param {!number} price_in The blizzard provided cost number.
 * @returns {string} The formatted Gold,Silver,Copper value as seen in game.
 */
function goldFormatter(price_in) {
    const price = Math.trunc(price_in);
    const copper = price % 100;
    const silver = (((price % 10000) - copper)) / 100;
    const gold = (price - (price % 10000)) / 10000;
    return `${gold.toLocaleString()}g ${silver.toLocaleString()}s ${copper.toLocaleString()}c`;
}

/**
 * Create an object used for constructing shopping lists and formatted output data.
 * @param {!object} price_data The object created by the analyze function.
 * @param {!string} region The region in which to work.
 */
async function generateOutputFormat(price_data, region) {
    const object_output = {
        name: price_data.item_name,
        id: price_data.item_id,
        required: price_data.item_quantity,
        recipes: [],
    };

    if ((price_data.ah_price != undefined) && (price_data.ah_price.total_sales > 0)) {
        object_output.ah = {
            sales: price_data.ah_price.total_sales,
            high: price_data.ah_price.high,
            low: price_data.ah_price.low,
            average: price_data.ah_price.average,
        }
    }
    if (price_data.vendor_price > 0) {
        object_output.vendor = price_data.vendor_price;
    }
    if (price_data.recipe_options != undefined) {
        for (let recipe_option of price_data.recipe_options) {
            const option_price = await recipeCostCalculator(recipe_option);
            const recipe = await getBlizRecipeDetail(recipe_option.recipe.recipe_id, region);
            const obj_recipe = {
                name: recipe.name,
                rank: recipe_option.rank,
                id: recipe_option.recipe.recipe_id,
                high: option_price.high,
                low: option_price.low,
                average: option_price.average,
                parts: [],
            }
            if ((recipe_option.rank_ah != undefined) && (recipe_option.rank_ah.total_sales > 0)) {
                obj_recipe.ah = {
                    sales: recipe_option.rank_ah.total_sales,
                    high: recipe_option.rank_ah.high,
                    low: recipe_option.rank_ah.low,
                    average: recipe_option.rank_ah.average,
                };
            }
            let prom_list = [];
            if (recipe_option.prices != undefined) {
                for (let opt of recipe_option.prices) {
                    prom_list.push(generateOutputFormat(opt, region));
                }
                (await Promise.all(prom_list)).forEach((data) => {
                    obj_recipe.parts.push(data);
                });
            }

            object_output.recipes.push(obj_recipe);
        }
    }

    if (price_data.bonus_prices !== undefined) {
        object_output.bonus_prices = price_data.bonus_prices.map((bonus_price) => {
            return {
                level: bonus_price.level,
                ah: {
                    sales: bonus_price.ah.total_sales,
                    high: bonus_price.ah.high,
                    low: bonus_price.ah.low,
                    average: bonus_price.ah.average,
                }
            };
        })
    }

    return object_output;
}

/**
 * Generate a preformatted text item price analysis and shopping list.
 * @param {!object} output_data The object created by generateOutputFormat.
 * @param {!number} indent The number of spaces the current level should be indented.
 */
function textFriendlyOutputFormat(output_data, indent) {
    /*
     * Output format:
     * Item
     *   Price Data (hih/low/average)
     *   Recipe Options
     *     Recipe
     *       Component Price
     *   Best Component Crafting Cost
     *   Worst Componenet Crafting Cost
     *   Average Component Crafting Cost
    */

    let return_string = '';

    //logger.debug('Building Formatted Price List');

    return_string += indentAdder(indent) + `${output_data.name} (${output_data.id}) Requires ${output_data.required}\n`;
    if ((output_data.ah !== undefined) && (output_data.ah.sales > 0)) {
        return_string += indentAdder(indent + 1) + `AH ${output_data.ah.sales}: ${goldFormatter(output_data.ah.high)}/${goldFormatter(output_data.ah.low)}/${goldFormatter(output_data.ah.average)}\n`;
    }
    if (output_data.vendor > 0) {
        return_string += indentAdder(indent + 1) + `Vendor ${goldFormatter(output_data.vendor)}\n`;
    }
    if (output_data.recipes !== undefined) {
        for (let recipe_option of output_data.recipes) {
            return_string += indentAdder(indent + 1) + `${recipe_option.name} - ${recipe_option.rank} - (${recipe_option.id}) : ${goldFormatter(recipe_option.high)}/${goldFormatter(recipe_option.low)}/${goldFormatter(recipe_option.average)}\n`;
            if ((recipe_option.ah != undefined) && (recipe_option.ah.sales > 0)) {
                return_string += indentAdder(indent + 2) + `AH ${recipe_option.ah.sales}: ${goldFormatter(recipe_option.ah.high)}/${goldFormatter(recipe_option.ah.low)}/${goldFormatter(recipe_option.ah.average)}\n`;
            }
            return_string += '\n';
            if (recipe_option.parts != undefined) {
                for (let opt of recipe_option.parts) {
                    return_string += textFriendlyOutputFormat(opt, indent + 2)
                    return_string += '\n'
                }
            }
        }
    }

    if (output_data.bonus_prices !== undefined) {
        for (const bonus_price of output_data.bonus_prices) {
            return_string += indentAdder(indent + 2) + `${output_data.name} (${output_data.id}) iLvl ${bonus_price.level}\n`;
            return_string += indentAdder(indent + 3) + `AH ${bonus_price.ah.sales}: ${goldFormatter(bonus_price.ah.high)}/${goldFormatter(bonus_price.ah.low)}/${goldFormatter(bonus_price.ah.average)}\n`;
        }
    }

    //logger.debug('Building formatted shopping list');
    // Add lists if it's appropriate
    if ('shopping_lists' in output_data && Object.keys(output_data.shopping_lists).length > 0) {
        return_string += indentAdder(indent) + `Shopping List For: ${output_data.name}\n`;
        for (let list of Object.keys(output_data.shopping_lists)) {
            return_string += indentAdder(indent + 1) + `List for rank ${list}\n`;
            for (let li of output_data.shopping_lists[list]) {
                return_string += indentAdder(indent + 2) + `[${(new String(li.quantity)).padStart(8, ' ')}] -- ${li.name} (${li.id})\n`;
                if (li.cost.vendor != undefined) {
                    return_string += indentAdder(indent + 10);
                    return_string += `vendor: ${goldFormatter(li.cost.vendor)}\n`;
                }
                if (li.cost.ah != undefined) {
                    return_string += indentAdder(indent + 10);
                    return_string += `ah: ${goldFormatter(li.cost.ah.high)}/${goldFormatter(li.cost.ah.low)}/${goldFormatter(li.cost.ah.average)}\n`;
                }
            }
        }
    }

    return return_string;
}

/**
 * Return the ranks available for the top level item generated from generateOutputFormat.
 * @param {!object} intermediate_data Data from generateOutputFormat.
 */
function getShoppingListRanks(intermediate_data) {
    const ranks = [];
    for (let recipe of intermediate_data.recipes) {
        ranks.push(recipe.rank);
    }
    return ranks;
}

/**
 * Construct a shopping list given a provided inventory object.
 * @param {!object} intermediate_data Data from generateOutputFormat.
 * @param {!RunConfiguration} on_hand A provided inventory to get existing items from.
 */
function constructShoppingList(intermediate_data, on_hand) {
    const shopping_lists = {};
    for (let rank of getShoppingListRanks(intermediate_data)) {
        logger.debug(`Resetting inventory for rank shopping list.`);
        on_hand.resetInventoryAdjustments();
        const shopping_list = build_shopping_list(intermediate_data, rank);
        for (let li of shopping_list) {
            let needed = li.quantity;
            let available = on_hand.itemCount(li.id);

            logger.debug(`${li.name} (${li.id}) ${needed} needed with ${available} available`);
            if (needed <= available) {
                logger.debug(`${li.name} (${li.id}) used ${needed} of the available ${available}`);
                needed = 0;
                on_hand.adjustInventory(li.id, (needed * -1));
            } else if ((needed > available) && (available != 0)) {
                needed -= available;
                logger.debug(`${li.name} (${li.id}) used all of the available ${available} and still need ${needed}`);
                on_hand.adjustInventory(li.id, (available * -1));
            }

            li.quantity = needed;

            // Update the cost for this list item
            if (li.cost.vendor !== undefined) {
                li.cost.vendor *= li.quantity;
            }
            if (li.cost.ah !== undefined) {
                li.cost.ah.high *= li.quantity;
                li.cost.ah.low *= li.quantity;
                li.cost.ah.average *= li.quantity;
            }
        }
        shopping_lists[rank] = shopping_list;
    }
    return shopping_lists;
}

/**
 * Build a raw shopping list using generateOutputFormat data, ignores inventory information.
 * @param {!object} intermediate_data The generateOutputFormat data used for construction.
 * @param {number} rank_requested The specific rank to generate a list for, only matters for legendary base items in Shadowlands.
 */
function build_shopping_list(intermediate_data, rank_requested) {
    let shopping_list = [];

    logger.debug(`Build shopping list for ${intermediate_data.name} (${intermediate_data.id}) rank ${rank_requested}`);

    let needed = intermediate_data.required;

    if (intermediate_data.recipes.length == 0) {
        shopping_list.push({
            id: intermediate_data.id,
            name: intermediate_data.name,
            quantity: intermediate_data.required,
            cost: {
                ah: intermediate_data.ah,
                vendor: intermediate_data.vendor,
            },
        });
        logger.debug(`${intermediate_data.name} (${intermediate_data.id}) cannot be crafted.`);
    } else {
        for (let recipe of intermediate_data.recipes) {
            // Make sure the recipe isn't on the exclusion list
            if (shopping_recipe_exclusions.exclusions.includes(recipe.id)) {
                logger.debug(`${recipe.name} (${recipe.id}) is on the exclusion list. Add it directly`);
                shopping_list.push({
                    id: intermediate_data.id,
                    name: intermediate_data.name,
                    quantity: intermediate_data.required,
                    cost: {
                        ah: intermediate_data.ah,
                        vendor: intermediate_data.vendor,
                    },
                });
            } else {
                if (recipe.rank == rank_requested) {
                    for (let part of recipe.parts) {
                        // Only top level searches can have ranks
                        build_shopping_list(part, 0).forEach((sl) => {
                            let al = sl;
                            logger.debug(`Need ${al.quantity} of ${al.name} (${al.id}) for each of ${needed}`)

                            al.quantity = al.quantity * needed;

                            shopping_list.push(al);
                        });
                    }
                } else {
                    logger.debug(`Skipping recipe ${recipe.id} because its rank (${recipe.rank}) does not match the requested rank (${rank_requested})`);
                }
            }
        }
    }

    // Build the return shopping list.
    let tmp = {};
    let ret_list = [];
    //logger.debug(shopping_list);
    for (let list_element of shopping_list) {
        if (!(list_element.id in tmp)) {
            tmp[list_element.id] = {
                id: list_element.id,
                name: list_element.name,
                quantity: 0,
                cost: list_element.cost,
            };
        }
        tmp[list_element.id].quantity += list_element.quantity;
    }
    Object.keys(tmp).forEach((id) => {
        ret_list.push(tmp[id]);
    });

    return ret_list;
}

//outline
// [X] Get the item and server from the user
// [X] If the item is a string then get the item ID from bliz
// [X] Get the connected-server id from bliz
// [X] Verify that the item is a crafting item and pull requirements from bliz
// [X] Check the auction house cache and refresh it if necessary (probably if it is older than one hour)
// [X] Pull all the prices for the item from the auction house cache
// [X] Pull all the prices for the components from the auction house
// [X] Check if there is a non-crafting/non-auction price for the components
// [ ] Print the summary of the item price from auction house and the component prices

/**
 * Perform a full run of the profit analyzer, beginning with profit analyze and finishing with various output formats.
 * 
 * @param {!string} region The region in which to search.
 * @param {!server} server The server on which the profits should be calculated.
 * @param {!Array<string>} professions An array of available professions.
 * @param {!string|number} item The item id or name to analyze.
 * @param {!RunConfiguration} json_config A RunConfiguration object containing the available inventory.
 * @param {!number} count The number of items required.
 */
async function run(region, server, professions, item, json_config, count) {
    logger.info("World of Warcraft Crafting Profit Calculator");

    logger.info(`Checking ${server} in ${region} for ${item} with available professions ${JSON.stringify(professions)}`);

    let intermediate_data = {};
    let price_data = {};
    let formatted_data = 'NO DATA';

    try {
        price_data = await performProfitAnalysis(region, server, professions, item, count);
        intermediate_data = await generateOutputFormat(price_data, region);
        intermediate_data.shopping_lists = constructShoppingList(intermediate_data, json_config);
        formatted_data = await textFriendlyOutputFormat(intermediate_data, 0);
    } catch (e) {
        logger.error(`Error building output for ${region}:${server} ${item}`, e);
        console.log(e);
    }

    return {
        price: price_data,
        intermediate: intermediate_data,
        formatted: formatted_data,
    }
}

/**
 * Shutdown the analyzer, primarily closes cache.
 */
async function shutdown() {
    await saveCache();
    shutdownApiManager();
}

/**
 * Save the generated output to the filesystem.
 * @param price_data The price data.
 * @param intermediate_data The output cost object with shopping list.
 * @param formatted_data The preformatted text output with shopping list.
 */
async function saveOutput(price_data, intermediate_data, formatted_data) {
    logger.info('Saving output');
    await fs.writeFile('intermediate_output.json', JSON.stringify(intermediate_data, null, 2), 'utf8');
    logger.info('Intermediate output saved');
    await fs.writeFile('formatted_output', formatted_data, 'utf8');
    logger.info('Formatted output saved');
    await fs.writeFile('raw_output.json', JSON.stringify(price_data, null, 2), 'utf8');
    logger.info('Raw output saved');
}

/**
 * Perform a run with pure json configuration from the addon.
 * @param {RunConfiguration} json_config The configuration object.
 */
async function runWithJSONConfig(json_config) {
    return await run(json_config.realm_region,
        json_config.realm_name,
        json_config.professions,
        json_config.item_id,
        json_config,
        json_config.item_count
    );
}

/**
 * Run from the command prompt.
 * @param {RunConfiguration} json_config The configuration object to execute.
 */
async function cliRun(json_config) {
    try {
        const { price, intermediate, formatted } = await runWithJSONConfig(json_config);
        await saveOutput(price, intermediate, formatted);
    } finally {
        await shutdown();
    }
}

export { runWithJSONConfig, shutdown, cliRun };
