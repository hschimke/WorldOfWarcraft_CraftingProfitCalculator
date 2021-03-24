import { parentLogger } from './logging.js';
//import sqlite3 from 'sqlite3';
import pg from 'pg';
const { Pool } = pg;

const logger = parentLogger.child();
const l_pool = new Pool();
let dbs_open;

/*
import winston from 'winston';
logger.add(new winston.transports.Console({
    format: winston.format.simple(),
    level: 'silly',
}));*/


const pragma_sync = 'PRAGMA synchronous = normal';
const pragma_journal = 'PRAGMA journal_mode=WAL';

const sql_create_item_table = 'CREATE TABLE IF NOT EXISTS auctions (item_id NUMERIC, bonuses TEXT, quantity NUMERIC, price NUMERIC, downloaded NUMERIC, connected_realm_id NUMERIC)';
const sql_create_auctions_index = 'CREATE INDEX IF NOT EXISTS auctions_index ON auctions (item_id, bonuses, quantity, price, downloaded, connected_realm_id)';
const sql_create_items_table = 'CREATE TABLE IF NOT EXISTS items (item_id NUMERIC, region TEXT, name TEXT, craftable BOOLEAN, PRIMARY KEY (item_id,region))';
const sql_create_realms_table = 'CREATE TABLE IF NOT EXISTS realms (connected_realm_id NUMERIC, name TEXT, region TEXT, PRIMARY KEY (connected_realm_id,region))';
const sql_create_realm_scan_table = 'CREATE TABLE IF NOT EXISTS realm_scan_list (connected_realm_id NUMERIC, region TEXT, PRIMARY KEY (connected_realm_id,region))';
const sql_create_archive_table = 'CREATE TABLE IF NOT EXISTS auction_archive (item_id NUMERIC, bonuses TEXT, quantity NUMERIC, summary JSON, downloaded NUMERIC, connected_realm_id NUMERIC)';
const sql_create_auction_archive_index = 'CREATE INDEX IF NOT EXISTS auction_archive_index ON auction_archive (item_id, bonuses, downloaded, connected_realm_id)';

const history_sql_run_at_open = [
    sql_create_item_table,
    sql_create_items_table,
    sql_create_realms_table,
    sql_create_realm_scan_table,
    sql_create_archive_table,
    sql_create_auctions_index,
    sql_create_auction_archive_index,
];

const sql_create_cache_table = 'CREATE TABLE IF NOT EXISTS key_values (namespace TEXT, key TEXT, value JSON, cached NUMERIC, PRIMARY KEY (namespace,key))';

const cache_sql_run_at_open = [
    sql_create_cache_table];

function sqlToString(sql, values) {
    const value_str = values !== undefined ? values.map((val) => {
        return `[value: ${val} type: ${typeof (val)}] `;
    }) : '';
    return `${sql} : ${value_str}`;
}

async function start() {
    const client = await l_pool.connect();

    for (const query of history_sql_run_at_open) {
        await client.query(query);
    }
    for (const query of cache_sql_run_at_open) {
        await client.query(query);
    }
    await client.release();
    dbs_open = true;
}

function shutdown() {
    logger.info('Closing DB connection');
    dbs_open = false;
    l_pool.end().then(()=>{
        logger.info('Database connection closed');
    });
}

function getDb(db_name) {
    const context = function () { };
    context.pool = l_pool;
    context.serialize = async function (queries, value_sets) {
        const client = await this.pool.connect();
        for (let i = 0; i < queries.length; i++) {
            logger.silly(sqlToString(queries[i], value_sets[i]));
            await client.query(queries[i], value_sets[i]);
        }
        client.release();
    };
    context.getClient = async function () {
        const client = await this.pool.connect();
        return client;
    };
    context.query = async function (query, values) {
        logger.silly(sqlToString(query, values));
        const res = await this.pool.query(query, values);
        return res;
    };
    context.get = async function (query, values) {
        const res = await this.query(query, values);
        return res.rows[0];
    }
    context.all = async function (query, values) {
        const result = await this.query(query, values);
        return result.rows;
    }
    context.run = context.query.bind(context);;

    return context;
}

process.on('beforeExit', () => {
    if (dbs_open) {
        shutdown();
    }
});

process.on('SIGTERM', () => {
    if (dbs_open) {
        shutdown();
    }
});

process.on('SIGINT', () => {
    if (dbs_open) {
        shutdown();
    }
});

await start();

export { getDb };