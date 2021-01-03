const got = require('got');
const yargs = require('yargs');
const fs = require('fs');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.json(),
    //defaultMeta: { service: 'user-service' },
    transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

const secrets = require('./secrets.json');
const clientID = '9d85a3dfca994efa969df07bd1e47695';
const clientSecret = secrets.keys.client_secret;

const raidbots_bonus_lists = require('./bonuses.json');
const rankings = require('./rank_mappings.json');

const cache_name = './data-cache.json';

try {
    cached_data = require(cache_name);
} catch (e) {
    cached_data = {
        fetched_auction_houses: [],
        fetched_auctions_data: {},
        auction_house_fetch_dtm: {},
        fetched_profession_skill_tier_details: [],
        fetched_profession_skill_tier_detail_data: {},
        fetched_profession_skill_tier_dtm: {},
        fetched_profession_recipe_details: [],
        fetched_profession_recipe_detail_data: {},
        fetched_profession_recipe_detail_dtm: {},
        fetched_items: [],
        fetched_item_data: {},
        fetched_item_dtm: {},
        connected_realms: [],
        connected_realm_data: {},
        connected_realm_dtm: {}
    };
}

const local_cache = {
    craftable: {}
};

const base_uri = 'api.blizzard.com';

const authorization_uri = 'https://us.battle.net/oauth/token';
let clientAccessToken = {
    access_token: '',
    token_type: '',
    expires_in: 0,
    scope: '',
    fetched: Date.now(),
    checkExpired: function () {
        let expired = true;
        const current_time = Date.now();
        const expire_time = this.fetched + (this.expires_in * 1000);
        if (current_time < expire_time) {
            expired = false;
        }
        return expired;
    },
};

const exclude_before_shadowlands = false;

function saveCache() {
    fs.writeFile(cache_name, JSON.stringify(cached_data), 'utf8', () => {
        logger.info('Cache saved');
    });
}

async function getAuthorizationToken() {
    if (clientAccessToken.checkExpired()) {
        try {
            const auth_response = await got(authorization_uri, {
                responseType: 'json',
                method: 'POST',
                username: clientID,
                password: clientSecret,
                headers: {
                    'Connection': 'keep-alive'
                },
                form: {
                    'grant_type': 'client_credentials',
                }
            });
            clientAccessToken.access_token = auth_response.body.access_token;
            clientAccessToken.token_type = auth_response.body.token_type;
            clientAccessToken.expires_in = auth_response.body.expires_in;
            clientAccessToken.scope = auth_response.body.scope;
            clientAccessToken.fetched = Date.now();
        } catch (error) {
            logger.error("An error was encountered while retrieving an authorization token: " + error);
        }
    }
    return clientAccessToken;
}

async function getBlizzardAPIResponse(region_code, authorization_token, data, uri) {
    try {
        // CHECK OUT TEMPLATE STRING FOR MORE USEES
        const api_response = await got(`https://${region_code}.${base_uri}${uri}`, {
            reponseType: 'json',
            method: 'GET',
            headers: {
                'Connection': 'keep-alive',
                'Authorization': `Bearer ${authorization_token.access_token}`
            },
            searchParams: data
        }).json();
        return api_response;
    } catch (error) {
        logger.error('Issue fetching blizzard data: (' + `https://${region_code}.${base_uri}${uri}` + ') ' + error);
    }
}

//To Do: No idea how to get id from name
async function getItemId(item_name) { }

async function getConnectedRealmId(server_name, server_region) {
    const connected_realm_key = `${server_region}::${server_name}`;

    if (!cached_data.connected_realms.includes(connected_realm_key)) {
        cached_data.connected_realms.push(connected_realm_key);

        const list_connected_realms_api = '/data/wow/connected-realm/index';
        const get_connected_realm_api = '/data/wow/connected-realm'; // /{connectedRealmId}
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
                if (rlm.name['en_US'].localeCompare(server_name, undefined, { sensitivity: 'accent' })) {
                    found_realm = true;
                    break;
                }
            }
            if (found_realm == true) {
                realm_id = connected_realm_detail.id;
                break;
            }
        }

        cached_data.connected_realm_data[connected_realm_key] = realm_id;
        cached_data.connected_realm_dtm[connected_realm_key] = Date.now();
    }

    // Return that connected realm ID
    return cached_data.connected_realm_data[connected_realm_key];
}

