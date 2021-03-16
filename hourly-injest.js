import { scanRealms, archiveAuctions } from './auction-history.js';

await scanRealms();
await archiveAuctions();