const got = require('got');
const yargs = require('yargs');
const fs = require('fs');

const secrets = require('./secrets.json');
const clientID = '9d85a3dfca994efa969df07bd1e47695';
const clientSecret = secrets.keys.client_secret;

const authorization_uri = 'https://us.battle.net/oauth/token';
let clientAccessToken = {
    access_token: '',
    token_type: '',
    expires_in: '',
    scope: '',
    fetched: Date.now(),
    checkExpired: function(){
        //always expires, bad practice
        return true;
    },
};

const cache_name = './data-cache.json';

try {
    cached_data = require(cache_name);
} catch (e) {
    cached_data = {
        fetched_auction_houses: [],
        fetched_crafting_items: [],
        fetched_auctions_data: {},
        fetched_crafting_item_data: {},
        auction_house_fetch_dtm: {}
    };
}

function saveCache() {
    fs.writeFile(cache_name, JSON.stringify(cached_reports), 'utf8', () => {
        console.log('Cache saved');
    });
}

async function getAuthorizationToken(){
    try{
        const auth_response = await got(authorization_uri, {
            responseType: 'json',
            method: 'POST',
            username: clientID+':'+clientSecret,
            headers: {
                'Connection': 'keep-alive'
            },
            form: {
                'grant_type': 'client_credentials',
            }
        });
        clientAccessToken.access_token = auth_response.body.access_token;
        clientAccessToken.token_type = auth_response.body.token_type;
        clientAccessToken.expires_in = auth_response.body.expires_in;
        clientAccessToken.scope = auth_response.body.scope;
        clientAccessToken.fetched = Date.now();
    }catch(error){
        console.log("An error was encountered while retrieving an authorization token: " + error);
    }
}

async function getItemId( item_name ){}
async function getServerId( server_name ){
    // Get a list of all connected realms
    // Pull the data for each connection until you find one with the server name in question
    // Return that connected realm ID
}
async function getItemDetails( item_id ){}
async function checkIsCrafting( item_id, character_professions ){}
async function getCraftingReagents( item_id ){}
async function getAuctionHouse( server_id ){}
async function getAHItemPrice( item_id, auction_house ){}
async function findNoneAHPrice( item_id ){}

async function performProfitAnalysis(region, server, character_professions, item){
    // Check if we have to figure out the item id ourselves
    let item_id = 0;
    if( Number.isFinite(item) ){
        item_id = item;
    }else{
        item_id = await getItemId( item );
    }

    let price_obj = {
        item_id = item_id
    };

    // Get the realm id
    const server_id = await getServerId( server );

    //Get the auction house
    price_obj.auction_house = await getAuctionHouse( server_id );

    // Get Item AH price
    price_obj.item_price = await getAHItemPrice( item_id, auction_house );

    // Get NON AH price
    price_obj.item_non_ah_price = await findNoneAHPrice( item_id );

    if( await checkIsCrafting( item_id, character_professions ) ){
        // Get Reagents
        const item_bom = await getCraftingReagents( item_id );

        // Get prices for BOM
        let bom_prices = [];
        item_bom.forEach((id) => {
            if( await checkIsCrafting( id, character_professions ) ){
                bom_prices.push( await performProfitAnalysis( region, server, character_professions, item ) );
            }else{
                bom_prices.push(await getAHItemPrice( id ));
            }
        });

        price_obj.bom_prices = bom_prices;
    }else{
        console.log( "Item not crafted" );
    }

    return price_obj;
}

//outline
// [X] Get the item and server from the user
// [X] If the item is a string then get the item ID from bliz
// [X] Get the connected-server id from bliz
// [X] Verify that the item is a crafting item and pull requirements from bliz
// [X] Check the auction house cache and refresh it if necessary (probably if it is older than one hour)
// [X] Pull all the prices for the item from the auction house cache
// [X] Pull all the prices for the components from the auction house
// [X] Check if there is a non-crafting/non-auction price for the components
// [ ] Print the summary of the item price from auction house and the component prices

function run(){
    console.log("World of Warcraft Crafting Profit Calculator");

    const test_region = 'us';
    const test_server = 'hyjal';
    const test_character_professions = ['Jewelcrafting', 'Blacksmithing'];
    const test_item = 178926;

    await performProfitAnalysis(test_region, test_server, test_character_professions, test_item);
}

run();