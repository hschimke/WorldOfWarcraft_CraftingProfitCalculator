import { default as express } from 'express';
import { resolve } from 'path';
import { CPCAuctionHistory } from './auction-history.js';
import { CPCApi } from './blizzard-api-call.js';
import { ApiAuthorization } from './blizz_oath.js';
import { CPCCache, static_sources } from './cached-data-sources.js';
import { CPCDb } from './database/database.js';
import { getRegionCode } from './getRegionCode.js';
import './hourly-injest.js';
import { parentLogger } from './logging.js';
import { RunConfiguration } from './RunConfiguration.js';
import { validateProfessions } from './validateProfessions.js';
import { CPCInstance } from './wow_crafting_profits.js';

const logger = parentLogger.child({});

const app = express();
const port = process.env.SERVER_PORT;

const include_auction_history: boolean = process.env.DISABLE_AUCTION_HISTORY !== undefined && process.env.DISABLE_AUCTION_HISTORY === 'true' ? false : true;

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

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(express.static(resolve('html/build')));

app.get('/', (req, res) => {
    logger.debug('Homepage requested');
    res.sendFile(resolve('html/build/index.html'));
});

app.get('/healthcheck', (req, res) => {
    logger.debug('Healthcheck OK');
    res.json({ health: 'ok' });
});

app.get('*', (req, res) => {
    logger.debug('Unknown route requested');
    res.sendFile(resolve('html/build/index.html'));
});

app.post('/json_output', (req, res) => {
    let json_data: AddonData = { inventory: [], professions: [], realm: { realm_name: '', region_name: '' } };
    if (req.body.addon_data.length > 0) {
        json_data = JSON.parse(req.body.addon_data);
    }
    let config: RunConfiguration | undefined = undefined;
    if (req.body.type == 'custom') {
        config = new RunConfiguration({
            inventory: json_data.inventory,
            professions: validateProfessions(JSON.parse(req.body.professions)),
            realm: {
                realm_name: req.body.server,
                region_name: req.body.region,
            },
        }, req.body.item_id, Number(req.body.count));
        logger.debug(`Custom search for item: ${req.body.item_id}, server: ${req.body.server}, region: ${req.body.region}, professions: ${req.body.professions}. JSON DATA: ${json_data.inventory.length}`);
    } else if (req.body.type == 'json') {
        logger.debug('json search');
        config = new RunConfiguration(json_data, req.body.item_id, Number(req.body.count));
        logger.debug(`JSON search for item: ${config.item_id}, server: ${config.realm_name}, region: ${config.realm_region}, professions: ${config.professions}. JSON DATA: ${json_data.inventory.length}`);
    }


    CPCInstance(logger, cache, api).then((instance) => {
        if (config !== undefined) {
            instance.runWithJSONConfig(config).then((data) => {
                const { intermediate } = data;
                res.json(intermediate);
            });
        }
    });

});

if (include_auction_history) {
    const ah = await CPCAuctionHistory(db, logger, api, cache);

    app.post('/auction_history', (req, res) => {
        const item: string = req.body.item;
        const realm: string = req.body.realm;
        const region: string = req.body.region;
        const bonuses: string[] = req.body.bonuses;
        const start_dtm: string | undefined = req.body.start_dtm;
        const end_dtm: string | undefined = req.body.end_dtm;

        logger.info(`Request for item: ${item}, realm: ${realm}, region: ${region}, bonuses: ${bonuses}, start_dtm: ${start_dtm}, end_dtm: ${end_dtm}`);
        ah.getAuctions(item, realm, getRegionCode(region), bonuses, start_dtm, end_dtm).then((result: AuctionSummaryData) => {
            logger.debug(`Return auction data`);
            res.json(result);
        }).catch(error => {
            logger.error("Issue getting auctions", error);
            res.json({ ERROR: error });
        });
    });

    app.post('/seen_item_bonuses', (req, res) => {
        const item: string = req.body.item;
        const region: string = req.body.region;

        logger.debug(`Getting seen bonus lists for ${item} in ${region}`);

        if (item === '') {
            res.json({ ERROR: 'empty item' });
        }

        ah.getAllBonuses(item, getRegionCode(region)).then(bonuses => {
            static_sources().then(cache => {
                const bonuses_cache = cache.bonuses_cache;
                logger.debug(`Regurning bonus lists for ${item}`);

                const ilvl_adjusts: Set<number | string> = new Set();
                const socket_adjusts: Set<number | string> = new Set();
                const quality_adjusts: Set<number | string> = new Set();
                const unknown_adjusts: Set<number | string> = new Set();
                let found_empty_bonuses = false;

                const b_array = bonuses.bonuses.map(e => {
                    const v: { text: string, parsed: Array<number | string>, reduced: string | undefined } = { text: e.bonuses, parsed: [], reduced: undefined };
                    v.parsed = JSON.parse(e.bonuses);
                    if (v.parsed !== null) {
                        v.reduced = <string>v.parsed.reduce((acc, cur) => {
                            let value = acc;
                            if (bonuses_cache[cur] !== undefined) {
                                let found = false;
                                const bonus_link = bonuses_cache[cur];

                                if (bonus_link.level !== undefined) {
                                    value += `ilevel ${bonuses.item.level + bonus_link.level} `;
                                    found = true;
                                    ilvl_adjusts.add(cur);
                                }
                                if (bonus_link.socket !== undefined) {
                                    value += `socketed `;
                                    found = true;
                                    socket_adjusts.add(cur);
                                }
                                if (bonus_link.quality !== undefined) {
                                    value += `quality: ${bonuses_cache[cur].quality} `;
                                    found = true;
                                    quality_adjusts.add(cur);
                                }
                                if (!found) {
                                    unknown_adjusts.add(cur);
                                }
                            }
                            return value;
                        }, '');
                    } else {
                        found_empty_bonuses = true;
                    }
                    return v;
                });

                const return_value: SeenItemBonusesReturn = {
                    bonuses: bonuses.bonuses,
                    //item: bonuses.item,
                    mapped: b_array,
                    collected: {
                        ilvl: Array.from(ilvl_adjusts).map(
                            (i: number | string) => {
                                return { id: i, level: bonuses_cache[i].level! + bonuses.item.level }
                            }),
                        socket: Array.from(socket_adjusts).map(
                            (i: number | string) => {
                                return { id: i, sockets: bonuses_cache[i].socket }
                            }),
                        quality: Array.from(quality_adjusts).map(
                            (i: number | string) => {
                                return { id: i, quality: bonuses_cache[i].quality }
                            }),
                        unknown: Array.from(unknown_adjusts),
                        empty: found_empty_bonuses,
                    },
                }

                //console.log(JSON.stringify(return_value,undefined,2));
                res.json(return_value);
            }).catch(error => {
                logger.error("Issue getting bonuses", error);
                res.json({ ERROR: error });
            });
        });
    });

    app.post('/bonus_mappings', (req, res) => {
        static_sources().then(
            cache => {
                res.json(cache.bonuses_cache);
            }
        )
    })
}

const server = app.listen(port, () => {
    logger.info(`Crafting Profit Calculator running at: http://localhost:${port}`)
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server')
    db.shutdown();
    cache.shutdown();
    server.close();
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server')
    db.shutdown();
    cache.shutdown();
    server.close();
});