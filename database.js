import { parentLogger } from './logging.js';

import sqlite3 from 'sqlite3';
import pg from 'pg';
const { Pool } = pg;

const logger = parentLogger.child();
let l_pool;
const dbs = new Map();
let dbs_open;

const db_type = process.env.DATABASE_TYPE;

logger.info(`Using ${db_type} database methods.`);

/*
import winston from 'winston';
logger.add(new winston.transports.Console({
    format: winston.format.simple(),
    level: 'silly',
}));*/


const pragma_sync = 'PRAGMA synchronous = normal';
const pragma_journal = 'PRAGMA journal_mode=WAL';

const sql_create_item_table_pg = 'CREATE TABLE IF NOT EXISTS auctions (item_id NUMERIC, bonuses TEXT, quantity NUMERIC, price NUMERIC, downloaded NUMERIC, connected_realm_id NUMERIC)';
const sql_create_auctions_index_pg = 'CREATE INDEX IF NOT EXISTS auctions_index ON auctions (item_id, bonuses, quantity, price, downloaded, connected_realm_id)';
const sql_create_items_table_pg = 'CREATE TABLE IF NOT EXISTS items (item_id NUMERIC, region TEXT, name TEXT, craftable BOOLEAN, PRIMARY KEY (item_id,region))';
const sql_create_realms_table_pg = 'CREATE TABLE IF NOT EXISTS realms (connected_realm_id NUMERIC, name TEXT, region TEXT, PRIMARY KEY (connected_realm_id,region))';
const sql_create_realm_scan_table_pg = 'CREATE TABLE IF NOT EXISTS realm_scan_list (connected_realm_id NUMERIC, region TEXT, PRIMARY KEY (connected_realm_id,region))';
const sql_create_archive_table_pg = 'CREATE TABLE IF NOT EXISTS auction_archive (item_id NUMERIC, bonuses TEXT, quantity NUMERIC, summary JSON, downloaded NUMERIC, connected_realm_id NUMERIC)';
const sql_create_auction_archive_index_pg = 'CREATE INDEX IF NOT EXISTS auction_archive_index ON auction_archive (item_id, bonuses, downloaded, connected_realm_id)';

const history_sql_run_at_open_pg = [
    sql_create_item_table_pg,
    sql_create_items_table_pg,
    sql_create_realms_table_pg,
    sql_create_realm_scan_table_pg,
    sql_create_archive_table_pg,
    sql_create_auctions_index_pg,
    sql_create_auction_archive_index_pg,
];

const sql_create_cache_table_pg = 'CREATE TABLE IF NOT EXISTS key_values (namespace TEXT, key TEXT, value JSON, cached NUMERIC, PRIMARY KEY (namespace,key))';

const cache_sql_run_at_open_pg = [
    sql_create_cache_table_pg];

const sql_create_item_table_sq3 = 'CREATE TABLE IF NOT EXISTS auctions (item_id INTEGER, bonuses TEXT, quantity INTEGER, price INTEGER, downloaded INTEGER, connected_realm_id INTEGER)';
const sql_create_auctions_index_sq3 = 'CREATE INDEX IF NOT EXISTS auctions_index ON auctions (item_id, bonuses, quantity, price, downloaded, connected_realm_id)';
const sql_create_items_table_sq3 = 'CREATE TABLE IF NOT EXISTS items (item_id INTEGER, region TEXT, name TEXT, craftable INTEGER, PRIMARY KEY (item_id,region))';
const sql_create_realms_table_sq3 = 'CREATE TABLE IF NOT EXISTS realms (connected_realm_id INTEGER, name TEXT, region TEXT, PRIMARY KEY (connected_realm_id,region))';
const sql_create_realm_scan_table_sq3 = 'CREATE TABLE IF NOT EXISTS realm_scan_list (connected_realm_id INTEGER, region TEXT, PRIMARY KEY (connected_realm_id,region))';
const sql_create_archive_table_sq3 = 'CREATE TABLE IF NOT EXISTS auction_archive (item_id INTEGER, bonuses TEXT, quantity INTEGER, summary TEXT, downloaded INTEGER, connected_realm_id INTEGER)';
const sql_create_auction_archive_index_sq3 = 'CREATE INDEX IF NOT EXISTS auction_archive_index ON auction_archive (item_id, bonuses, downloaded, connected_realm_id)';

