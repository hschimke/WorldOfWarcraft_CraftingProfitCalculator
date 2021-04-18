import { CPCAuctionHistory } from './auction-history.js';
import { CPCApi } from './blizzard-api-call.js';
import { ApiAuthorization } from './blizz_oath.js';
import { CPCCache } from './cached-data-sources.js';
import { CPCDb } from './database.js';
import { parentLogger } from './logging.js';

const logger = parentLogger.child({});

const server_mode = process.env.STANDALONE_CONTAINER === undefined ? 'normal' : process.env.STANDALONE_CONTAINER;

let standalone_container_abc: NodeJS.Timeout | undefined = undefined;

//await addRealmToScanList('hyjal','us');

function job(ah: CPCAuctionHistory) {
    logger.info('Starting hourly injest job.');

    ah.scanRealms().then(() => {
        return ah.fillNItems(20);
    }).then(() => {
        if ((new Date()).getHours() === 4) {
            logger.info('Performing daily archive.');
            ah.archiveAuctions();
        }
    }).finally(() => {
        logger.info('Finished hourly injest job.');
    })
}

switch (server_mode) {
    case 'hourly':
        {
            logger.info('Started in default mode. Running job and exiting.');
            const db_conf: DatabaseConfig = {
                type: process.env.DATABASE_TYPE !== undefined ? process.env.DATABASE_TYPE : ''
            }
            if (process.env.DATABASE_TYPE === 'sqlite3') {
                db_conf.sqlite3 = {
                    cache_fn: process.env.CACHE_DB_FN !== undefined ? process.env.CACHE_DB_FN : './databases/cache.db',
                    auction_fn: process.env.HISTORY_DB_FN !== undefined ? process.env.HISTORY_DB_FN : './databases/historical_auctions.db'
                };
            }
            const db = CPCDb(db_conf, logger);
            const auth = ApiAuthorization(process.env.CLIENT_ID, process.env.CLIENT_SECRET, logger);
            const api = CPCApi(logger, auth);
            const cache = await CPCCache(db);
            const ah = await CPCAuctionHistory(db, logger, api, cache);
            job(ah);
            break;
        }
    case 'standalone':
        {
            logger.info('Started in standalone container mode. Scheduling hourly job.');
            const db_conf: DatabaseConfig = {
                type: process.env.DATABASE_TYPE !== undefined ? process.env.DATABASE_TYPE : ''
            }
            if (process.env.DATABASE_TYPE === 'sqlite3') {
                db_conf.sqlite3 = {
                    cache_fn: process.env.CACHE_DB_FN !== undefined ? process.env.CACHE_DB_FN : './databases/cache.db',
                    auction_fn: process.env.HISTORY_DB_FN !== undefined ? process.env.HISTORY_DB_FN : './databases/historical_auctions.db'
                };
            }
            const db = CPCDb(db_conf, logger);
            const auth = ApiAuthorization(process.env.CLIENT_ID, process.env.CLIENT_SECRET, logger);
            const api = CPCApi(logger, auth);
            const cache = await CPCCache(db);
            const ah = await CPCAuctionHistory(db, logger, api, cache);
            standalone_container_abc = setInterval(() => { job(ah) }, 3.6e+6);
            standalone_container_abc.unref();
            break;
        }
    case 'normal':
    default:
        logger.info('Started in normal mode taking no action.');
        break;
}