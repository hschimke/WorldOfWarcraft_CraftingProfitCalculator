const express = require('express');
const CraftingProfitCalculator = require('./wow_crafting_profits');
const { RunConfiguration } = require('./RunConfiguration');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.send(
        `<html>
        <head></head>
        <body>
        <h1>Crafting Profit Calculator</h1>
        <form method="post" action="/show_output"">
        <label for="item_id">Item ID:</label>
        <input type="text" name="item_id" />
        <br />
        <label for="addon_data">Addon Data</label>
        <br />
        <textarea name="addon_data" rows="20" cols="55"></textarea>
        <input type="submit" value="Run" />
        </form>
        </body>
        </html>`
    );
});

app.post('/show_output', (req, res) => {
    const config = new RunConfiguration(JSON.parse(req.body.addon_data),Number(req.body.item_id),1);
    CraftingProfitCalculator.runWithJSONConfig(config).then((data) => {
        const { price, intermediate, formatted } = data;
        res.send(`
        <html><head></head>
        <body>
        <pre>${formatted}</pre>
        </body>
        </html>`);
    });
});

const server = app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});

process.on('SIGINT', () => {
    console.log('SIGTERM signal received: closing HTTP server')
    CraftingProfitCalculator.shutdown();
    server.close();
});