async function getItemDetails(item_id, region) {
    const key = item_id
    if (!cached_data.fetched_items.includes(key)) {
        cached_data.fetched_items.push(key);

        const profession_item_detail_uri = `/data/wow/item/${item_id}`;
        //categories[array].recipes[array].name categories[array].recipes[array].id
        cached_data.fetched_item_data[key] = await getBlizzardAPIResponse(region, await getAuthorizationToken(), {
            'namespace': 'static-us',
            'locale': 'en_US'
        },
            profession_item_detail_uri);
        cached_data.fetched_item_dtm[key] = Date.now();
    }
    return cached_data.fetched_item_data[key];
}

async function getBlizProfessionsList(region) {
    const profession_list_uri = '/data/wow/profession/index'; // professions.name / professions.id
    return await getBlizzardAPIResponse(region, await getAuthorizationToken(), {
        'namespace': 'static-us',
        'locale': 'en_US'
    }, profession_list_uri);
}
async function getBlizProfessionDetail(profession_id, region) {
    const profession_detail_uri = `/data/wow/profession/${profession_id}`; // skill_tiers.name skill_tiers.id
    return await getBlizzardAPIResponse(region, await getAuthorizationToken(), {
        'namespace': 'static-us',
        'locale': 'en_US'
    },
        profession_detail_uri);
}
async function getBlizSkillTierDetail(profession_id, skillTier_id, region) {
    const key = `${region}::${profession_id}::${skillTier_id}`;
    if (!cached_data.fetched_profession_skill_tier_details.includes(key)) {
        cached_data.fetched_profession_skill_tier_details.push(key);

        const profession_skill_tier_detail_uri = `/data/wow/profession/${profession_id}/skill-tier/${skillTier_id}`;
        //categories[array].recipes[array].name categories[array].recipes[array].id
        cached_data.fetched_profession_skill_tier_detail_data[key] = await getBlizzardAPIResponse(region, await getAuthorizationToken(), {
            'namespace': 'static-us',
            'locale': 'en_US'
        },
            profession_skill_tier_detail_uri);
        cached_data.fetched_profession_skill_tier_dtm[key] = Date.now();
    }
    return cached_data.fetched_profession_skill_tier_detail_data[key];
}

async function getBlizRecipeDetail(recipe_id, region) {
    const key = `${region}::${recipe_id}`;
    if (!cached_data.fetched_profession_recipe_details.includes(key)) {
        cached_data.fetched_profession_recipe_details.push(key);

        const profession_recipe_uri = `/data/wow/recipe/${recipe_id}`;
        //crafted_item.name crafted_item.id / reagents[array].name reagents[array].id reagents[array].quantity

        cached_data.fetched_profession_recipe_detail_data[key] = await getBlizzardAPIResponse(region, await getAuthorizationToken(), {
            'namespace': 'static-us',
            'locale': 'en_US'
        },
            profession_recipe_uri);
        cached_data.fetched_profession_recipe_detail_dtm[key] = Date.now();
    }
    return cached_data.fetched_profession_recipe_detail_data[key];
}

