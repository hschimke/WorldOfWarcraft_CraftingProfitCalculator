import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { cliRun } from './wow_crafting_profits.mjs';
import { RunConfiguration } from './RunConfiguration.mjs';

const test_region = 'us';
const test_server = 'hyjal';
const test_character_professions = ['Jewelcrafting', 'Tailoring', 'Alchemy', 'Inscription', 'Enchanting', 'Blacksmithing', 'Engineering', 'Leatherworking', 'Mining', 'Skinning','Herbalism'];
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

const argv = yargs(hideBin(process.argv))
    .option('region', {
        description: 'Region',
        alias: 'r',
        type: 'string',
        default: 'US',
    })
    .option('server', {
        description: 'Server',
        alias: 's',
        type: 'string',
        default: 'Hyjal',
    })
    .option('profession', {
        description: 'Profession',
        alias: 'p',
        type: 'string',
        default: ['Jewelcrafting', 'Tailoring', 'Alchemy', 'Herbalism', 'Inscription', 'Enchanting', 'Blacksmithing', 'Mining', 'Engineering', 'Leatherworking', 'Skinning', 'Cooking'],
    })
    .option('item', {
        description: 'Item',
        alias: 'i',
        type: 'string',
        default: '171276',
    })
    .option('json_config', {
        description: 'JSON configuration data',
        alias: 'j',
        type: 'string',
        default: '',
    })
    .command('json', 'Use JSON to configure region, realm, and professions')
    .help()
    .alias('help', 'h')
    .argv;

let character_config_json = { inventory: [] };
let region = argv.region;
let server = argv.server;
let professions = argv.profession;
let item = argv.item;

try {
    character_config_json = JSON.parse(argv.json_config);
    let good = true;
    let has_inventory = true;
    let has_professions = true;
    let has_realm = true;
    if (!character_config_json.hasOwnProperty('inventory')) {
        good = false;
        has_inventory = false;
    }
    if (!character_config_json.hasOwnProperty('professions')) {
        good = false;
        has_professions = false;
    }
    if (!character_config_json.hasOwnProperty('realm')) {
        good = false;
        has_realm = false;
    }

    if (good) {
        professions = Array.from(new Set(character_config_json.professions));

        if (argv.json) {
            region = character_config_json.realm.region_name;
            server = character_config_json.realm.realm_name;
        }
    }
} catch (e) {
    console.log('JSON character input cannot be parsed.')
}
const config = new RunConfiguration({
    inventory: character_config_json.inventory,
    professions: professions,
    realm: {
        realm_name: server,
        region_name: region,
    },
}, item, 1);

cliRun(config);
