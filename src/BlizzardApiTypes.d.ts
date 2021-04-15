declare namespace BlizzardApi {
    interface ItemSearch {
        pageCount: number,
        page: number,
        results: Array<{
            data: {
                name: Record<string, string>,
                id: ItemID
            }
        }>
    }

    interface ConnectedRealmIndex {
        connected_realms: Array<{
            href: string
        }>
    }

    interface ConnectedRealm {
        id: ConnectedRealmID,
        realms: Array<{
            name: string
        }>
    }

    interface Item {
        id: ItemID,
        name: ItemName,
        description: string,
        purchase_price: number,
        purchase_quantity: number,
        level: number
    }

    interface ProfessionsIndex {
        professions: Array<{
            name: string,
            id: number
        }>
    }

    interface Profession {
        skill_tiers: Array<{
            name: string,
            id: number,

        }>,
        name: string,
        id: number
    }

    interface ProfessionSkillTier {
        categories: Array<{
            recipes: Array<{
                id: number,
                name: string
            }>,
            name: string
        }>
    }

    interface Recipe {
        id: number,
        name: string,
        alliance_crafted_item: {
            id: number
        },
        horde_crafted_item: {
            id: number
        },
        crafted_item: {
            id: number
        },
        reagents: Array<{
            reagent: {
                id: number
            },
            quantity: number
        }>,
        crafted_quantity: {
            minimum?: number,
            maximum?: number,
            value?: number
        }
    }

    interface Auctions {
        auctions: Array<{
            item: {
                id: ItemID,
                bonus_lists: Array<number>,
            }
            quantity: number,
            buyout: number,
            unit_price: number
        }>
    }

    type BlizzardApiReponse = ItemSearch | ConnectedRealmIndex | Item | ProfessionsIndex | Profession | ConnectedRealm | ProfessionSkillTier | Recipe | Auctions;
}