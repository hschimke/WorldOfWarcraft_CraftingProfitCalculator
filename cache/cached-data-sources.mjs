'use strict';
import fs from 'fs/promises';
import { parentLogger } from '../logging.mjs';
import sqlite3 from 'sqlite3';

const logger = parentLogger.child();
let db;

const database_fn = './cache/cache.db';

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
    const table_create_string = 'CREATE TABLE IF NOT EXISTS key_values (namespace text, key text, value BLOB, cached integer)';
    await dbRun(db, table_create_string);
}

function dbGet(db, query, values){
    return new Promise((accept, reject) => {
        db.get(query,values,(err, row) => {
            if(err){
                reject();
            }
            accept(row);
        })
    });
}

function dbRun(db, query, values){
    return new Promise((accept,reject) => {
        db.run(query,values,(err) => {
            if(err){
                reject();
            }else{
                accept();
            }
        })
    });
}

function dbSerialize(db, queries, values){
    return new Promise((accept,reject) => {
        db.serialize(() => {
            try{
                for(let i = 0; i<queries.length; i++){
                    db.run(queries[i], values[i], (err) => {
                        if(err){
                            reject();
                        }else{
                            accept();
                        }
                    })
                }
            }catch(e){
                reject(e);
            }
        })
    });
}

async function cacheCheck(namespace, key, expiration_period) {
    //const query = 'select namespace, key, value, cached from key_values where namespace = ? and key = ?';
    const query = 'select count(*) as how_many from key_values where namespace = ? and key = ?';
    let result = await dbGet(db, query, [namespace,key]);
    
    let found = false;
    if( result.how_many > 0){
        const getQuery = 'select cached from key_values where namespace = ? and key = ?';
        const getResult = await dbGet(db,getQuery,[namespace,key]);
        if (expiration_period !== undefined) {
            let current_dtm = Date.now();
            let cached_dtm = getResult.cached;
            let expire_point = Number(cached_dtm) + Number(expiration_period);
            if (expire_point > current_dtm) {
                found = true;
            }
        } else {
            found = true;
        }
    }
    return found;
}

async function cacheGet(namespace, key) {
    const query = 'select value from key_values where namespace = ? and key = ?';
    const result = await dbGet(db,query,[namespace,key]);
    return JSON.parse(result.value);
}

async function cacheSet(namespace, key, data) {
    if (data === undefined) {
        throw new Error('Cannot cache undefined');
    }
    const cached = Date.now();

    const query_delete = 'delete from key_values where namespace = ? and key = ?';
    await dbRun(db,query_delete,[namespace,key]);

    const query_insert = 'insert into key_values(namespace, key, value, cached) values(?,?,?,?)';
    await dbRun(db,query_insert,[namespace,key,JSON.stringify(data),cached]);
}

await loadCache();

export {
    saveCache, bonuses_cache, rank_mappings_cache, shopping_recipe_exclusion_list,
    cacheCheck, cacheGet, cacheSet
}