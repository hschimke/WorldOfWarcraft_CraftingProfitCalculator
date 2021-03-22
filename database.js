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
    dbs_open = true;
}

async function shutdown() {
    for (let [key, value] of dbs) {
        logger.info(`Close DB ${key}`);
        value.close();
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