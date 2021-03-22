import { parentLogger } from './logging.js';
import sqlite3 from 'sqlite3';

const logger = parentLogger.child();
const dbs = new Map();
let dbs_open;

/*
import winston from 'winston';
logger.add(new winston.transports.Console({
    format: winston.format.simple(),
    level: 'silly',
}));
*/

const pragma_sync = 'PRAGMA synchronous = normal';
const pragma_journal = 'PRAGMA journal_mode=WAL';

const sql_create_item_table = 'CREATE TABLE IF NOT EXISTS auctions (item_id INTEGER, bonuses TEXT, quantity INTEGER, price INTEGER, downloaded INTEGER, connected_realm_id INTEGER)';
const sql_create_auctions_index = 'CREATE INDEX IF NOT EXISTS auctions_index ON auctions (item_id, bonuses, quantity, price, downloaded, connected_realm_id)';
const sql_create_items_table = 'CREATE TABLE IF NOT EXISTS items (item_id INTEGER, region TEXT, name TEXT, craftable INTEGER, PRIMARY KEY (item_id,region))';
const sql_create_realms_table = 'CREATE TABLE IF NOT EXISTS realms (connected_realm_id INTEGER, name TEXT, region TEXT, PRIMARY KEY (connected_realm_id,region))';
const sql_create_realm_scan_table = 'CREATE TABLE IF NOT EXISTS realm_scan_list (connected_realm_id INTEGER, region TEXT, PRIMARY KEY (connected_realm_id,region))';
const sql_create_archive_table = 'CREATE TABLE IF NOT EXISTS auction_archive (item_id INTEGER, bonuses TEXT, quantity INTEGER, summary TEXT, downloaded INTEGER, connected_realm_id INTEGER)';
const sql_create_auction_archive_index = 'CREATE INDEX IF NOT EXISTS auction_archive_index ON auction_archive (item_id, bonuses, downloaded, connected_realm_id)';

const history_sql_run_at_open = [
    pragma_sync,
    pragma_journal,
    sql_create_item_table,
    sql_create_items_table,
    sql_create_realms_table,
    sql_create_realm_scan_table,
    sql_create_auctions_index,
    sql_create_archive_table,
    sql_create_auction_archive_index,
];

const sql_create_cache_table = 'CREATE TABLE IF NOT EXISTS key_values (namespace TEXT, key TEXT, value TEXT, cached INTEGER, PRIMARY KEY (namespace,key))';

const cache_sql_run_at_open = [
    sql_create_cache_table,
    pragma_sync,
    pragma_journal];

function sqlToString(sql, values) {
    const value_str = values !== undefined ? values.map((val) => {
        return `[value: ${val} type: ${typeof (val)}] `;
    }) : '';
    return `${sql} : ${value_str}`;
}

function start() {
    const cache_fn = process.env.CACHE_DB_FN;
    const history_fn = process.env.HISTORY_DB_FN;
    dbs.set('cache', new sqlite3.Database(cache_fn, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE));
    dbs.set('history', new sqlite3.Database(history_fn, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE));

    dbs.get('history').serialize(() => {
        for (const query of history_sql_run_at_open) {
            dbs.get('history').run(query);
        }
    });

    dbs.get('cache').serialize(() => {
        for (const query of cache_sql_run_at_open) {
            dbs.get('cache').run(query);
        }
    });

    dbs_open = true;
}

async function shutdown() {
    for (let [key, value] of dbs) {
        logger.info(`Close DB ${key}`);
        value.run('PRAGMA optimize', (err) => {
            value.close();
        });
    }
    dbs_open = false;
}

function getDb(db_name) {
    const context = function () { };
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

start();

export { getDb };