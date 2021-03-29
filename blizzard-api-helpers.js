import { getBlizzardAPIResponse, getBlizzardRawUriResponse } from './blizzard-api-call.js';
import { getAuthorizationToken } from './blizz_oath.js';
import { parentLogger } from './logging.js';
import { cacheCheck, cacheGet, cacheSet, saveCache } from './cached-data-sources.js';

const logger = parentLogger.child();

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
const PROFESSION_DETAIL_CACHE = 'profession_detail_data';
const PROFESSION_LIST_CACHE = 'regional_profession_list';
const COMPOSITE_REALM_NAME_CACHE = 'connected_realm_detail';

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
        await cacheSet(ITEM_SEARCH_CACHE, item_name, -1);
        logger.error(`No items match search ${item_name}`);
        throw (new Error('No Results'));
    }

    //if (item_id > 0) {
    await cacheSet(ITEM_SEARCH_CACHE, item_name, item_id);
    //}

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
 * Return a list of all connected realms available within a region.
 * @param {string} region Region to return list of connected realms.
 * @param {object} token An OATH access token to use for the request.
 */
async function getAllConnectedRealms(region, token) {
    const list_connected_realms_api = '/data/wow/connected-realm/index';
    const list_connected_realms_form = {
        'namespace': 'dynamic-us',
        'locale': 'en_US'
    };

    return getBlizzardAPIResponse(
        region,
        token,
        list_connected_realms_form,
        list_connected_realms_api);
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

    const get_connected_realm_form = {
        'namespace': 'dynamic-us',
        'locale': 'en_US'
    };
    const access_token = await getAuthorizationToken();

    let realm_id = 0;

    // Get a list of all connected realms
    const all_connected_realms = await getAllConnectedRealms(server_region, access_token);

    // Pull the data for each connection until you find one with the server name in question
    for (let realm_href of all_connected_realms.connected_realms) {
        const hr = realm_href.href;
        const connected_realm_detail = await getBlizzardRawUriResponse(access_token, get_connected_realm_form, hr);
        const realm_list = connected_realm_detail.realms;
        let found_realm = false;
        for (let rlm of realm_list) {
            logger.debug(`Realm ${rlm.name}`);
            if (rlm.name.localeCompare(server_name, undefined, { sensitivity: 'accent' }) == 0) {
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

    await cacheSet(CONNECTED_REALM_ID_CACHE, connected_realm_key, realm_id);
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

    await cacheSet(ITEM_DATA_CACHE, key, result);
    return result;
}

/**
 * Get a list of all professions available.
 * @param {!string} region The region to search
 */
async function getBlizProfessionsList(region) {
    const key = region;
    const profession_list_uri = '/data/wow/profession/index'; // professions.name / professions.id

    if (await cacheCheck(PROFESSION_LIST_CACHE, key)) {
        return cacheGet(PROFESSION_LIST_CACHE, key);
    }

    const result = await getBlizzardAPIResponse(region, await getAuthorizationToken(), {
        'namespace': 'static-us',
        'locale': 'en_US'
    }, profession_list_uri);

    await cacheSet(PROFESSION_LIST_CACHE, key, result);

    return result;
}

/**
 * Get the details for the specified profession.
 * @param profession_id The id of the profession to fetch.
 * @param region The region in which to search.
 */
async function getBlizProfessionDetail(profession_id, region) {
    const key = `${region}::${profession_id}`;

    if (await cacheCheck(PROFESSION_DETAIL_CACHE, key)) {
        return cacheGet(PROFESSION_DETAIL_CACHE, key);
    }

    const profession_detail_uri = `/data/wow/profession/${profession_id}`; // skill_tiers.name skill_tiers.id
    const result = await getBlizzardAPIResponse(region, await getAuthorizationToken(), {
        'namespace': 'static-us',
        'locale': 'en_US'
    },
        profession_detail_uri);

    await cacheSet(PROFESSION_DETAIL_CACHE, key, result);
    return result;
}

async function getBlizConnectedRealmDetail(connected_realm_id, region) {
    const key = `${region}::${connected_realm_id}`;

    if (await cacheCheck(COMPOSITE_REALM_NAME_CACHE, key)) {
        return cacheGet(COMPOSITE_REALM_NAME_CACHE, key);
    }

    const connected_realm_detail_uri = `/data/wow/connected-realm/${connected_realm_id}`; // skill_tiers.name skill_tiers.id
    const result = await getBlizzardAPIResponse(region, await getAuthorizationToken(), {
        'namespace': 'dynamic-us',
        'locale': 'en_US'
    },
        connected_realm_detail_uri);

    await cacheSet(COMPOSITE_REALM_NAME_CACHE, key, result);
    return result;
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

    await cacheSet(PROFESSION_SKILL_TIER_DETAILS_CACHE, key, result);

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

    await cacheSet(PROFESSION_RECIPE_DETAIL_CACHE, key, result);

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
            await cacheSet(CRAFTABLE_BY_PROFESSION_SET_CACHE, key, recipe_options);
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

    await cacheSet(CRAFTABLE_BY_PROFESSION_SET_CACHE, key, recipe_options);
    //{craftable: found_craftable, recipe_id: found_recipe_id, crafting_profession: found_profession};
    return recipe_options;
}

function getProfessionId(profession_list, profession_name) {
    return profession_list.professions.find((item) => {
        return (item.name.localeCompare(profession_name, undefined, { sensitivity: 'accent' }) == 0);
    }).id;
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

    const check_profession_id = getProfessionId(profession_list, prof);

    // Get a list of the crafting levels for the professions
    const profession_detail = await getBlizProfessionDetail(check_profession_id, region);
    const crafting_levels = profession_detail.skill_tiers;

    logger.debug(`Scanning profession: ${profession_detail.name}`);

    // checkProfessionTierCrafting on each crafting level, concurrently.
    await Promise.all(crafting_levels.map((tier) => {
        return checkProfessionTierCrafting(tier, region);
    }));

    await cacheSet(CRAFTABLE_BY_SINGLE_PROFESSION_CACHE, cache_key, profession_recipe_options);

    return profession_recipe_options;

    /**
     * Scan a tier of a given profession to see if it can craft an item.
     * @param skill_tier The tier level to check.
     */
    async function checkProfessionTierCrafting(skill_tier, region) {
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
                        logger.silly(`Check recipe ${recipe.name}`);
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

                            if (!crafty && skill_tier.name.includes('Enchanting') && (cat.name.includes('Enchantments') || cat.name.includes('Echantments'))) {
                                logger.debug(`Checking if uncraftable item ${item_detail.id} is craftable with a synthetic item-recipe connection.`);
                                const slot = getSlotName(cat);
                                const synthetic_item_name = `Enchant ${slot} - ${rec.name}`;
                                logger.silly(`Generated synthetic item name ${synthetic_item_name}.`);
                                const synthetic_item_id = await getItemId(region, synthetic_item_name);
                                logger.silly(`Synthetic item ${synthetic_item_name} has id ${synthetic_item_id}`);
                                if (synthetic_item_id === item_id) {
                                    crafty = true;
                                    logger.debug(`Synthetic item ${synthetic_item_name} match for ${item_detail.name}.`);
                                }
                            }
                            else {
                                logger.silly(`Skipping synthetic for ${crafty} (${!crafty}) ${skill_tier.name} (${skill_tier.name.includes('Enchanting')}) ${cat.name} (${cat.name.includes('Enchantments')}) ${rec.name}`);
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
                            logger.silly(`Skipping Recipe: (${recipe.id}) "${recipe.name}"`);
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

function getSlotName(category) {
    const name = category.name;

    let raw_slot_name = name;

    if(name.includes('Enchantments')){
        raw_slot_name = name.slice(0, name.lastIndexOf('Enchantments') - 1);
    }else if(name.includes('Echantments')){
        raw_slot_name = name.slice(0, name.lastIndexOf('Echantments') - 1);
    }

    switch (raw_slot_name) {
        case 'Boot':
            return 'Boots';
        case 'Glove':
            return 'Gloves';
        case 'Chest':
        case 'Cloak':
        case 'Bracer':
        case 'Ring':
        case 'Weapon':
        default:
            return raw_slot_name;
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

    await cacheSet(AUCTION_DATA_CACHE, server_id, ah);

    return ah;
}

export {
    getItemId, getConnectedRealmId, getItemDetails, getBlizProfessionsList, getBlizProfessionDetail,
    getBlizSkillTierDetail, getBlizRecipeDetail, checkIsCrafting, getCraftingRecipe, getAuctionHouse,
    getBlizConnectedRealmDetail
};