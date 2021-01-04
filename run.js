const app = require('./wow_crafting_profits.js');

const test_region = 'us';
const test_server = 'hyjal';
const test_character_professions = ['Jewelcrafting', 'Tailoring', 'Alchemy', 'Inscription', 'Enchanting', 'Blacksmithing'];
//blacksmithing
//const test_item = 171414;
//tailoring
//const test_item = 173244;
//simple wood
//const test_item = 4470;
// Flask
const test_item = 171276;

app.run(test_region,test_server,test_character_professions,test_item,1);
