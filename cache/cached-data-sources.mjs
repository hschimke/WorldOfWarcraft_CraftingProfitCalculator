'use strict';
import fs from 'fs/promises';
import { parentLogger } from '../logging.mjs';
import sqlite3 from 'sqlite3';

const logger = parentLogger.child();
let db;

const database_fn = './cache/cache.db';

const bonuses_cache_fn = './bonuses.json';
const rank_mappings_cache_fn = './rank-mappings.json';
const shopping_recipe_exclusion_list_fn = './shopping-recipe-exclusion-list.json'

let bonuses_cache;
let rank_mappings_cache;
let shopping_recipe_exclusion_list;

async function saveCache() {

    await db.close();

    logger.info('Cache saved');
}

async function loadCache() {
    db = new sqlite3.Database(database_fn, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);

    // static files
    try {
        bonuses_cache = JSON.parse(await fs.readFile(new URL(bonuses_cache_fn, import.meta.url)));
    } catch (e) {
        // We should actually get the bonuses from the source if it's missing.
        // use data-sources.json as a source.
        bonuses_cache = {};
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

    // db replacement
    const table_create_string = 'CREATE TABLE IF NOT EXISTS key_values (namespace TEXT, key TEXT, value BLOB, cached INTEGER, PRIMARY KEY (namespace,key))';
    await dbRun(db, table_create_string);
    await dbRun(db, 'PRAGMA journal_mode=WAL');
}

function dbGet(db, query, values) {
    return new Promise((accept, reject) => {
        db.get(query, values, (err, row) => {
            if (err) {
                logger.error(`Issue running query '${query}' and values ${values}`, err);
                reject();
            }
            accept(row);
        })
    });
}

function dbRun(db, query, values) {
    return new Promise((accept, reject) => {
        db.run(query, values, (err) => {
            if (err) {
                logger.error(`Issue running query '${query}' and values ${values}`, err);
                reject();
            } else {
                accept();
            }
        })
    });
}

function dbSerialize(db, queries, values) {
    return new Promise((accept, reject) => {
        db.serialize(() => {
            try {
                for (let i = 0; i < queries.length; i++) {
                    db.run(queries[i], values[i], (err) => {
                        if (err) {
                            logger.error(`Issue running query '${queries[i]}' and values ${values[i]}`, err);
                            reject();
                        } else {
                            accept();
                        }
                    })
                }
            } catch (e) {
                logger.error('serialize failed', { q: queries, v: values });
                reject(e);
            }
        })
    });
}

async function cacheCheck(namespace, key, expiration_period) {
    //const query = 'select namespace, key, value, cached from key_values where namespace = ? and key = ?';
    const query_no_expiration = 'SELECT COUNT(*) AS how_many FROM key_values WHERE namespace = ? AND key = ?';
    const no_expiration_values = [namespace, key];
    const query_with_expiration = 'SELECT COUNT(*) AS how_many FROM key_values WHERE namespace = ? AND key = ? AND (cached + ?) > ?';
    const expiration_values = [namespace, key, expiration_period, Date.now()];

    const query = (expiration_period !== undefined) ? query_with_expiration : query_no_expiration;
    const values = (expiration_period !== undefined) ? expiration_values : no_expiration_values;

    const result = await dbGet(db, query, values);

    let found = false;
    if (result.how_many > 0) {
        found = true;
    }

    return found;
}

async function cacheGet(namespace, key) {
    const query = 'SELECT value FROM key_values WHERE namespace = ? AND key = ?';
    const result = await dbGet(db, query, [namespace, key]);
    return JSON.parse(result.value);
}

async function cacheSet(namespace, key, data) {
    if (data === undefined) {
        throw new Error('Cannot cache undefined');
    }
    const cached = Date.now();

    try {
        const query_delete = 'DELETE FROM key_values WHERE namespace = ? AND key = ?';
        //await dbRun(db, query_delete, [namespace, key]);

        const query_insert = 'INSERT INTO key_values(namespace, key, value, cached) VALUES(?,?,?,?)';
        //await dbRun(db, query_insert, [namespace, key, JSON.stringify(data), cached]);

        await dbSerialize(db, [query_delete, query_insert], [[namespace, key], [namespace, key, JSON.stringify(data), cached]]);
    } catch (e) {
        logger.error('Failed up set cache value', e);
        success = false;
    }
}

await loadCache();

export {
    saveCache, bonuses_cache, rank_mappings_cache, shopping_recipe_exclusion_list,
    cacheCheck, cacheGet, cacheSet
}