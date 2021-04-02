import { promises as fs } from 'fs';
import { parentLogger } from './logging.js';
import got from 'got';
import { getDb } from './database.js';

const logger = parentLogger.child();
let cache_loaded = false;

const bonuses_cache_fn = './cache/bonuses.json';
const rank_mappings_cache_fn = './cache/rank-mappings.json';
const shopping_recipe_exclusion_list_fn = './cache/shopping-recipe-exclusion-list.json'
const data_sources_fn = './cache/data-sources.json';

let bonuses_cache;
let rank_mappings_cache;
let shopping_recipe_exclusion_list;

const db_type = process.env.DATABASE_TYPE;

/**
 * Cleanly shutdown the cache provider.
 */
async function saveCache() {
    cache_loaded=false;
    logger.info('Cache saved');
}

/**
 * Initialize the cache provider.
 */
async function loadCache() {
    if (!cache_loaded) {
        const data_sources = JSON.parse(await fs.readFile(new URL(data_sources_fn, import.meta.url)));

        // static files
        try {
            bonuses_cache = JSON.parse(await fs.readFile(new URL(bonuses_cache_fn, import.meta.url)));
        } catch (e) {
            logger.info(`Couldn't find bonuses data, fetching fresh.`);
            const fetched_bonus_data = (await got(data_sources.sources[bonuses_cache_fn].href)).body;
            fs.writeFile(new URL(bonuses_cache_fn, import.meta.url), fetched_bonus_data, 'utf8');
            bonuses_cache = JSON.parse(fetched_bonus_data);
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
            shopping_recipe_exclusion_list = JSON.parse(await fs.readFile(new URL(shopping_recipe_exclusion_list_fn, import.meta.url)));
        } catch (e) {
            shopping_recipe_exclusion_list = {
                exclusions: [],
            };
        }
        cache_loaded = true;
    }
}

/**
 * Check if a key is present in the namespace, optionally checking expiration.
 * @param {!string} namespace The namespace for the key.
 * @param {!string} key The key to check.
 * @param {?number} expiration_period Optionally check if the key has expired.
 */
async function cacheCheck(namespace, key, expiration_period) {
    const db = await getDb('cache');
    //logger.profile('cacheGet');
    //const query = 'select namespace, key, value, cached from key_values where namespace = ? and key = ?';
    const query_no_expiration = 'SELECT COUNT(*) AS how_many FROM key_values WHERE namespace = $1 AND key = $2';
    const no_expiration_values = [namespace, key];
    const query_with_expiration = 'SELECT COUNT(*) AS how_many FROM key_values WHERE namespace = $1 AND key = $2 AND (cached + $3) > $4';
    const expiration_values = [namespace, key, expiration_period, Date.now()];

    const query = (expiration_period !== undefined) ? query_with_expiration : query_no_expiration;
    const values = (expiration_period !== undefined) ? expiration_values : no_expiration_values;

    const result = await db.get(query, values);

    let found = false;
    if (result.how_many > 0) {
        found = true;
    }
    //logger.profile('cacheGet');
    return found;
}

/**
 * Retrieve a key from the cache.
 * @param {string} namespace The namespace for the key.
 * @param {string} key The key to retrieve.
 */
async function cacheGet(namespace, key) {
    const db = await getDb('cache');
    //logger.profile(`cacheGet: ${namespace} -> ${key}`);
    const query = 'SELECT value FROM key_values WHERE namespace = $1 AND key = $2';
    const result = await db.get(query, [namespace, key]);
    //const json_data = JSON.parse(result.value);
    //logger.profile(`cacheGet: ${namespace} -> ${key}`);
    return db_type === 'pg' ? result.value : JSON.parse(result.value);
}

/**
 * Set a key within a namespace to the given value, all other values will be deleted.
 * @param {string} namespace The namespace for the key.
 * @param {string} key The cache key to set.
 * @param {!any} data The value to set the key to.
 */
async function cacheSet(namespace, key, data) {
    const db = await getDb('cache');
    if (data === undefined) {
        logger.error(`cannot cache undefined to ${namespace} -> ${key}`);
        throw new Error('Cannot cache undefined');
    }
    const cached = Date.now();

    //logger.profile('cacheSet');
    try {
        const query_delete = 'DELETE FROM key_values WHERE namespace = $1 AND key = $2';
        const query_insert = 'INSERT INTO key_values(namespace, key, value, cached) VALUES($1,$2,$3,$4)';

        const save_data = db_type === 'pg' ? data : JSON.stringify(data);

        await db.serialize(
            ['BEGIN TRANSACTION', query_delete, query_insert, 'COMMIT TRANSACTION'],
            [[], [namespace, key], [namespace, key, save_data, cached], []]);
    } catch (e) {
        logger.error('Failed to set up cache value', e);
    }
    //logger.profile('cacheSet');
}

async function static_sources(init){
    await loadCache(init);
    const context = function() {};

    context.bonuses_cache = bonuses_cache;
    context.rank_mappings_cache = rank_mappings_cache;
    context.shopping_recipe_exclusion_list = shopping_recipe_exclusion_list;

    return context;
}

export {
    static_sources,
    saveCache, cacheCheck, cacheGet, cacheSet
}
