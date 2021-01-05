class Inventory {
    #internal_inventory = {};
    #inventory_overlay = {};

    /*
     Expected input is:
     { "inventory": [
         {
             "id": id,
             "quantity": count
         }
     ] }
    */
    constructor(raw_inventory_data) {
        if (raw_inventory_data != undefined) {
            for (let item of raw_inventory_data.inventory) {
                this.#inventory_overlay[item.id] = item.quantity;
            }
        }
    }
    itemInInventory(item_id) {
        return this.#internal_inventory.hasOwnProperty(item_id);
    }
    itemCount(item_id) {
        const is_in_inventory = this.itemInInventory(item_id);
        const has_overlay = this.#inventory_overlay.hasOwnProperty(item_id);
        let available = 0;
        available += is_in_inventory ? this.#internal_inventory[item_id] : 0;
        available += has_overlay ? this.#inventory_overlay[item_id] : 0;

        return available;
    }
    adjustInventory(item_id, adjustment_delta) {
        if (!this.#inventory_overlay.hasOwnProperty(item_id)) {
            this.#inventory_overlay[item_id] = 0;
        }
        this.#inventory_overlay[item_id] += adjustment_delta;
    }
}
exports.Inventory = Inventory;