const history_sql_run_at_open_sq3 = [
    pragma_sync,
    pragma_journal,
    sql_create_item_table_sq3,
    sql_create_items_table_sq3,
    sql_create_realms_table_sq3,
    sql_create_realm_scan_table_sq3,
    sql_create_auctions_index_sq3,
    sql_create_archive_table_sq3,
    sql_create_auction_archive_index_sq3,
];

const sql_create_cache_table_sq3 = 'CREATE TABLE IF NOT EXISTS key_values (namespace TEXT, key TEXT, value TEXT, cached INTEGER, PRIMARY KEY (namespace,key))';

const cache_sql_run_at_open_sq3 = [
    sql_create_cache_table_sq3,
    pragma_sync,
    pragma_journal];

function sqlToString(sql, values) {
    const value_str = values !== undefined ? values.map((val) => {
        return `[value: ${val} type: ${typeof (val)}] `;
    }) : '';
    return `${sql} : ${value_str}`;
}

async function start() {
    if (db_type === 'sqlite3') {
        const cache_fn = process.env.CACHE_DB_FN;
        const history_fn = process.env.HISTORY_DB_FN;
        dbs.set('cache', new sqlite3.Database(cache_fn, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE));
        dbs.set('history', new sqlite3.Database(history_fn, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE));

        dbs.get('history').serialize(() => {
            for (const query of history_sql_run_at_open_sq3) {
                dbs.get('history').run(query);
            }
        });

        dbs.get('cache').serialize(() => {
            for (const query of cache_sql_run_at_open_sq3) {
                dbs.get('cache').run(query);
            }
        });
    } else if (db_type === 'pg') {
        l_pool = new Pool();
        const client = await l_pool.connect();

        for (const query of history_sql_run_at_open_pg) {
            await client.query(query);
        }
        for (const query of cache_sql_run_at_open_pg) {
            await client.query(query);
        }
        await client.release();
    }

    dbs_open = true;
}

function shutdown() {
    logger.info('Closing DB connection');
    dbs_open = false;
    if (db_type === 'sqlite3') {
        for (let [key, value] of dbs) {
            logger.info(`Close DB ${key}`);
            value.run('PRAGMA optimize', (err) => {
                value.close();
            });
        }
    } else if (db_type === 'pg') {
        l_pool.end().then(() => {
            logger.info('Database connection closed');
        });
    }
}

function getDb(db_name) {
    const context = function () { };
    if (db_type === 'sqlite3') {
        context.db = dbs.get(db_name);
        context.get = function (query, values) {
            logger.silly(sqlToString(query, values));
            return new Promise((accept, reject) => {
                this.db.get(query, values, (err, row) => {
                    if (err) {
                        logger.error(`Issue running query '${query}' and values ${values}`, err);
                        reject();
                    }
                    accept(row);
                })
            });
        };
        context.run = function (query, values) {
            logger.silly(sqlToString(query, values));
            return new Promise((accept, reject) => {
                this.db.run(query, values, (err) => {
                    if (err) {
                        logger.error(`Issue running query '${query}' and values ${values}`, err);
                        reject();
                    } else {
                        accept();
                    }
                })
            });
        };
        context.all = function (query, values) {
            logger.silly(sqlToString(query, values));
            return new Promise((accept, reject) => {
                this.db.all(query, values, (err, rows) => {
                    if (err) {
                        logger.error(`Issue running query '${query}' and values ${values}`, err);
                        reject();
                    }
                    accept(rows);
                })
            });
        };
        context.serialize = function (queries, value_sets) {
            return new Promise((accept, reject) => {
                this.db.serialize(() => {
                    try {
                        for (let i = 0; i < queries.length; i++) {
                            logger.silly(sqlToString(queries[i], value_sets[i]));
                            this.db.run(queries[i], value_sets[i], (err) => {
                                if (err) {
                                    logger.error(`Issue running query '${queries[i]}' and values ${value_sets[i]}`, err);
                                    reject();
                                }
                            });
                        }
                        accept();
                    } catch (e) {
                        logger.error('serialize failed', { q: queries, v: value_sets });
                        reject(e);
                    }
                })
            });
        };
        context.getClient = async function () {
            const f = function () { };
            f.release = async function () { };
            f.query = async function (query, values) {
                const result = await context.all(query, values);
                return { rows: result };
            };
            return f;
        };
    } else if (db_type === 'pg') {
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
    }

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