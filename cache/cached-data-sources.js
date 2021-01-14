'use strict';
const fs = require('fs/promises');

const global_cache_name = './global-cache.json';

const auction_cache_fn = './auction-data.json';
const profession_skills_cache_fn = './profession-skills-data.json';
const profession_recipe_cache_fn = './profession-recipe-data.json'
const item_cache_fn = './item-data.json';
const realm_cache_fn = './realm-data.json';
const craftable_by_professions_cache_fn = './craftable-by-professions-data.json';
const item_search_results_fn = './item-search-results.json';

const bonuses_cache_fn = './bonuses.json';
const rank_mappings_cache_fn = './rank-mappings.json';
const shopping_recipe_exclusion_list_fn = './shopping-recipe-exclusion-list.json'

let bonuses_cache;
let item_search_results_cache;
let rank_mappings_cache;
let craftable_by_professions_cache;
let shopping_recipe_exclusion_list;
let auction_data;
let profession_skills_data;
let profession_recipe_data;
let item_data;
let realm_data;

try {
    bonuses_cache = require(bonuses_cache_fn);
} catch (e) {
    // We should actually get the bonuses from the source if it's missing.
    // use data-sources.json as a source.
    bonuses_cache = {};
}

try {
    item_search_results_cache = require(item_search_results_fn);
} catch (e) {
    item_search_results_cache = {
        item_search_terms: [],
        item_search_cache: {},
        item_search_cache_dtm: {},
    };
}

try {
    rank_mappings_cache = require(rank_mappings_cache_fn);
} catch (e) {
    rank_mappings_cache = {
        available_levels: [190, 210, 225, 235],
        rank_mapping: [0, 1, 2, 3],
    };
}

try {
    craftable_by_professions_cache = require(craftable_by_professions_cache_fn);
} catch (e) {
    craftable_by_professions_cache = {
        craftable: {},
    };
}

try {
    shopping_recipe_exclusion_list = require(shopping_recipe_exclusion_list_fn);
} catch (e) {
    shopping_recipe_exclusion_list = {
        exclusions: [],
    };
}

try {
    auction_data = require(auction_cache_fn);
} catch (e) {
    auction_data = {
        fetched_auction_houses: [],
        fetched_auctions_data: {},
        auction_house_fetch_dtm: {},
    }
}

try {
    profession_skills_data = require(profession_skills_cache_fn);
} catch (e) {
    profession_skills_data = {
        fetched_profession_skill_tier_details: [],
        fetched_profession_skill_tier_detail_data: {},
        fetched_profession_skill_tier_dtm: {},
    }
}

try {
    profession_recipe_data = require(profession_recipe_cache_fn);
} catch (e) {
    profession_recipe_data = {
        fetched_profession_recipe_details: [],
        fetched_profession_recipe_detail_data: {},
        fetched_profession_recipe_detail_dtm: {},
    }
}

try {
    item_data = require(item_cache_fn);
} catch (e) {
    item_data = {
        fetched_items: [],
        fetched_item_data: {},
        fetched_item_dtm: {},
    }
}

try {
    realm_data = require(realm_cache_fn);
} catch (e) {
    realm_data = {
        connected_realms: [],
        connected_realm_data: {},
        connected_realm_dtm: {},
    }
}

const component_data = {
    fetched_auction_houses: auction_data.fetched_auction_houses,
    fetched_auctions_data: auction_data.fetched_auctions_data,
    auction_house_fetch_dtm: auction_data.auction_house_fetch_dtm,
    fetched_profession_skill_tier_details: profession_skills_data.fetched_profession_skill_tier_details,
    fetched_profession_skill_tier_detail_data: profession_skills_data.fetched_profession_skill_tier_detail_data,
    fetched_profession_skill_tier_dtm: profession_skills_data.fetched_profession_skill_tier_dtm,
    fetched_profession_recipe_details: profession_recipe_data.fetched_profession_recipe_details,
    fetched_profession_recipe_detail_data: profession_recipe_data.fetched_profession_recipe_detail_data,
    fetched_profession_recipe_detail_dtm: profession_recipe_data.fetched_profession_recipe_detail_dtm,
    fetched_items: item_data.fetched_items,
    fetched_item_data: item_data.fetched_item_data,
    fetched_item_dtm: item_data.fetched_item_dtm,
    connected_realms: realm_data.connected_realms,
    connected_realm_data: realm_data.connected_realm_data,
    connected_realm_dtm: realm_data.connected_realm_dtm,
    item_search_cache: item_search_results_cache.item_search_cache,
    item_search_terms: item_search_results_cache.item_search_terms,
    item_search_cache_dtm: item_search_results_cache.item_search_cache_dtm,
}

async function saveCache(logger) {
    if (logger === undefined) {
        logger = console;
    }

    // write module caches
    await Promise.all([
        fs.writeFile(`cache/${global_cache_name}`, JSON.stringify(component_data), 'utf8'),
        fs.writeFile(`cache/${auction_cache_fn}`, JSON.stringify(auction_data), 'utf8'),
        fs.writeFile(`cache/${profession_skills_cache_fn}`, JSON.stringify(profession_skills_data), 'utf8'),
        fs.writeFile(`cache/${profession_recipe_cache_fn}`, JSON.stringify(profession_recipe_data), 'utf8'),
        fs.writeFile(`cache/${item_cache_fn}`, JSON.stringify(item_data), 'utf8'),
        fs.writeFile(`cache/${realm_cache_fn}`, JSON.stringify(realm_data), 'utf8'),
        fs.writeFile(`cache/${craftable_by_professions_cache_fn}`, JSON.stringify(craftable_by_professions_cache), 'utf8'),
        fs.writeFile(`cache/${item_search_results_fn}`, JSON.stringify(item_search_results_cache), 'utf8'),
    ]);

    logger.info('Cache saved');
}

module.exports = component_data;
module.exports.saveCache = saveCache;
module.exports.bonuses = bonuses_cache;
module.exports.rank_mappings = rank_mappings_cache;
module.exports.shopping_recipe_exclusions = shopping_recipe_exclusion_list;
module.exports.craftable_by_professions_cache = craftable_by_professions_cache;