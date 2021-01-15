'use strict';
import express from 'express';
import path from 'path';
import { runWithJSONConfig, shutdown } from './wow_crafting_profits.mjs';
import { RunConfiguration } from './RunConfiguration.mjs';
import {parentLogger} from './logging.mjs';

const logger = parentLogger.child();

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.sendFile(path.resolve('html/json_form.html'));
});

app.get('/custom', (req, res) => {
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
    } else if (req.body.type == 'json') {
        config = new RunConfiguration(json_data, req.body.item_id, 1);
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
    logger.info(`Example app listening at http://localhost:${port}`)
});

process.on('SIGINT', () => {
    logger.info('SIGTERM signal received: closing HTTP server')
    shutdown();
    server.close();
});