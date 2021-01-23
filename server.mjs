import express from 'express';
import path from 'path';
import { runWithJSONConfig, shutdown } from './wow_crafting_profits.mjs';
import { RunConfiguration } from './RunConfiguration.mjs';
import { parentLogger } from './logging.mjs';

const logger = parentLogger.child();

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    logger.debug('json form requested');
    res.sendFile(path.resolve('html/json_form.html'));
});

app.get('/custom', (req, res) => {
    logger.debug('custom form requested');
    res.sendFile(path.resolve('html/custom_run_form.html'));
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