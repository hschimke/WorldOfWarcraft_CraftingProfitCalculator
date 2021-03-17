import { dbOpen, dbClose, dbRun, dbGet, dbAll, dbPrepare, statementAll, statementGet, statementRun } from './sqlite3-helpers.js';
import { getAuctionHouse, getConnectedRealmId, checkIsCrafting, getItemId, getItemDetails } from './blizzard-api-helpers.js';
import { parentLogger } from './logging.js';
import sqlite3 from 'sqlite3';

const logger = parentLogger.child();

const db_fn = './historical_auctions.db';

const sql_create_item_table = 'CREATE TABLE IF NOT EXISTS auctions (item_id INTEGER, bonuses TEXT, quantity INTEGER, price INTEGER, downloaded INTEGER, connected_realm_id INTEGER)';
const sql_create_auctions_index = 'CREATE INDEX IF NOT EXISTS auctions_index ON auctions (item_id, bonuses, quantity, price, downloaded, connected_realm_id)';
const sql_create_items_table = 'CREATE TABLE IF NOT EXISTS items (item_id INTEGER, region TEXT, name TEXT, craftable INTEGER, PRIMARY KEY (item_id,region))';
const sql_create_realms_table = 'CREATE TABLE IF NOT EXISTS realms (connected_realm_id INTEGER, name TEXT, region TEXT, PRIMARY KEY (connected_realm_id,region))';
const sql_create_realm_scan_table = 'CREATE TABLE IF NOT EXISTS realm_scan_list (connected_realm_id INTEGER, region TEXT, PRIMARY KEY (connected_realm_id,region))';
const sql_create_archive_table = 'CREATE TABLE IF NOT EXISTS auction_archive (item_id INTEGER, bonuses TEXT, quantity INTEGER, summary TEXT, downloaded INTEGER, connected_realm_id INTEGER)';
const sql_create_auction_archive_index = 'CREATE INDEX IF NOT EXISTS auction_archive_index ON auction_archive (item_id, bonuses, downloaded, connected_realm_id)';

const sql_run_at_open = [
    'PRAGMA synchronous = normal',
    'PRAGMA journal_mode=WAL',
    sql_create_item_table,
    sql_create_items_table,
    sql_create_realms_table,
    sql_create_realm_scan_table,
    sql_create_auctions_index,
    sql_create_archive_table,
    sql_create_auction_archive_index,
];

const sql_run_at_close = [
    'PRAGMA optimize'
];

const sql_insert_auction = 'INSERT INTO auctions(item_id, quantity, price, downloaded, connected_realm_id, bonuses) VALUES(?,?,?,?,?,?)';
const sql_insert_auction_archive = 'INSERT INTO auction_archive(item_id, quantity, summary, downloaded, connected_realm_id, bonuses) VALUES(?,?,?,?,?,?)';
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

async function ingest(region, connected_realm, db_in) {
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

    const db = db_in === undefined ? await openDB() : db_in;

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
    if (db_in === undefined) {
        await closeDB(db);
    }
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

    await closeDB(db);

    return {
        bonuses: bonuses,
        item: item_details,
    };
}