async function checkIsCrafting(item_id, character_professions, region) {
    // Check if we've already run this check, and if so return the cached version, otherwise keep on
    const key = `${region}::${item_id}::${character_professions}`;
    if (local_cache.craftable.hasOwnProperty(key)) {
        return local_cache.craftable[key];
    }

    const profession_list = await getBlizProfessionsList(region);

    const recipe_options = {
        craftable: false,
        recipes: [],
        recipe_ids: []
    };

    // Check if a vendor is mentioned in the item description and if so just short circuit
    const item_detail = await getItemDetails(item_id, region);
    if (item_detail.hasOwnProperty('description')) {
        if (item_detail.description.includes('vendor')) {
            logger.info('Skipping vendor recipe');
            local_cache.craftable[key] = recipe_options;
            return local_cache.craftable[key];
        }
    }

    for (let prof of character_professions) {
        //if( !found_craftable ){
        const check_profession_id = profession_list.professions.find((item) => {
            return (item.name.localeCompare(prof, undefined, { sensitivity: 'accent' }) == 0);
        }).id;

        // Get a list of the crafting levels for the professions
        const profession_detail = await getBlizProfessionDetail(check_profession_id, region);
        const crafting_levels = profession_detail.skill_tiers;

        let tier_checks = [];

        for (let skill_tier of crafting_levels) {
            //only run on shadowlands tiers, unless exclude_before_shadowlands is set to false
            //skill_tier.name.includes('Shadowlands') (is in shadowlands)
            let check_scan_tier = skill_tier.name.includes('Shadowlands');
            if (!exclude_before_shadowlands) {
                check_scan_tier = true;
            }
            if (check_scan_tier) {
                tier_checks.push(checkCraftingTier(skill_tier, check_profession_id, prof));
            }
        }
        await Promise.all(tier_checks);
    }
    local_cache.craftable[key] = recipe_options; //{craftable: found_craftable, recipe_id: found_recipe_id, crafting_profession: found_profession};
    return local_cache.craftable[key];

    async function checkCraftingTier(skill_tier, check_profession_id, prof) {
        logger.debug(`Checking: ${skill_tier.name} for: ${item_id}`);
        // Get a list of all recipes each level can do
        const skill_tier_detail = await getBlizSkillTierDetail(check_profession_id, skill_tier.id, region);
        const categories = skill_tier_detail.categories;

        for (let cat of categories) {
            for (let rec of cat.recipes) {
                const recipe = await getBlizRecipeDetail(rec.id, region);
                if (!(recipe.name.includes('Prospect') || recipe.name.includes('Mill'))) {
                    let crafty = false;
                    if (recipe.hasOwnProperty('alliance_crafted_item')) {
                        if (recipe.alliance_crafted_item.id == item_id) {
                            crafty = true;
                        }
                    }
                    if (recipe.hasOwnProperty('horde_crafted_item')) {
                        if (recipe.horde_crafted_item.id == item_id) {
                            crafty = true;
                        }
                    }
                    if (recipe.hasOwnProperty('crafted_item')) {
                        if (recipe.crafted_item.id == item_id) {
                            crafty = true;
                        }
                    }
                    if (crafty) {
                        logger.debug(`Found recipe (${recipe.id}): ${recipe.name}`);

                        recipe_options.recipes.push(
                            {
                                recipe_id: recipe.id,
                                crafting_profession: prof
                            }
                        );
                        recipe_options.recipe_ids.push(recipe.id);
                        recipe_options.craftable = true;

                    }
                } /*else {
                    logger.debug(`Skipping Recipe: (${recipe.id}) "${recipe.name}"`);
                }*/
            }
        }
    }
}

async function getCraftingRecipe(recipe_id, region) {
    const recipe = await getBlizRecipeDetail(recipe_id, region);
    return recipe;
}
async function getAuctionHouse(server_id, server_region) {
    // Download the auction house for the server_id
    // If the auction house is older than an hour then remove it from the cached_data.fetched_auction_houses array
    if (cached_data.auction_house_fetch_dtm.hasOwnProperty(server_id)) {
        if ((cached_data.auction_house_fetch_dtm[server_id] + 3.6e+6) < Date.now()) {
            logger.info('Auction house is out of date, fetching it fresh.')
            const index = cached_data.fetched_auction_houses.indexOf(server_id);
            if (index > -1) {
                cached_data.fetched_auction_houses.splice(index, 1);
            }
        }
    }

    if (!cached_data.fetched_auction_houses.includes(server_id)) {
        cached_data.fetched_auction_houses.push(server_id);

        const auction_house_fetch_uri = `/data/wow/connected-realm/${server_id}/auctions`;
        const auth_token = await getAuthorizationToken();
        cached_data.fetched_auctions_data[server_id] = await getBlizzardAPIResponse(
            server_region,
            await getAuthorizationToken(),
            {
                'namespace': 'dynamic-us',
                'locale': 'en_US'
            },
            auction_house_fetch_uri);
        cached_data.auction_house_fetch_dtm[server_id] = Date.now();
    }

    return cached_data.fetched_auctions_data[server_id];
}

