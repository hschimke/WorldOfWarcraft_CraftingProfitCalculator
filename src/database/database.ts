import { Logger } from 'winston';
import { CPC_PG_DB } from './postgres-db.js';
import { CPC_SQLITE3_DB } from './sqlite3-db.js';

function CPCDb(config: DatabaseConfig, logging: Logger): CPCDB {
    const db_type = config.type;

    const logger = logging;

    /*
    import winston from 'winston';
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
        level: 'silly',
    }));*/

    logger.info(`Using ${db_type} database methods.`);

    switch (db_type) {
        case 'pg':
            return CPC_PG_DB(config, logger);
        case 'sqlite3':
            return CPC_SQLITE3_DB(config, logger);
    }
    throw new Error(`UNDEFINED DATABASE TYPE: ${db_type}`);
}

export { CPCDb };
