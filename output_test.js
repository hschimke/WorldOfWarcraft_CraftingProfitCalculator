const data = require('./intermediate_output.json');
const app = require('./wow_crafting_profits.js');
const fs = require('fs');

app.textFriendlyOutputFormat(data,'us').then((formatted_data) => {
    fs.writeFile('formatted_output', formatted_data, 'utf8', () => {
        console.log('Raw output saved');
    });
})