import got from 'got';
import { readFile } from 'fs/promises';
import { parentLogger } from './logging.mjs';

const logger = parentLogger.child();

const secrets = JSON.parse(await readFile(new URL('./secrets.json', import.meta.url)));
const clientID = '9d85a3dfca994efa969df07bd1e47695';
const clientSecret = secrets.keys.client_secret;

const authorization_uri = 'https://us.battle.net/oauth/token';
const clientAccessToken = {
    access_token: '',
    token_type: '',
    expires_in: 0,
    scope: '',
    fetched: Date.now(),
    checkExpired: function () {
        let expired = true;
        const current_time = Date.now();
        const expire_time = this.fetched + (this.expires_in * 1000);
        if (current_time < expire_time) {
            expired = false;
        }
        return expired;
    },
};

/**
 * Get an oath token from blizzard, or use one we already have.
 */
async function getAuthorizationToken() {
    if (clientAccessToken.checkExpired()) {
        logger.debug('Access token expired, fetching fresh.');
        try {
            const auth_response = await got(authorization_uri, {
                responseType: 'json',
                method: 'POST',
                username: clientID,
                password: clientSecret,
                headers: {
                    'Connection': 'keep-alive'
                },
                form: {
                    'grant_type': 'client_credentials',
                }
            });
            clientAccessToken.access_token = auth_response.body.access_token;
            clientAccessToken.token_type = auth_response.body.token_type;
            clientAccessToken.expires_in = auth_response.body.expires_in;
            clientAccessToken.scope = auth_response.body.scope;
            clientAccessToken.fetched = Date.now();
        } catch (error) {
            logger.error("An error was encountered while retrieving an authorization token: " + error);
        }
    }
    return clientAccessToken;
}

export { getAuthorizationToken };