const got = require('got');
const yargs = require('yargs');
const fs = require('fs');

const secrets = require('./secrets.json');
const clientID = '9d85a3dfca994efa969df07bd1e47695';
const clientSecret = secrets.keys.client_secret;

const base_uri = 'api.blizzard.com';

const authorization_uri = 'https://us.battle.net/oauth/token';
let clientAccessToken = {
    access_token: '',
    token_type: '',
    expires_in: 0,
    scope: '',
    fetched: Date.now(),
    checkExpired: function(){
        let expired = true;
        const current_time = Date.now();
        const expire_time = this.fetched + (this.expires_in * 1000);
        if( current_time < expire_time ){
            expired = false;
        }
        return expired;
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
    if( clientAccessToken.checkExpired() ){
        try{
            const auth_response = await got(authorization_uri, {
                responseType: 'json',
                method: 'POST',
                username: clientID,
                password: clientSecret,
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
    return clientAccessToken;
}

async function getBlizzardAPIResponse( region_code, authorization_token, data, uri ){
    try{
        // CHECK OUT TEMPLATE STRING FOR MORE USEES
        const api_response = await got( `${region_code}.${base_uri}${uri}`, {
            reponseType: 'json',
            method: 'POST',
            headers: {
                'Connection': 'keep-alive',
                'Bearer': authorization_token.access_token
            },
            form: data
        });
        return api_response.body;
    }catch( error ){
        console.log( 'Issue fetching blizzard data: ' + error );
    }
}

async function getItemId( item_name ){}

async function getConnectedRealmId( server_name, server_region ){
    const list_connected_realms_api = '/data/wow/connected-realm/index';
    const get_connected_realm_api = '/data/wow/connected-realm'; // /{connectedRealmId}
    const list_connected_realms_form = {
        ':region': server_region,
        'namespace': 'dynamic-us',
        'locale': 'en_US'
    };
    const get_connected_realm_form = {
        ':region': server_region,
        'namespace': 'dynamic-us',
        'locale': 'en_US'
    };
    const access_token = await getAuthorizationToken();

    let realm_id = 0;

    // Get a list of all connected realms
    const all_connected_realms = await getBlizzardAPIResponse(
        server_region,
        access_token,
        list_connected_realms_form,
        list_connected_realms_api );

    // Pull the data for each connection until you find one with the server name in question
    for( let realm_href of all_connected_realms.connected_realms ){
        const hr = realm_href.href;
        const connected_realm_detail = await got( hr, {
            reponseType: 'json',
            method: 'POST',
            headers: {
                'Connection': 'keep-alive',
                'Bearer': authorization_token.access_token
            },
            form: get_connected_realm_form
        });
        const realm_list = connected_realm_detail.body.realms;
        let found_realm = false;
        for( let rlm of realm_list ){
            if( rlm.name == server_name ) {
                found_realm = true;
                break;
            }
        }
        if( found_realm == true ){
            realm_id = connected_realm_detail.id;
            break;
        }
    }
    // Return that connected realm ID
    return realm_id;
}
async function getItemDetails( item_id ){}
async function checkIsCrafting( item_id, character_professions ){
    // Get a list of the crafting levels for the professions

    // Get a list of all recipes each level can do

    // Check if the item_id is in the recipes
}
async function getCraftingReagents( item_id ){
    // Get a list of all recipes

    // Check if the item_id is in the list

}
async function getAuctionHouse( server_id, server_region ){
    // Download the auction house for the server_id

    if( !cached_data.fetched_auction_houses.includes( server_id) ){
        cached_data.fetched_auction_houses.push(server_id);

        const auction_house_fetch_uri = `/data/wow/connected-realm/${server_id}/auctions`;
        const auth_token = await getAuthorizationToken();
        cached_data.fetched_auctions_data[server_id] = await getBlizzardAPIResponse(
            server_region,
            await getAuthorizationToken(),
            {
                ':region': server_region,
                'namespace': 'dynamic-us',
                'locale': 'en_US'
            },
            auction_house_fetch_uri);
    }

    return cached_data.fetched_auctions_data[server_id];
}

async function getAHItemPrice( item_id, auction_house ){
    // Find the item and return best, worst, average prices
    // Ignore everything but buyout auctions
    let item_high = 0;
    let item_low = Number.MAX_VALUE;
    let item_average = 0;

    let average_counter = 0;
    let average_accumulator = 0;
    auction_house.auctions.forEach( (auction) => {
        if( auction.keys.includes('buyout') ){
            if( auction.item.id == item_id ){
                if(auction.buyout > item_high){
                    item_high = auction.buyout;
                }
                if( auction.buyout > item_low ){
                    item_low = auction.buyout;
                }
                average_counter++;
                average_accumulator+=auction.buyout;
            }
        }
    });
    item_average = average_accumulator/average_counter;
    
    return {
        high: item_high,
        low: item_low,
        average: item_average
    };
}
async function findNoneAHPrice( item_id ){
    // Get the item from blizz and see what the purchase price is, this cannot be trusted.
}

async function performProfitAnalysis(region, server, character_professions, item){
    // Check if we have to figure out the item id ourselves
    let item_id = 0;
    if( Number.isFinite(item) ){
        item_id = item;
    }else{
        item_id = await getItemId( item );
    }

    let price_obj = {
        item_id: item_id
    };

    // Get the realm id
    const server_id = await getConnectedRealmId( server );

    //Get the auction house
    price_obj.auction_house = await getAuctionHouse( server_id, region );

    // Get Item AH price
    price_obj.item_price = await getAHItemPrice( item_id, auction_house );

    // Get NON AH price
    price_obj.item_non_ah_price = await findNoneAHPrice( item_id );

    if( await checkIsCrafting( item_id, character_professions ) ){
        // Get Reagents
        const item_bom = await getCraftingReagents( item_id );

        // Get prices for BOM
        let bom_prices = [];
        for( let id of item_bom ){
            if( await checkIsCrafting( id, character_professions ) ){
                bom_prices.push( await performProfitAnalysis( region, server, character_professions, item ) );
            }else{
                bom_prices.push( await getAHItemPrice( id ) );
            }
        }

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

    performProfitAnalysis( test_region, test_server, test_character_professions, test_item)
        .then((price_data) => {
            console.log( price_data );
        }).then(()=>{
            saveCache();
        });
}

run();