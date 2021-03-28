# WorldOfWarcraft_CraftingProfitCalculator
An application to determine the profitability of a crafted item on a given realms public auction house. Given a set of professions, an item, a region, and a realm the program can determine whether the item can be crafted by the given set of professions and if so, what reagents are required. Reagents are decomposed if they are craftable themselves. At each step the cost of the reagents to purchase is calculated versus crafting them as well. At the end of the calculation a shopping list will be created with base items needed to craft the required item. Optionally, a full inventory list for multiple or single characters can be included and will be used when constructiong the shopping list.

## Installation
To install the program clone the repository, install dependencies, and acquire a battle.net api token.

    git clone https://github.com/hschimke/WorldOfWarcraft_CraftingProfitCalculator
    cd WorldOfWarcraft_CraftingProfitCalculator
    npm install
    cd client
    npm install

The battle.net Client ID and Client Secret must be placed in the environment for the application. The two required environment variables are `CLIENT_ID` and `CLIENT_SECRET`.

An installation script is available in scripts. This requires root access and a SystemD based operating system. Once installed the program will run on port 8080 (by default). `CLIENT_ID` and `CLIENT_SECRET` are still required in the environment. This does not install a historical auctions scan list, which must be done separately.

### Priming the Cache
The application relies on caching large amounts of information from Blizzard. The initial run of the application will take a long time for this reason. Once installation is complete the cache can be primed with `npm run fill-cache`. This fills the cache by performing a very simple run using the basic (and uncraftable) item Simple Wood.

### Installing the World of Warcraft AddOn
To use the inventory for a character (or set of characters) when computing the shopping list, the option AddOn must be installed and used to generate json data. The AddOn can be found in the `wow-addon` folder in the root of the repository. Copy the folder `CraftingProfitCalculator_data` in that directory to the `AddOns` folder in your World of Warcraft installation.

#### Using the AddOn
The AddOn provides three slash commands within World of Warcraft.
* `/cpcr`: To run the inventory scan in the background. This should be done for each character.
* `/cpcc`: Runs an inventory scan and outputs the json data for the currently logged in character.
* `/cpca`: RUns an inventory scan and outputs the json data for all scanned characters.

Once the json data is collected, it can be coppied into the web page provided by the server or into an option in the CLI program. JSON data is only refreshed when one of the above commands is written, so if a character has changed the contents of their inventory since the last run it will not be reflected.

The AddOn also collection region, realm, and profession data for all scanned characters. This can be used for running the program without specifying all of the parameters directly, instead infering them from the provided AddOn output.

#### Using the AddOn with Reagent Bank and Main Bank
In order to include the contents of a character's bank and reagent bank the above slash commands must be run while the character's bank is open.

## Browser
To launch the server version of the program run `npm run client-server`. The default port is 3000, so the server can be connected to with http://localhost:3000. The server can be terminted by pressing `Ctrl-C` in the terminal window where it is running. In order to use the client you must run `npm run build` in the client directory and then `mv ./build ../html` to copy the build output to the server directory. This is not required if using the installation script mentioned above, as the step is handled separately.

## JSON Endpoint
To get the JSON version of the profit calculation and shopping list, send a post command to `http://localhost:3000/json_output`. The post must contain, at a minimum: a payload containg the item name or id as `item_id`, the number requested as `needed`, a json config json file as `addon_data`, and a run type of `type` set to `json`. Optionally, more detailed custom runs can be performed by setting `type` to `custom` and including: `professions` for a JSON formatted array of professions, `server`, and `region`. The `custom` type corresponds to the CLI default behaviour and ignores the professions and server data set int he AddOn payload.

## Command Line
THe command line program can be run using `npm run cli -- ` followed by the available options. Running the program without any options will search for a Spectral Flask of Power, using all available professions, on the US realm Hyjal.

### Command Line Options
* `--item`: Either the name of the item to search for or its item id.
* `--region`: The region in which the server is located. The default is US.
* `--server`: The realm whos auction house will be used for profit calculations.
* `--count`: The number of items to be crafted. The default is 1.
* `--profession`: A single profession to check. This item can be repeated multiple times, each additional inclusion adds a profession. The default is all professions.
* `--json_data`: Output from the WoW AddOn containing inventory and profession data from a character or set of characters.
* `--json`: Use the provided AddOn output to populate all other options. If this is specified then the input from `--item`, `--region`, `--server` and all `--profession` entries will be ingored and the values contained in the AddOn output will be used instead.

### Command Line Output
The CLI output creates three files.
* `formatted_output` Containes the user friendly version of the profit calculation and shopping list.
* `intermediate_output.json` Contains the JSON version of the profit calculation and shopping list and could be used by other applications.
* `raw_output.json` Contains the raw data generated by the application and is likely not useful to anyone.

All files are overwritten on subsequent runs of the program.

## Docker
Instead of installing the program directly to a host, the server version can be run from a docker container. Building the container using the provided Dockerfile is left to the user.

### Required Environment Variables
The docker image relies on having numerous environment variables set for the container, this can be accomplished with the `--env` option to `docker run`. The required variables are as follows:
* `CLIENT_ID`
* `CLIENT_SECRET`

For more advanced configuration the following variables can be set:
* `DATABASE_TYPE` The database type to use. Options are `pg` and `sqlite3`. The default is `sqlite3`.
* `PGUSER` Database username, no default.
* `PGHOST` Database host, 'localhost' is default.
* `PGPASSWORD` Database password, no default.
* `PGDATABASE` Database name, no default.
* `STANDALONE_CONTAINER` Control the behaviour of the auction scraper. Options are `normal`, `hourly`, and `standalone`. The
default is `standalone`.
  * `normal` Don't schedule the ingestion, that is handled elsewhere.
  * `hourly` Scan the AH and related tasks and exit.
  * `standalone` Start the server and schedule an internal job to scrape the auction house.

If running in a production environment then the following additional configuration options should be set:
* `LOG_LEVEL=info`
* `NODE_ENV=production`

### Volumes
The sqlite3 database option looks for database files in a volume mounted at `/usr/src/wow_cpc/databases`. While the volume is created for postgresql databases, it is not used.

### Considerations if Running Multiple Instances
If using a shared database (postgresql is recomended in this situation), and running multiple copies of the image, it is highly
recomended that only one of the instances be launched with the `STANDALONE_CONTAINER=standalone` option. Only one instance should scan the auction house for each database. All other nodes besides the scanning node should be launched with `STANDALONE_CONTAINER=normal`.