import { scanRealms, archiveAuctions, addRealmToScanList } from './auction-history.js';

//await addRealmToScanList('hyjal','us');

await scanRealms();

if ((new Date()).getHours() === 0) {
    await archiveAuctions();
}