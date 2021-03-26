import { scanRealms, archiveAuctions, addRealmToScanList, fillNItems } from './auction-history.js';
import { parentLogger } from './logging.js';

const logger = parentLogger.child();

const server_mode = process.env.STANDALONE_CONTAINER === undefined ? 'normal' : process.env.STANDALONE_CONTAINER;

let standalone_container_abc = undefined;

//await addRealmToScanList('hyjal','us');

async function job() {
    logger.info('Starting hourly injest job.');
    //const run_list = [];

    await scanRealms();

    if ((new Date()).getHours() === 0) {
        logger.info('Performing daily archive.');
        await archiveAuctions();
    }

    await fillNItems();

    //await Promise.all(run_list);
    logger.info('Finished hourly injest job.');
}

switch (server_mode) {
    case 'hourly':
        logger.info('Started in default mode. Running job and exiting.');
        await job();
        break;
    case 'standalone':
        logger.info('Started in standalone container mode. Scheduling hourly job.');
        standalone_container_abc = setInterval(job, 3.6e+6);
        standalone_container_abc.unref();
        break;
    case 'normal':
    default:
        logger.info('Started in normal mode taking no action.');
        break;
}