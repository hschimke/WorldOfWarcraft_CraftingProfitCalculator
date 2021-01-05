const yargs = require('yargs');
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
//const test_item = 171276;
// Bracers
//173249

const argv = yargs
    .option('region', {
        description: 'Region',
        alias: 'r',
        type: 'string',
        default: 'us',
    })
    .option('server', {
        description: 'Server',
        alias: 's',
        type: 'string',
        default: 'hyjal',
    })
    .option('profession', {
        description: 'Profession',
        alias: 'p',
        type: 'string',
        default: ['Jewelcrafting', 'Tailoring', 'Alchemy', 'Inscription', 'Enchanting', 'Blacksmithing'],
    })
    .option('item', {
        description: 'Item',
        alias: 'i',
        type: 'number',
        default: 173249,
    })
    .help()
    .alias('help', 'h')
    .argv;

app.run(argv.region,argv.server,argv.profession,argv.item,1);
