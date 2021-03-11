import { dbOpen, dbClose, dbRun, dbGet, dbAll, dbSerialize } from './sqlite3-helpers.js';
import { getAuctionHouse, getConnectedRealmId, checkIsCrafting, getItemId, getItemDetails } from './blizzard-api-helpers.js';
import { parentLogger } from './logging.js';
import sqlite3 from 'sqlite3';
import { saveCache } from './cached-data-sources.js';
import { getAuthorizationToken } from './blizz_oath.js';

const logger = parentLogger.child();

const db_fn = './historical_auctions.db';

const sql_create_item_table = 'CREATE TABLE IF NOT EXISTS auctions (item_id INTEGER, bonuses TEXT, quantity INTEGER, price INTEGER, downloaded INTEGER, connected_realm_id INTEGER)';
const sql_create_auctions_index = 'CREATE INDEX IF NOT EXISTS auctions_index ON auctions (item_id, bonuses, quantity, price, downloaded, connected_realm_id)';
const sql_create_items_table = 'CREATE TABLE IF NOT EXISTS items (item_id INTEGER, region TEXT, name TEXT, craftable INTEGER, PRIMARY KEY (item_id,region))';
const sql_create_realms_table = 'CREATE TABLE IF NOT EXISTS realms (connected_realm_id INTEGER, name TEXT, region TEXT, PRIMARY KEY (connected_realm_id,region))';
const sql_create_realm_scan_table = 'CREATE TABLE IF NOT EXISTS realm_scan_list (connected_realm_id INTEGER, region TEXT, PRIMARY KEY (connected_realm_id,region))';

const sql_run_at_open = [
    'PRAGMA synchronous = normal',
    'PRAGMA journal_mode=WAL',
    sql_create_item_table,
    sql_create_items_table,
    sql_create_realms_table,
    sql_create_realm_scan_table,
    sql_create_auctions_index,
];

const sql_run_at_close = [
    'PRAGMA optimize'
];

const sql_insert_auction = 'INSERT INTO auctions(item_id, quantity, price, downloaded, connected_realm_id, bonuses) VALUES(?,?,?,?,?,?)';
const sql_insert_item = 'INSERT INTO items(item_id, region, name, craftable) VALUES(?,?,?,?)';
const sql_insert_realm = 'INSERT INTO realms(connected_realm_id, name, region) VALUES(?,?,?)';

const sql_check_item = 'SELECT COUNT(*) AS how_many FROM items WHERE item_id = ? AND region = ?';
const sql_check_realm = 'SELECT COUNT(*) AS how_many FROM realms WHERE connected_realm_id = ? AND region = ?';

const ALL_PROFESSIONS = ['Jewelcrafting', 'Tailoring', 'Alchemy', 'Herbalism', 'Inscription', 'Enchanting', 'Blacksmithing', 'Mining', 'Engineering', 'Leatherworking', 'Skinning', 'Cooking'];

async function openDB() {
    const db = await dbOpen(sqlite3, db_fn, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);
    for (const query of sql_run_at_open) {
        await dbRun(db, query, []);
    }

    return db;
}

async function closeDB(db) {
    for (const query of sql_run_at_close) {
        await dbRun(db, query, []);
    }
    return dbClose(db);
}

async function ingest(region, connected_realm) {
    // Get auction house
    const auction_house = await getAuctionHouse(connected_realm, region);
    const downloaded = Date.now();
    // Loop over each auction and add it.
    const items = {};
    auction_house.auctions.forEach((auction) => {
        const item_id_key = auction.item.id + (('bonus_lists' in auction.item) ? JSON.stringify(auction.item.bonus_lists) : '');
        if (!(item_id_key in items)) {
            items[item_id_key] = {};
        }
        let price = 0;
        const quantity = auction.quantity;
        if ('buyout' in auction) {
            price = auction.buyout;
        } else {
            price = auction.unit_price;
        }
        if (!(price in items[item_id_key])) {
            items[item_id_key][price] = {
                item_id: auction.item.id,
                bonus_lists: auction.item.bonus_lists,
                price: price,
                quantity: 0,
            };
        }
        items[item_id_key][price].quantity += quantity;
    });

    const item_set = new Set();
    const insert_values_array = [];

    for (const key of Object.keys(items)) {
        for (const pk of Object.keys(items[key])) {
            item_set.add(items[key][pk].item_id);
            //item_id, quantity, price, downloaded, connected_realm_id, bonuses
            insert_values_array.push([items[key][pk].item_id, items[key][pk].quantity, items[key][pk].price, downloaded, connected_realm, JSON.stringify(items[key][pk].bonus_lists)]);
        }
    }

    const db = await openDB();

    await dbRun(db, 'BEGIN TRANSACTION', []);

    for (const item of item_set) {
        const result = await dbGet(db, sql_check_item, [item, region]);

        let found = false;
        if (result.how_many > 0) {
            found = true;
        }

        if (!found) {
            const item_detail = { name: '' }; //await getItemDetails(item, region);
            const craftable = false; //(await checkIsCrafting(item, ALL_PROFESSIONS, region)).craftable;
            await dbRun(db, sql_insert_item, [item, region, item_detail.name, craftable]);
        }
    }

    const result = await dbGet(db, sql_check_realm, [connected_realm, region]);

    let found = false;
    if (result.how_many > 0) {
        found = true;
    }

    if (!found) {
        const realm_detail = { name: '' }; //await getItemDetails(item, region);
        await dbRun(db, sql_insert_realm, [connected_realm, realm_detail.name, region]);
    }

    await Promise.all(insert_values_array.map((values) => {
        return dbRun(db, sql_insert_auction, values);
    }));

    await dbRun(db, 'COMMIT TRANSACTION', []);
    await closeDB(db);
}

