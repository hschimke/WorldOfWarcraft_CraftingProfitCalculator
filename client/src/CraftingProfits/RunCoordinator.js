import { useState } from 'react';
import { AdvancedRunFrom, SimpleRunFrom } from './RunForm.js';
import { apiRunCall } from '../Shared/ApiClient.js';
import RunResultDisplay from './RunResultDisplay.js';
import './RunCoordinator.css';

function RunCoordinator(props) {
    const [item, updateItem] = useState('Grim-Veiled Bracers');
    const [addon_data, updateAddonData] = useState('');
    const [required, updateRequired] = useState(1);
    const [region, updateRegion] = useState('US');
    const [realm, updateRealm] = useState('Hyjal');

    const all_professions = ['Jewelcrafting', 'Tailoring', 'Alchemy', 'Herbalism', 'Inscription', 'Enchanting', 'Blacksmithing', 'Mining', 'Engineering', 'Leatherworking', 'Skinning', 'Cooking'];
    const [professions, updateProfessions] = useState(all_professions.slice());
    const [enable_run_button, updateRunButtonEnabled] = useState(true);
    const [output_display, updateOutputDisplay] = useState('empty');
    const [show_raw_results, updateShowRawResults] = useState(false);
    const [raw_data, updateRawData] = useState();
    const [run_type, updateRunType] = useState('advanced');

    const handleInputChange = (event) => {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        switch (name) {
            case 'item':
                updateItem(value);
                break;
            case 'addon_data':
                updateAddonData(value);
                break;
            case 'required':
                updateRequired(value);
                break;
            case 'region':
                updateRegion(value);
                break;
            case 'realm':
                updateRealm(value);
                break;
            default:
                break;
        }
    };

    const handleCheckbox = (event) => {
        const target = event.target;
        const name = target.name;

        const index = professions.indexOf(name);
        const new_profs = professions.slice();
        if (index > -1) {
            new_profs.splice(index, 1);
        } else {
            new_profs.push(name);
        }
        updateProfessions(new_profs);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        // Disable the run button
        updateRunButtonEnabled(false);
        updateOutputDisplay(`Analyzing ${item}`);

        const run_data = {
            type: run_type === 'advanced' ? 'custom' : 'json',
            item_id: item,
            addon_data: addon_data,
            count: required,
            region: region,
            server: realm,
            professions: JSON.stringify(professions),
        };
        apiRunCall(run_data, handleApiRun);
        // Re-enable when done
    };

    const handleApiRun = (data) => {
        updateOutputDisplay('ready');
        updateRawData(data);
        updateRunButtonEnabled(true);
    };

    const pickForm = (e) => {
        switch (e.target.name) {
            case 'formType':
                updateRunType(e.target.value);
                break;
            case 'includeRaw':
                updateShowRawResults(e.target.checked);
                break;
            default:
                break;
        }
    };

    return (
        <div className="RunCoordinator">
            <form className="TypePicker">
                <label>
                    Run Type:
                        <select onChange={pickForm} value={run_type} name="formType">
                        <option value="advanced">Advanced</option>
                        <option value="simple">Simple</option>
                    </select>
                </label>
                <label>
                    Include Raw Output:
                        <input type="checkbox" name="includeRaw" value={show_raw_results} onChange={pickForm} />
                </label>
            </form>
            <div>
                {(run_type === 'advanced') &&
                    <AdvancedRunFrom
                        handleInputChange={handleInputChange} handleSubmit={handleSubmit} handleCheckbox={handleCheckbox}
                        item={item}
                        addon_data={addon_data}
                        required={required}
                        region={region}
                        realm={realm}
                        professions={professions}
                        allProfessions={all_professions}
                        button_enabled={enable_run_button} />
                }
                {run_type === 'simple' &&
                    <SimpleRunFrom handleInputChange={handleInputChange} handleSubmit={handleSubmit}
                        item={item}
                        addon_data={addon_data}
                        required={required}
                        button_enabled={enable_run_button} />
                }
            </div>
            <div>
                <RunResultDisplay raw_run={raw_data} status={output_display} show_raw_result={show_raw_results} />
            </div>
        </div>
    );
}

export default RunCoordinator;