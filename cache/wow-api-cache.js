const fs = require('fs/promises');

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

async function saveCache(logger) {
    if(logger === undefined){
        logger = console;
    }
    await fs.writeFile(`cache/${cache_name}`, JSON.stringify(cached_data), 'utf8');
    logger.info('Cache saved');
}

module.exports = cached_data;
module.exports.saveCache = saveCache;