async function getAllBonuses(item, region) {
    logger.debug(`Fetching bonuses for ${item}`);
    const sql = 'SELECT DISTINCT bonuses FROM auctions WHERE item_id = ?';

    let item_id = 0;
    if (Number.isFinite(Number(item))) {
        item_id = item;
    } else {
        item_id = await getItemId(region, item);
        if (item_id < 0) {
            logger.error(`No itemId could be found for ${item}`);
            throw (new Error(`No itemId could be found for ${item}`));
        }
        logger.info(`Found ${item_id} for ${item}`);
    }

    const db = await openDB();

    const bonuses = await dbAll(db, sql, [item_id]);

    logger.debug(`Found ${bonuses.length} bonuses for ${item}`);

    const item_details = await getItemDetails(item_id, region);

    closeDB(db);

    return {
        bonuses: bonuses,
        item: item_details,
    };
}

async function getAuctions(item, realm, region, bonuses, start_dtm, end_dtm) {
    logger.debug(`getAuctions(${item}, ${realm}, ${region}, ${bonuses}, ${start_dtm}, ${end_dtm})`);
    const sql_build = 'SELECT * FROM auctions';
    const sql_build_distinct_dtm = 'SELECT DISTINCT downloaded FROM auctions';
    const sql_build_price_map = 'SELECT price, count(price) AS sales_at_price, sum(quantity) AS quantity_at_price FROM auctions';
    const sql_group_by_price_addin = 'GROUP BY price';
    const sql_build_min = 'SELECT MIN(price) AS MIN_PRICE FROM auctions';
    const sql_build_max = 'SELECT MAX(price) AS MAX_PRICE FROM auctions';
    const sql_build_avg = 'SELECT SUM(price*quantity)/SUM(quantity) AS AVG_PRICE FROM auctions';
    const sql_build_latest_dtm = 'SELECT MAX(downloaded) AS LATEST_DOWNLOAD FROM auctions';
    const sql_addins = [];
    const value_searches = [];
    if (item !== undefined) {
        // Get specific items
        let item_id = 0;
        if (Number.isFinite(Number(item))) {
            item_id = item;
        } else {
            item_id = await getItemId(region, item);
            if (item_id < 0) {
                logger.error(`No itemId could be found for ${item}`);
                throw (new Error(`No itemId could be found for ${item}`));
            }
            logger.info(`Found ${item_id} for ${item}`);
        }
        sql_addins.push('item_id = ?');
        value_searches.push(item_id);
    } else {
        // All items
    }
    if (realm !== undefined) {
        let server_id = 0;
        if (Number.isFinite(Number(realm))) {
            server_id = realm;
        } else {
            server_id = await getConnectedRealmId(realm, region);
            if (server_id < 0) {
                logger.error(`No connected realm id could be found for ${realm}`);
                throw (new Error(`No connected realm id could be found for ${realm}`));
            }
            logger.info(`Found ${server_id} for ${realm}`);
        }
        // Get specific realm
        sql_addins.push('connected_realm_id = ?');
        value_searches.push(server_id);
    } else {
        // All realms
    }
    if (region !== undefined) {
        // Get specific region
        sql_addins.push('connected_realm_id IN (SELECT connected_realm_id FROM realms WHERE region = ?)');
        value_searches.push(region);
    } else {
        // All regions
    }
    if (bonuses !== undefined) {
        // Get only with specific bonuses
        bonuses.forEach(b => {
            if (b !== null) {
                logger.debug(`Add bonus instr(bonuses, ${b}) > 1`);
                sql_addins.push('instr(bonuses, ?) > 1');
                value_searches.push(b);
            }
        })
    } else {
        // any bonuses or none
    }
    if (start_dtm !== undefined) {
        // Include oldest fetch date time
        sql_addins.push('downloaded >= ?');
        value_searches.push(start_dtm);
    } else {
        // No start fetched date time limit
    }
    if (end_dtm !== undefined) {
        // Include newest fetch date time
        sql_addins.push('downloaded <= ?');
        value_searches.push(end_dtm);
    } else {
        // No latest fetched date time
    }

    const run_sql = build_sql_with_addins(sql_build, sql_addins);
    const min_sql = build_sql_with_addins(sql_build_min, sql_addins);
    const max_sql = build_sql_with_addins(sql_build_max, sql_addins);
    const avg_sql = build_sql_with_addins(sql_build_avg, sql_addins);
    const latest_dl_sql = build_sql_with_addins(sql_build_latest_dtm, sql_addins);
    const distinct_download_sql = build_sql_with_addins(sql_build_distinct_dtm, sql_addins);

    const min_dtm_sql = build_sql_with_addins(sql_build_min, [...sql_addins, 'downloaded = ?']);
    const max_dtm_sql = build_sql_with_addins(sql_build_max, [...sql_addins, 'downloaded = ?']);
    const avg_dtm_sql = build_sql_with_addins(sql_build_avg, [...sql_addins, 'downloaded = ?']);
    const price_group_sql = build_sql_with_addins(sql_build_price_map, [...sql_addins, 'downloaded = ?']) + ' ' + sql_group_by_price_addin;

    let db = await openDB();
    //console.log(run_sql);
    const min_value = (await dbGet(db, min_sql, value_searches)).MIN_PRICE;
    const max_value = (await dbGet(db, max_sql, value_searches)).MAX_PRICE;
    const avg_value = (await dbGet(db, avg_sql, value_searches)).AVG_PRICE;
    const latest_dl_value = (await dbGet(db, latest_dl_sql, value_searches)).LATEST_DOWNLOAD

    const price_data_by_download = {};
    for (const row of (await dbAll(db, distinct_download_sql, value_searches))) {
        price_data_by_download[row.downloaded] = {};
        price_data_by_download[row.downloaded].data = await dbAll(db, price_group_sql, [...value_searches, row.downloaded]);
        price_data_by_download[row.downloaded].min_value = (await dbGet(db, min_dtm_sql, [...value_searches, row.downloaded])).MIN_PRICE;
        price_data_by_download[row.downloaded].max_value = (await dbGet(db, max_dtm_sql, [...value_searches, row.downloaded])).MAX_PRICE;
        price_data_by_download[row.downloaded].avg_value = (await dbGet(db, avg_dtm_sql, [...value_searches, row.downloaded])).AVG_PRICE;
    }

    logger.debug(`Found max: ${max_value}, min: ${min_value}, avg: ${avg_value}`);
    closeDB(db);

    return {
        min: min_value,
        max: max_value,
        avg: avg_value,
        latest: latest_dl_value,
        price_map: price_data_by_download,
    };

    function build_sql_with_addins(base_sql, addin_list) {
        let construct_sql = base_sql;
        if (addin_list.length > 0) {
            construct_sql += ' WHERE ';
            for (const addin of addin_list) {
                construct_sql += addin;
                construct_sql += ' AND ';
            }
            construct_sql = construct_sql.slice(0, construct_sql.length - 4);
        }
        return construct_sql;
    }
}

