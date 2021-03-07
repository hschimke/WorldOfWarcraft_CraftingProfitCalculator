import express from 'express';
import path from 'path';
import { runWithJSONConfig, shutdown } from './wow_crafting_profits.js';
import { RunConfiguration } from './RunConfiguration.js';
import { parentLogger } from './logging.js';
import { getAuctions } from './auction-history.js';

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

app.get('*', (req,res) =>{
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
        res.send(intermediate);
    });
});

app.post('/auction_history', (req, res) => {
    const item = req.body.item;
    const realm = req.body.realm;
    const region = req.body.region;
    const bonuses = req.body.bonuses;
    const start_dtm = req.body.start_dtm;
    const end_dtm = req.body.end_dtm;

    let return_a;
    logger.info(`Request for item: ${item}, realm: ${realm}, region: ${region}, bonuses: ${bonuses}, start_dtm: ${start_dtm}, end_dtm: ${end_dtm}`);
    getAuctions(item, realm, region, bonuses, start_dtm, end_dtm).then(result => {
        return_a = result;
        getAuctions(item, realm, region, bonuses, result.latest, result.latest).then( final => {
            logger.debug(`Return auction data`);
            return_a.latest_data = final;
            res.json(return_a);
        })
    });
});

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