async function getAuctions(item, realm, region, bonuses, start_dtm, end_dtm, db_in) {
    logger.debug(`getAuctions(${item}, ${realm}, ${region}, ${bonuses}, ${start_dtm}, ${end_dtm})`);
    const sql_build = 'SELECT * FROM auctions';
    const sql_archive_build = 'SELECT downloaded, summary FROM auction_archive';
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
        if (bonuses === null) {
            sql_addins.push('bonuses IS NULL');
        }
        else if (typeof bonuses !== typeof []) {
            sql_addins.push('bonuses = ?');
            value_searches.push(bonuses);
        } else {
            bonuses.forEach(b => {
                if (b !== null && b !== '') {
                    logger.debug(`Add bonus ${b} in (select json_each.value from json_each(bonuses))`);
                    sql_addins.push('? IN (SELECT json_each.value FROM json_each(bonuses))');
                    value_searches.push(Number(b));
                }
            });
        }
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

    const db = db_in === undefined ? await openDB() : db_in;

    const min_value = (await dbGet(db, min_sql, value_searches)).MIN_PRICE;
    const max_value = (await dbGet(db, max_sql, value_searches)).MAX_PRICE;
    const avg_value = (await dbGet(db, avg_sql, value_searches)).AVG_PRICE;
    const latest_dl_value = (await dbGet(db, latest_dl_sql, value_searches)).LATEST_DOWNLOAD

    const price_group_stmt = await dbPrepare(db,price_group_sql);
    const min_dtm_stmt = await dbPrepare(db,min_dtm_sql);
    const max_dtm_stmt = await dbPrepare(db,max_dtm_sql);
    const avg_dtm_stmt = await dbPrepare(db,avg_dtm_sql);

    const price_data_by_download = {};
    for (const row of (await dbAll(db, distinct_download_sql, value_searches))) {
        price_data_by_download[row.downloaded] = {};
        price_data_by_download[row.downloaded].data = await statementAll(price_group_stmt, [...value_searches, row.downloaded]);
        price_data_by_download[row.downloaded].min_value = (await statementGet(min_dtm_stmt, [...value_searches, row.downloaded])).MIN_PRICE;
        price_data_by_download[row.downloaded].max_value = (await statementGet(max_dtm_stmt, [...value_searches, row.downloaded])).MAX_PRICE;
        price_data_by_download[row.downloaded].avg_value = (await statementGet(avg_dtm_stmt, [...value_searches, row.downloaded])).AVG_PRICE;
    }

    price_group_stmt.finalize();
    min_dtm_stmt.finalize();
    max_dtm_stmt.finalize();
    avg_dtm_stmt.finalize();

    // Get archives if they exist
    const archive_fetch_sql = build_sql_with_addins(sql_archive_build, sql_addins);
    const archives = await dbAll(db, archive_fetch_sql, value_searches);
    const archived_results = {};
    logger.debug(`Found ${archives.length} archive rows.`);
    for (const archive of archives) {
        if (!(archive.downloaded in archived_results)) {
            archived_results[archive.downloaded] = [];
        }
        archived_results[archive.downloaded].push(JSON.parse(archive.summary));
    }

    const archive_build = [];

    for (const key of Object.keys(archived_results)) {
        const arch = archived_results[key];

        const arch_build = {
            timestamp: key,
            data: [],
            min_value: Number.MAX_SAFE_INTEGER,
            max_value: Number.MIN_SAFE_INTEGER,
            avg_value: 0,
        };

        const price_link = {};

        for (const a of arch) {

            if (arch_build.min_value > a.min_value) {
                arch_build.min_value = a.min_value;
            }
            if (arch_build.max_value < a.max_value) {
                arch_build.max_value = a.max_value;
            }
            arch_build.avg_value += a.avg_value;
            for (const p of a.data) {
                if (!(p.price in price_link)) {
                    price_link[p.price] = {
                        sales_at_price: 0,
                        quantity_at_price: 0,
                    }
                }
                price_link[p.price].sales_at_price += p.sales_at_price;
                price_link[p.price].quantity_at_price += p.quantity_at_price;
            }
        }
        arch_build.avg_value = arch_build.avg_value / arch.length;
        Object.keys(price_link).forEach((key) => {
            arch_build.data.push({
                price: key,
                sales_at_price: price_link[key].sales_at_price,
                quantity_at_price: price_link[key].quantity_at_price,
            })
        });
        archive_build.push(arch_build);
    }

    logger.debug(`Found max: ${max_value}, min: ${min_value}, avg: ${avg_value}`);
    if (db_in === undefined) {
        await closeDB(db);
    }

    return {
        min: min_value,
        max: max_value,
        avg: avg_value,
        latest: latest_dl_value,
        price_map: price_data_by_download,
        archives: archive_build,
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

async function archiveAuctions(db_in) {
    const backstep_time_diff = 6.048e+8; // One Week
    //const backstep_time_diff = 1.21e+9; // Two weeks
    const day_diff = 8.64e+7;
    const backstep_time = Date.now() - backstep_time_diff;

    const sql_get_downloaded_oldest = 'SELECT MIN(downloaded) AS oldest FROM auctions';
    const sql_get_distinct_rows_from_downloaded = 'SELECT DISTINCT item_id, bonuses, connected_realm_id FROM auctions WHERE downloaded BETWEEN ? AND ?';
    const sql_delete_archived_auctions = 'DELETE FROM auctions WHERE downloaded BETWEEN ? AND ?';

    const sql_price_map = 'SELECT price, count(price) AS sales_at_price, sum(quantity) AS quantity_at_price FROM auctions WHERE item_id=? AND bonuses=? AND connected_realm_id=? AND downloaded BETWEEN ? AND ? GROUP BY price';
    const sql_min = 'SELECT MIN(price) AS MIN_PRICE FROM auctions WHERE item_id=? AND bonuses=? AND connected_realm_id=? AND downloaded BETWEEN ? AND ?';
    const sql_max = 'SELECT MAX(price) AS MAX_PRICE FROM auctions WHERE item_id=? AND bonuses=? AND connected_realm_id=? AND downloaded BETWEEN ? AND ?';
    const sql_avg = 'SELECT SUM(price*quantity)/SUM(quantity) AS AVG_PRICE FROM auctions WHERE item_id=? AND bonuses=? AND connected_realm_id=? AND downloaded BETWEEN ? AND ?';

    const db = db_in === undefined ? await openDB() : db_in;

    const stmnt_get_distinct_rows_from_downloaded = await dbPrepare(db,sql_get_distinct_rows_from_downloaded);
    const stmnt_price_map = await dbPrepare(db,sql_price_map);
    const stmnt_min = await dbPrepare(db,sql_min);
    const stmnt_max = await dbPrepare(db,sql_max);
    const stmnt_avg = await dbPrepare(db,sql_avg);
    const stmnt_delete_archived_auctions = await dbPrepare(db,sql_delete_archived_auctions);
    const stmnt_insert_auction_archive = await dbPrepare(db,sql_insert_auction_archive);

    await dbRun(db, 'BEGIN TRANSACTION', []);

    let running = true;
    while (running) {
        // Get oldest downloaded
        const current_oldest = (await dbGet(db, sql_get_downloaded_oldest, [])).oldest;
        // Check if oldest fits our criteria
        if (current_oldest < backstep_time) {
            // Pick the whole day
            const start_ticks = current_oldest;
            const end_ticks = current_oldest + day_diff;
            logger.debug(`Scan between ${start_ticks} and ${end_ticks}`);
            // Run for that day
            // Get a list of all distinct item/server combinations
            const items = await statementAll(stmnt_get_distinct_rows_from_downloaded, [start_ticks, end_ticks]);
            for (const item of items) {
                const vals = [item.item_id, item.bonuses, item.connected_realm_id, start_ticks, end_ticks];

                // Run the getAuctions command for the combo
                const summary = {};
                summary.data = await statementAll(stmnt_price_map, vals);
                summary.min_value = (await statementGet(stmnt_min, vals)).MIN_PRICE;
                summary.max_value = (await statementGet(stmnt_max, vals)).MAX_PRICE;
                summary.avg_value = (await statementGet(stmnt_avg, vals)).AVG_PRICE;

                const quantity = summary.data.reduce((acc, cur) => {
                    return acc + cur.quantity_at_price;
                }, 0);

                // Add the archive
                await statementRun(stmnt_insert_auction_archive, [item.item_id, quantity, JSON.stringify(summary), start_ticks, item.connected_realm_id, item.bonuses]);
            }
            // Delete the archived data
            await statementRun(stmnt_delete_archived_auctions, [start_ticks, end_ticks]);
            // Done
        } else {
            running = false;
        }
    }

     stmnt_get_distinct_rows_from_downloaded.finalize();
     stmnt_price_map.finalize();
     stmnt_min.finalize();
     stmnt_max.finalize();
     stmnt_avg.finalize();
     stmnt_delete_archived_auctions.finalize();
     stmnt_insert_auction_archive.finalize();

    await dbRun(db, 'COMMIT TRANSACTION', []);
    if (db_in === undefined) {
        await closeDB(db);
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

export { scanRealms, addRealmToScanList, removeRealmFromScanList, getAuctions, getAllBonuses, archiveAuctions, openDB, closeDB };
