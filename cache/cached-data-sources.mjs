'use strict';
import fs from 'fs/promises';

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
let component_data;

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

async function loadCache(logger) {
    try {
        bonuses_cache = JSON.parse(await fs.readFile(new URL(bonuses_cache_fn, import.meta.url)));
    } catch (e) {
        // We should actually get the bonuses from the source if it's missing.
        // use data-sources.json as a source.
        bonuses_cache = {};
    }

    try {
        item_search_results_cache = JSON.parse(await fs.readFile(new URL(item_search_results_fn, import.meta.url)));
    } catch (e) {
        item_search_results_cache = {
            item_search_terms: [],
            item_search_cache: {},
            item_search_cache_dtm: {},
        };
    }

    try {
        rank_mappings_cache = JSON.parse(await fs.readFile(new URL(rank_mappings_cache_fn, import.meta.url)));
    } catch (e) {
        rank_mappings_cache = {
            available_levels: [190, 210, 225, 235],
            rank_mapping: [0, 1, 2, 3],
        };
    }

    try {
        craftable_by_professions_cache = JSON.parse(await fs.readFile(new URL(craftable_by_professions_cache_fn, import.meta.url)));
    } catch (e) {
        craftable_by_professions_cache = {
            craftable: {},
            dtm:{},
        };
    }

    try {
        shopping_recipe_exclusion_list = JSON.parse(await fs.readFile(new URL(shopping_recipe_exclusion_list_fn, import.meta.url)));
    } catch (e) {
        shopping_recipe_exclusion_list = {
            exclusions: [],
        };
    }

    try {
        auction_data = JSON.parse(await fs.readFile(new URL(auction_cache_fn, import.meta.url)));
    } catch (e) {
        auction_data = {
            fetched_auction_houses: [],
            fetched_auctions_data: {},
            auction_house_fetch_dtm: {},
        }
    }

    try {
        profession_skills_data = JSON.parse(await fs.readFile(new URL(profession_skills_cache_fn, import.meta.url)));
    } catch (e) {
        profession_skills_data = {
            fetched_profession_skill_tier_details: [],
            fetched_profession_skill_tier_detail_data: {},
            fetched_profession_skill_tier_dtm: {},
        }
    }

    try {
        profession_recipe_data = JSON.parse(await fs.readFile(new URL(profession_recipe_cache_fn, import.meta.url)));
    } catch (e) {
        profession_recipe_data = {
            fetched_profession_recipe_details: [],
            fetched_profession_recipe_detail_data: {},
            fetched_profession_recipe_detail_dtm: {},
        }
    }

    try {
        item_data = JSON.parse(await fs.readFile(new URL(item_cache_fn, import.meta.url)));
    } catch (e) {
        item_data = {
            fetched_items: [],
            fetched_item_data: {},
            fetched_item_dtm: {},
        }
    }

    try {
        realm_data = JSON.parse(await fs.readFile(new URL(realm_cache_fn, import.meta.url)));
    } catch (e) {
        realm_data = {
            connected_realms: [],
            connected_realm_data: {},
            connected_realm_dtm: {},
        }
    }

    component_data = {
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
        craftable_by_professions_cache: craftable_by_professions_cache.craftable,
        craftable_by_professions_cache_dtm: craftable_by_professions_cache.dtm,

        
    }
}

function expirationLookup(namespace){
    const mapping = {
        'fetched_auctions_data':'auction_house_fetch_dtm',
        'fetched_profession_skill_tier_detail_data':'fetched_profession_skill_tier_dtm',
        'fetched_profession_recipe_detail_data':'fetched_profession_recipe_detail_dtm',
        'fetched_item_data':'fetched_item_dtm',
        'connected_realm_data':'connected_realm_dtm',
        'item_search_cache':'item_search_cache_dtm',
    };
    if( namespace in mapping ){
        return mapping[namespace];
    }else{
        return `${namespace}_dtm`;
    }
}

function cacheCheck(namespace, key, expiration_period, logger) {
    let found = false;
    if (namespace in component_data) {
        if (key in component_data[namespace]) {
            if (expiration_period !== undefined) {
                let current_dtm = Date.now();
                let cached_dtm = component_data[expirationLookup(namespace)][key];
                let expire_point = Number(cached_dtm) + Number(expiration_period);
                if (expire_point > current_dtm) {
                    found = true;
                }
            } else {
                found = true;
            }
        }
    }
    return found;
}

function cacheGet(namespace, key, logger) {
    return component_data[namespace][key];
}

function cacheSet(namespace, key, data, logger) {
    const cached = Date.now();
    if( !(namespace in component_data)){
        component_data[namespace] = {};
        component_data[expirationLookup(namespace)] = {};
    }
    component_data[namespace][key] = data;
    component_data[expirationLookup(namespace)][key] = cached;
}

await loadCache();

export default component_data;
export { 
    component_data, saveCache, bonuses_cache, rank_mappings_cache, shopping_recipe_exclusion_list, craftable_by_professions_cache,
    cacheCheck, cacheGet, cacheSet
}