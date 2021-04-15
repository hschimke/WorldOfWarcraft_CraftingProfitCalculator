function validateProfessions(profession_list: Array<string>): Array<CharacterProfession> {
    const return_array: Array<CharacterProfession> = [];

    for (const element of profession_list) {
        switch (element) {
            case 'Jewelcrafting':
            case 'Tailoring':
            case 'Alchemy':
            case 'Herbalism':
            case 'Inscription':
            case 'Enchanting':
            case 'Blacksmithing':
            case 'Mining':
            case 'Engineering':
            case 'Leatherworking':
            case 'Skinning':
            case 'Cooking':
                return_array.push(element);
        }
    }

    return return_array;
}

export { validateProfessions };