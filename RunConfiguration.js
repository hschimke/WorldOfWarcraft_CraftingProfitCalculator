'use strict';
class RunConfiguration {
    #internal_inventory = {};
    #inventory_overlay = {};
    #professions = [];
    #realm_name
    #realm_region
    #item_id
    #item_count

    constructor(raw_configuration_data, item, count) {
        if (raw_configuration_data != undefined) {
            for (let item of raw_configuration_data.inventory) {
                this.#inventory_overlay[item.id] = item.quantity;
            }
            for(let prof of raw_configuration_data.professions){
                this.#professions.push(prof);
            }
            this.#realm_name = raw_configuration_data.realm.realm_name;
            this.#realm_region = raw_configuration_data.realm.region_name;
        }
        this.#item_id = item;
        this.#item_count = count;
    }
    get realm_name() {
        return this.#realm_name;
    }
    get realm_region() {
        return this.#realm_region;
    }
    get professions() {
        return this.#professions;
    }
    get item_id() {
        return this.#item_id;
    }
    get item_count() {
        return this.#item_count;
    }
    itemInInventory(item_id) {
        return item_id in this.#internal_inventory;
    }
    itemCount(item_id) {
        const is_in_inventory = this.itemInInventory(item_id);
        const has_overlay = item_id in this.#inventory_overlay;
        let available = 0;
        available += is_in_inventory ? this.#internal_inventory[item_id] : 0;
        available += has_overlay ? this.#inventory_overlay[item_id] : 0;

        return available;
    }
    adjustInventory(item_id, adjustment_delta) {
        if (!(item_id in this.#inventory_overlay)) {
            this.#inventory_overlay[item_id] = 0;
        }
        this.#inventory_overlay[item_id] += adjustment_delta;
    }
}
exports.RunConfiguration = RunConfiguration;
