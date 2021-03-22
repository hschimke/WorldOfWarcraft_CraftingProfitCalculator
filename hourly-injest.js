import { scanRealms, archiveAuctions } from './auction-history.js';

await scanRealms();

//if ((new Date()).getHours() === 0) {
    await archiveAuctions();
//}