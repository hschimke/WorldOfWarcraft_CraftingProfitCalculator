import express from 'express';
import path from 'path';
import { runWithJSONConfig, shutdown } from './wow_crafting_profits.js';
import { RunConfiguration } from './RunConfiguration.js';
import { parentLogger } from './logging.js';
import { getAuctions, getAllBonuses } from './auction-history.js';
import { bonuses_cache } from './cached-data-sources.js';
import './hourly-injest.js';

const logger = parentLogger.child();

const app = express();
const port = process.env.SERVER_PORT;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(express.static(path.resolve('html/build')));

app.get('/', (req, res) => {
    logger.debug('Homepage requested');
    res.sendFile(path.resolve('html/build/index.html'));
});

app.get('*', (req, res) => {
    logger.debug('Unknown route requested');
    res.sendFile(path.resolve('html/build/index.html'));
});

app.post('/show_output', (req, res) => {
    let json_data = { inventory: [] };
    if (req.body.addon_data.length > 0) {
        json_data = JSON.parse(req.body.addon_data);
    }
    let config = {};
    if (req.body.type == 'custom') {
        config = new RunConfiguration({
            inventory: json_data.inventory,
            professions: JSON.parse(req.body.professions),
            realm: {
                realm_name: req.body.server,
                region_name: req.body.region,
            },
        }, req.body.item_id, Number(req.body.count));
        logger.debug(`Custom search for item: ${req.body.item_id}, server: ${req.body.server}, region: ${req.body.region}, professions: ${req.body.professions}. JSON DATA: ${json_data.inventory.length}`);
    } else if (req.body.type == 'json') {
        logger.debug('json search');
        config = new RunConfiguration(json_data, req.body.item_id, Number(req.body.needed));
        config.region
        logger.debug(`JSON search for item: ${config.item_id}, server: ${config.realm_name}, region: ${config.realm_region}, professions: ${config.professions}. JSON DATA: ${json_data.inventory.length}`);
    }

    runWithJSONConfig(config).then((data) => {
        const { price, intermediate, formatted } = data;
        res.send(`
        <html>
            <head></head>
            <body>
                <pre>${formatted}</pre>
            </body>
        </html>`);
    });
});

app.post('/json_output', (req, res) => {
    let json_data = { inventory: [] };
    if (req.body.addon_data.length > 0) {
        json_data = JSON.parse(req.body.addon_data);
    }
    let config = {};
    if (req.body.type == 'custom') {
        config = new RunConfiguration({
            inventory: json_data.inventory,
            professions: JSON.parse(req.body.professions),
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

    runWithJSONConfig(config).then((data) => {
        const { price, intermediate, formatted } = data;
        res.json(intermediate);
    });
});

app.post('/auction_history', (req, res) => {
    const item = req.body.item;
    const realm = req.body.realm;
    const region = req.body.region;
    const bonuses = req.body.bonuses;
    const start_dtm = req.body.start_dtm;
    const end_dtm = req.body.end_dtm;

    logger.info(`Request for item: ${item}, realm: ${realm}, region: ${region}, bonuses: ${bonuses}, start_dtm: ${start_dtm}, end_dtm: ${end_dtm}`);
    getAuctions(item, realm, region, bonuses, start_dtm, end_dtm).then(result => {
        logger.debug(`Return auction data`);
        res.json(result);
    }).catch(error => {
        logger.error("Issue getting auctions", error);
        res.json({ ERROR: error });
    });
});

app.post('/seen_item_bonuses', (req, res) => {
    const item = req.body.item;
    const region = req.body.region;

    logger.debug(`Getting seen bonus lists for ${item} in ${region}`);

    if (item === '') {
        res.json({ ERROR: 'empty item' });
    }

    getAllBonuses(item, region).then(bonuses => {
        logger.debug(`Regurning bonus lists for ${item}`);

        const ilvl_adjusts = new Set();
        const socket_adjusts = new Set();
        const quality_adjusts = new Set();
        const unknown_adjusts = new Set();
        let found_empty_bonuses = false;

        const b_array = bonuses.bonuses.map(e => {
            const v = { text: e.bonuses };
            v.parsed = JSON.parse(e.bonuses);
            if (v.parsed !== null) {
                v.reduced = v.parsed.reduce((acc, cur) => {
                    let value = acc;
                    if (cur in bonuses_cache) {
                        let found = false;
                        if ('level' in bonuses_cache[cur]) {
                            value += `ilevel ${bonuses.item.level + bonuses_cache[cur].level} `;
                            found = true;
                            ilvl_adjusts.add(cur);
                        }
                        if ('socket' in bonuses_cache[cur]) {
                            value += `socketed `;
                            found = true;
                            socket_adjusts.add(cur);
                        }
                        if ('quality' in bonuses_cache[cur]) {
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

        res.json({
            bonuses: bonuses.bonuses,
            //item: bonuses.item,
            mapped: b_array,
            collected: {
                ilvl: Array.from(ilvl_adjusts).map(i => { return { id: i, level: bonuses_cache[i].level + bonuses.item.level } }),
                socket: Array.from(socket_adjusts).map(i => { return { id: i, sockets: bonuses_cache[i].socket } }),
                quality: Array.from(quality_adjusts).map(i => { return { id: i, quality: bonuses_cache[i].quality } }),
                unknown: Array.from(unknown_adjusts),
                empty: found_empty_bonuses,
            },
        });
    }).catch(error => {
        logger.error("Issue getting bonuses", error);
        res.json({ ERROR: error });
    });
});

app.post('/bonus_mappings', (req, res) => {
    res.json(bonuses_cache);
})

const server = app.listen(port, () => {
    logger.info(`Crafting Profit Calculator running at: http://localhost:${port}`)
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server')
    shutdown()
        .then(server.close());
});

process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server')
    shutdown()
        .then(server.close());
});