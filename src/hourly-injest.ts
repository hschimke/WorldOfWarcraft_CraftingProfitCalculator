import { CPCAuctionHistory } from './auction-history.js';
import { CPCApi } from './blizzard-api-call.js';
import { ApiAuthorization } from './blizz_oath.js';
import { CPCCache } from './cached-data-sources.js';
import { CPCDb } from './database/database.js';
import { CACHE_DB_FN, CLIENT_ID, CLIENT_SECRET, DATABASE_TYPE, DISABLE_AUCTION_HISTORY, HISTORY_DB_FN, STANDALONE_CONTAINER, USE_REDIS } from './environment_variables.js';
import { parentLogger } from './logging.js';
import { RedisCache } from './redis-cache-provider.js';


const logger = parentLogger.child({});

const server_mode = STANDALONE_CONTAINER;
const include_auction_history: boolean = DISABLE_AUCTION_HISTORY;

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


if (include_auction_history) {
    switch (server_mode) {
        case 'hourly':
            {
                logger.info('Started in default mode. Running job and exiting.');
                const db_conf: DatabaseConfig = {
                    type: DATABASE_TYPE !== undefined ? DATABASE_TYPE : ''
                }
                if (DATABASE_TYPE === 'sqlite3') {
                    db_conf.sqlite3 = {
                        cache_fn: CACHE_DB_FN !== undefined ? CACHE_DB_FN : './databases/cache.db',
                        auction_fn: HISTORY_DB_FN !== undefined ? HISTORY_DB_FN : './databases/historical_auctions.db'
                    };
                }
                const db = await CPCDb(db_conf, logger);
                const auth = ApiAuthorization(CLIENT_ID, CLIENT_SECRET, logger);
                const api = CPCApi(logger, auth);
                const cache = await (USE_REDIS ? RedisCache() : CPCCache(db));
                const ah = await CPCAuctionHistory(db, logger, api, cache);
                job(ah);
                break;
            }
        case 'worker':
            {
                logger.info('Started as a worker thread, actions will be as if standalone but no server is running elsewhere.');
            }
        case 'standalone':
            {
                logger.info('Started in standalone container mode. Scheduling hourly job.');
                const db_conf: DatabaseConfig = {
                    type: DATABASE_TYPE !== undefined ? DATABASE_TYPE : ''
                }
                if (DATABASE_TYPE === 'sqlite3') {
                    db_conf.sqlite3 = {
                        cache_fn: CACHE_DB_FN !== undefined ? CACHE_DB_FN : './databases/cache.db',
                        auction_fn: HISTORY_DB_FN !== undefined ? HISTORY_DB_FN : './databases/historical_auctions.db'
                    };
                }
                const db = await CPCDb(db_conf, logger);
                const auth = ApiAuthorization(CLIENT_ID, CLIENT_SECRET, logger);
                const api = CPCApi(logger, auth);
                const cache = await (USE_REDIS ? RedisCache() : CPCCache(db));
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
}