/**
 * Find the value of an item on the auction house.
 * Items might be for sale on the auction house and be available from vendors.
 * The auction house items have complicated bonus types.
 * @param {number} item_id 
 * @param {object} auction_house 
 */
async function getAHItemPrice(item_id, auction_house, bonus_level_required) {
    // Find the item and return best, worst, average prices
    // Ignore everything but buyout auctions
    let buy_out_item_high = Number.MIN_VALUE;
    let buy_out_item_low = Number.MAX_VALUE;
    let buy_out_item_average = 0;
    let buy_out_average_counter = 0;
    let buy_out_average_accumulator = 0;

    let bid_item_high = Number.MIN_VALUE;
    let bid_item_low = Number.MAX_VALUE;
    let bid_item_average = 0;
    let bid_average_counter = 0;
    let bid_average_accumulator = 0;

    /**
     * Issue: for items with multiple version availble on the auction house
     * you will find that they all have the same id. The difference comes
     * from the 'bonus_lists' array
     */
    auction_house.auctions.forEach((auction) => {
        if (auction.item.id == item_id) {
            //logger.debug(auction);
            if (((bonus_level_required != undefined) && (auction.item.hasOwnProperty('bonus_lists') && auction.item.bonus_lists.includes(bonus_level_required))) || (bonus_level_required == undefined)) {
                if (auction.hasOwnProperty('buyout')) {
                    if (auction.buyout > buy_out_item_high) {
                        buy_out_item_high = auction.buyout;
                    }
                    if (auction.buyout < buy_out_item_low) {
                        buy_out_item_low = auction.buyout;
                    }
                    buy_out_average_counter += auction.quantity;
                    buy_out_average_accumulator += (auction.buyout * auction.quantity);
                } else {
                    if (auction.unit_price > bid_item_high) {
                        bid_item_high = auction.unit_price;
                    }
                    if (auction.unit_price < bid_item_low) {
                        bid_item_low = auction.unit_price;
                    }
                    bid_average_counter += auction.quantity;
                    bid_average_accumulator += (auction.unit_price * auction.quantity);
                }
            }
        }
    });
    buy_out_item_average = buy_out_average_accumulator / buy_out_average_counter;
    bid_item_average = bid_average_accumulator / bid_average_counter;

    return {
        buyout: {
            high: buy_out_item_high,
            low: buy_out_item_low,
            total_sales: buy_out_average_counter,
            average: buy_out_item_average
        },
        bid: {
            high: bid_item_high,
            low: bid_item_low,
            total_sales: bid_average_counter,
            average: bid_item_average
        }
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
    if (item.hasOwnProperty('description')) {
        if (item.description.includes('vendor')) {
            vendor_price = item.purchase_price;
        }
        if (!item.description.includes('auction')) {
            vendor_price = item.purchase_price;
        }
    }else{
        vendor_price = item.purchase_price;
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
            if (auction.item.hasOwnProperty('bonus_lists')) {
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
    logger.debug(`${item_id} has ${bonus_lists_set.length} bonus lists.`);
    return bonus_lists_set;
}

function getLvlModifierForBonus(bonus_id) {
    if (raidbots_bonus_lists.hasOwnProperty(bonus_id)) {
        return raidbots_bonus_lists[bonus_id].level;
    } else {
        return -1;
    }
}

async function performProfitAnalysis(region, server, character_professions, item, qauntity, desired_ilvl) {
    // Check if we have to figure out the item id ourselves
    let item_id = 0;
    if (Number.isFinite(item)) {
        item_id = item;
    } else {
        item_id = await getItemId(item);
    }

    const item_detail = await getItemDetails(item_id, region);

    const base_ilvl = item_detail.level;

    let price_obj = {
        item_id: item_id,
        item_name: item_detail.name
    };

    logger.info("Checking: " + item_detail.name);

    // Get the realm id
    const server_id = await getConnectedRealmId(server, region);
    logger.debug(`Connected Realm ID: ${server_id}`);

    //Get the auction house
    auction_house = await getAuctionHouse(server_id, region);

    // Get Item AH price
    price_obj.ah_price = await getAHItemPrice(item_id, auction_house);

    price_obj.item_quantity = qauntity;

    const item_craftable = await checkIsCrafting(item_id, character_professions, region);
    
    // Get NON AH price
    if(!item_craftable.craftable){
        price_obj.vendor_price = await findNoneAHPrice(item_id);
    }else{
        price_obj.vendor_price = -1;
    }
    
    
    price_obj.crafting_status = item_craftable;

    // Eventually bonus_lists should be treated as separate items and this should happen first
    // When that's the case we should actually return an entire extra set of price data based on each
    // possible bonus_list. They're actually different items, blizz just tells us they aren't.
    price_obj.bonus_lists = await getItemBonusLists(item_id, auction_house);
    let bonus_link = {};
    for (let bl of price_obj.bonus_lists) {
        for (let b of bl) {
            const mod = getLvlModifierForBonus(b);
            if (mod != -1) {
                const new_level = base_ilvl + mod
                bonus_link[new_level] = b;
                logger.debug(`Bonus level ${b} results in crafted ilvl of ${new_level}`);
            }
        }
    }
    const recipe_id_list = item_craftable.recipe_ids.sort();

    price_obj.recipe_options = [];

    if (item_craftable.craftable) {
        for (let recipe of item_craftable.recipes) {
            // Get Reagents
            const item_bom = await getCraftingRecipe(recipe.recipe_id, region);

            // Get prices for BOM
            let bom_prices = [];

            let bom_promises = [];

            for (let reagent of item_bom.reagents) {
                bom_promises.push(performProfitAnalysis(region, server, character_professions, reagent.reagent.id, reagent.quantity));
            }

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
        logger.debug(`Item not craftable with professions: ${character_professions}`);
    }

    return price_obj;
}

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
            logger.debug('Use vendor price');
        } else if (component.crafting_status.craftable == false) {
            let high = Number.MIN_VALUE;
            let low = Number.MAX_VALUE;
            let average = 0;
            let count = 0;
            if (component.ah_price.bid.total_sales > 0) {
                average += component.ah_price.bid.average;
                if (component.ah_price.bid.high > high) {
                    high = component.ah_price.bid.high;
                }
                if (component.ah_price.bid.low < low) {
                    low = component.ah_price.bid.low;
                }
                count++;
            } if (component.ah_price.buyout.total_sales > 0) {
                average += component.ah_price.buyout.average;
                if (component.ah_price.buyout.high > high) {
                    high = component.ah_price.buyout.high;
                }
                if (component.ah_price.buyout.low < low) {
                    low = component.ah_price.buyout.low;
                }
                count++;
            }
            cost.average += (average / count) * component.item_quantity;
            cost.high += high * component.item_quantity;
            cost.low += low * component.item_quantity;
            logger.debug('Using AH price: uncraftable');
        } else {
            logger.debug('Using recursion price')
            let ave_acc = 0;
            let ave_cnt = 0;

            let high = Number.MIN_VALUE;
            let low = Number.MAX_VALUE;

            let rc_price_promises = [];
            for (let opt of component.recipe_options) {
                rc_price_promises.push( recipeCostCalculator(opt));
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

async function recipeCostPrint(recipe_option) {

}

function indentAdder(level) {
    let str = '';
    for (let i = 0; i < level; i++) {
        str += '  ';
    }
    return str;
}

function goldFormatter(price_in) {
    const price = Math.trunc(price_in);
    const copper = price % 100;
    const silver = (((price % 10000) - copper)) / 100;
    const gold = (price - (price % 10000)) / 10000;
    return `${gold}g ${silver}s ${copper}c`;
}

async function textFriendlyOutputFormat(price_data, indent, region) {
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

    return_string += indentAdder(indent) + `${price_data.item_name} (${price_data.item_id}) Requires ${price_data.item_quantity}\n`;
    if ((price_data.ah_price != undefined) && (price_data.ah_price.bid.total_sales > 0)) {
        return_string += indentAdder(indent + 1) + `AH Bid ${price_data.ah_price.bid.total_sales}: ${goldFormatter(price_data.ah_price.bid.high * price_data.item_quantity)}/${goldFormatter(price_data.ah_price.bid.low * price_data.item_quantity)}/${goldFormatter(price_data.ah_price.bid.average * price_data.item_quantity)}\n`;
    }
    if ((price_data.ah_price != undefined) && price_data.ah_price.buyout.total_sales > 0) {
        return_string += indentAdder(indent + 1) + `AH Buyout ${price_data.ah_price.buyout.total_sales}: ${goldFormatter(price_data.ah_price.buyout.high * price_data.item_quantity)}/${goldFormatter(price_data.ah_price.buyout.low * price_data.item_quantity)}/${goldFormatter(price_data.ah_price.buyout.average * price_data.item_quantity)}\n`;
    }
    if (price_data.vendor_price > 0) {
        return_string += indentAdder(indent + 1) + `Vendor ${goldFormatter(price_data.vendor_price * price_data.item_quantity)}\n`;
    }
    if (price_data.recipe_options != undefined) {
        for (let recipe_option of price_data.recipe_options) {
            const option_price = await recipeCostCalculator(recipe_option);
            const recipe = await getBlizRecipeDetail(recipe_option.recipe.recipe_id, region);
            return_string += indentAdder(indent + 1) + `${recipe.name} - ${recipe_option.rank} - (${recipe_option.recipe.recipe_id}) : ${goldFormatter(option_price.high)}/${goldFormatter(option_price.low)}/${goldFormatter(option_price.average)}\n`;
            if ((recipe_option.rank_ah != undefined) && (recipe_option.rank_ah.bid != undefined) && (recipe_option.rank_ah.bid.total_sales > 0)) {
                return_string += indentAdder(indent + 2) + `AH Bid ${recipe_option.rank_ah.bid.total_sales}: ${goldFormatter(recipe_option.rank_ah.bid.high)}/${goldFormatter(recipe_option.rank_ah.bid.low)}/${goldFormatter(recipe_option.rank_ah.bid.average)}\n`;
            }
            if ((recipe_option.rank_ah != undefined) && (recipe_option.rank_ah.buyout != undefined)  && recipe_option.rank_ah.buyout.total_sales > 0) {
                return_string += indentAdder(indent + 2) + `AH Buyout ${recipe_option.rank_ah.buyout.total_sales}: ${goldFormatter(recipe_option.rank_ah.buyout.high)}/${goldFormatter(recipe_option.rank_ah.buyout.low)}/${goldFormatter(recipe_option.rank_ah.buyout.average)}\n`;
            }
            return_string += '\n';
            if (recipe_option.prices != undefined) {
                for (let opt of recipe_option.prices) {
                    return_string += await textFriendlyOutputFormat(opt, indent + 2, region);
                    return_string += '\n'
                }
            }
        }
    }

    return return_string;
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

function run(region, server, professions, item) {
    logger.info("World of Warcraft Crafting Profit Calculator");

    let price_data = null;

    logger.info(`Checking ${server} in ${region} for ${item} with available professions ${JSON.stringify(professions)}`);

    performProfitAnalysis(region, server, professions, item, 1)
        .then((pd) => {
            price_data = pd;
        }).then(() => {
            logger.info('Saving output');
        }).then(() => {
            return textFriendlyOutputFormat(price_data, 0, region);
        }).then((formatted_data) => {
            fs.writeFile('formatted_output', formatted_data, 'utf8', () => {
                logger.info('Raw output saved');
            });
        }).then(() => {
            fs.writeFile('raw_output.json', JSON.stringify(price_data, null, 2), 'utf8', () => {
                logger.info('Formatted output saved');
            });
        }).finally(saveCache);
}

module.exports.run = run;
module.exports.textFriendlyOutputFormat = textFriendlyOutputFormat;
