import got from 'got';
import { parentLogger } from './logging.mjs';
import events from 'events';

const logger = parentLogger.child();

const allowed_connections_per_period = 100;
const period_reset_window = 1500;

let allowed_during_period = 0;
let check_count = 0;

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

class BlizzardTimeoutManager extends events { }
const emitter = new BlizzardTimeoutManager();
function exec_reset() {
    check_count += period_reset_window;
    if (emitter.run) {
        if (check_count >= period_reset_window) {
            check_count = 0;
            emitter.emit('reset');
        }
        setTimeout(exec_reset, 1000);
    }
}

function shutdownApiManager() {
    emitter.emit('shutdown');
}

async function manageBlizzardTimeout() {
    emitter.on('reset', () => {
        //logger.debug(`Resetting connection pool: used ${currently_running} of available ${allowed_connections_per_period}`);
        allowed_during_period = 0;
    });
    emitter.on('shutdown', () => {
        emitter.run = false;
    });
    emitter.run = true;
    setTimeout(exec_reset, 1000);
}

const base_uri = 'api.blizzard.com';
/**
 * Run a query against the blizzard api provider.
 * @param {!string} region_code The region code for the server.
 * @param {!Object} authorization_token An oath access token to use for the request.
 * @param {Object} data The request data to send.
 * @param {!string} uri The url to query against.
 */
async function getBlizzardAPIResponse(region_code, authorization_token, data, uri) {
    let proceed = false;
    let wait_count = 0;
    while (!proceed) {
        if (allowed_during_period > allowed_connections_per_period) {
            wait_count++;
            await sleep(1000);
        } else {
            proceed = true;
            allowed_during_period++;
        }
    }
    if (wait_count > 0) {
        logger.debug(`Waited ${wait_count} seconds for an available API window.`);
    }
    try {
        const api_response = await got(`https://${region_code}.${base_uri}${uri}`, {
            reponseType: 'json',
            method: 'GET',
            headers: {
                'Connection': 'keep-alive',
                'Authorization': `Bearer ${authorization_token.access_token}`
            },
            searchParams: data
        }).json();
        //currently_running--;
        return api_response;
    } catch (error) {
        logger.error('Issue fetching blizzard data: (' + `https://${region_code}.${base_uri}${uri}` + ') ' + error);
    }
}

manageBlizzardTimeout();

export { getBlizzardAPIResponse, shutdownApiManager };