async function addRealmToScanList(realm_name, realm_region) {
    const sql = 'INSERT INTO realm_scan_list(connected_realm_id,region) VALUES(?,?)';
    const db = await openDB();
    await dbRun(db, sql, [await getConnectedRealmId(realm_name, realm_region), realm_region]);
    await closeDB(db);
}

async function removeRealmFromScanList(realm_name, realm_region) {
    const sql = 'DELETE FROM realm_scan_list WHERE connected_realm_id = ? AND region = ?';
    const db = await openDB();
    await dbRun(db, sql, [await getConnectedRealmId(realm_name, realm_region), realm_region]);
    await closeDB(db);
}

async function scanRealms() {
    const db = await openDB();
    const getScannableRealms = 'SELECT connected_realm_id, region FROM realm_scan_list';
    const realm_scan_list = await dbAll(db, getScannableRealms, []);
    await Promise.all(realm_scan_list.map((realm) => {
        return ingest(realm.region, realm.connected_realm_id);
    }));
    await closeDB(db);
}

async function init() { }

await init();

/*await main('US', 'Hyjal');
await getAuctions();
await getAuctions(1);
await getAuctions(1, 2);
await getAuctions(1, 2, 3);
await getAuctions(1, 2, 3, 4);
await getAuctions(undefined, 2, 'US', 4);
await getAuctions(1, undefined, 3, 4);
await getAuctions(1, 2, undefined, 4);
await getAuctions(undefined, undefined, 'US', 4);
await getAuctions(1, undefined, undefined, 4);
await getAuctions(1, 2, undefined, 4);
await getAuctions(undefined, 2, undefined, 4);
await getAuctions(undefined, undefined, undefined, 4);
await getAuctions(undefined, undefined, 'US', undefined);
*/

export { scanRealms, addRealmToScanList, removeRealmFromScanList, getAuctions, getAllBonuses };