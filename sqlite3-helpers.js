import { parentLogger } from './logging.js';

const logger = parentLogger.child();

/**
 * Close the database within a promise.
 * @param db The database object to close.
 */
function dbClose(db) {
    return new Promise((accept, reject) => {
        db.close((err) => {
            if (err) {
                logger.error('Issue closing database', err);
                reject();
            }
            logger.debug('Database closed');
            accept();
        });
    });
}

/**
 * Open a database with a promise.
 * @param database_factory The sqlite3 library used to create the database.
 * @param file_name The filename of the database to open.
 * @param params The open paramaters for the database as defined by sqlite3.
 */
function dbOpen(database_factory, file_name, params) {
    return new Promise((accept, reject) => {
        try {
            let ldb = new database_factory.Database(file_name, params, (err) => {
                if (err) {
                    logger.error('Failed to open database');
                    reject(err);
                }
                logger.debug('Database opened');
                accept(ldb);
            });
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Run a query with exactly one return result.
 * @param {Object} db THe database to query against.
 * @param {string} query The query to run.
 * @param {Array.<string>} values The paramaters for the query.
 */
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

/**
 * Run a query against a database, ignoring the result.
 * @param {Object} db The database to query against.
 * @param {string} query The query to run.
 * @param {Array.<string>} The paramaters for the query.
 */
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

/**
 * Run a query and return result.
 * @param {Object} db THe database to query against.
 * @param {string} query The query to run.
 * @param {Array.<string>} values The paramaters for the query.
 */
function dbAll(db,query,values) {
    return new Promise((accept, reject) => {
        db.all(query, values, (err, rows) => {
            if (err) {
                logger.error(`Issue running query '${query}' and values ${values}`, err);
                reject();
            }
            accept(rows);
        })
    });
}

/**
 * 
 * @param {Object} db The database to run queries against.
 * @param {{Array.<string>}} queries An array of queries to run against the database.
 * @param {Array.<Array.<string>>} values An array of paramaters for the queries.
 */
function dbSerialize(db, queries, values) {
    return new Promise((accept, reject) => {
        db.serialize(() => {
            try {
                for (let i = 0; i < queries.length; i++) {
                    db.run(queries[i], values[i], (err) => {
                        if (err) {
                            logger.error(`Issue running query '${queries[i]}' and values ${values[i]}`, err);
                            reject();
                        }
                    });
                }
                accept();
            } catch (e) {
                logger.error('serialize failed', { q: queries, v: values });
                reject(e);
            }
        })
    });
}

export {dbOpen, dbClose, dbRun, dbGet, dbAll, dbSerialize};