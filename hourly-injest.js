import { scanRealms, archiveAuctions, openDB, closeDB } from './auction-history.js';

const db = await openDB();

await    scanRealms(db);
 await   archiveAuctions(db);

/*
await Promise.all([
    scanRealms(db),
    archiveAuctions(db)
]);*/
await closeDB(db);