import { scanRealms, archiveAuctions, openDB, closeDB } from './auction-history.js';

const db = await openDB();

await scanRealms(db);

if ((new Date()).getHours() === 0) {
    await archiveAuctions(db);
}

await closeDB(db);