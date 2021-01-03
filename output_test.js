const data = require('./raw_output.json');
const app = require('./wow_crafting_profits.js');
const fs = require('fs');

app.textFriendlyOutputFormat(data,0,'us').then((formatted_data) => {
    fs.writeFile('formatted_output', formatted_data, 'utf8', () => {
        console.log('Raw output saved');
    });
})