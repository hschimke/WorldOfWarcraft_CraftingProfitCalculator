import winston from 'winston';

const lowest_level_to_report = (process.env.LOG_LEVEL !== undefined) ? process.env.LOG_LEVEL : 'info';

const parentLogger = winston.createLogger({
    level: lowest_level_to_report,
    format: winston.format.json(),
    //defaultMeta: { service: 'user-service' },
    transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        //new winston.transports.File({ filename: 'error.log', level: 'error' }),
        //new winston.transports.File({ filename: 'combined.log' }),
    ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
    parentLogger.add(new winston.transports.Console({
        format: winston.format.simple(),
        level: lowest_level_to_report,
    }));
}

if (process.env.DOCKERIZED === 'true') {
    parentLogger.add(new winston.transports.Console({
        format: winston.format.simple(),
        level: lowest_level_to_report,
    }));
}

export { parentLogger };
