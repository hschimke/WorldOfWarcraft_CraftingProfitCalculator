const express = require('express');
const path = require('path');
const CraftingProfitCalculator = require('./wow_crafting_profits');
const { RunConfiguration } = require('./RunConfiguration');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: false }));
//app.use(express.static('html'));

app.get('/', (req, res) => {
    res.sendFile(path.resolve('html/json_form.html'));
});

app.get('/custom', (req,res)=>{
    res.sendFile(path.resolve('html/custom_run_form.html'));
});

app.post('/show_output', (req, res) => {
    let json_data = {inventory:[]};
    if(req.body.addon_data.length > 0){
    json_data = JSON.parse(req.body.addon_data);
    }
    let config = {};
    if( req.body.type == 'custom'){
        config = new RunConfiguration({
            inventory: json_data.inventory,
            professions: JSON.parse(req.body.professions),
            realm: {
                realm_name: req.body.server,
                region_name: req.body.region,
            },
        },Number(req.body.item_id),Number(req.body.count));
    }else if( req.body.type == 'json'){
        config = new RunConfiguration(json_data,Number(req.body.item_id), 1);
    }
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