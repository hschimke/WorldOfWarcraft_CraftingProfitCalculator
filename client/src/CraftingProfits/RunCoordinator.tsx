import { useState, useReducer } from 'react';
import { RunForm } from './RunForm';
import { useFetchCPCApi, UseFetchApiState } from '../Shared/ApiClient';
import RunResultDisplay from './RunResultDisplay';
import { all_professions, CraftingProfitsDispatch, CharacterProfessionList, validateAndCleanProfessions } from './Shared';
import './RunCoordinator.css';

export interface RunCoordinatorFormDataReducerState {
    item: string,
    addon_data: string,
    required: string|number,
    region: string,
    realm: string,
    professions: CharacterProfessionList
}

export interface RunCoordinatorFormDataReducerAction {
    field: string,
    value: string,
    professions: CharacterProfessionList
}

export interface RunCoordinatorProps{}

const formDataReducer = (state: RunCoordinatorFormDataReducerState, action: RunCoordinatorFormDataReducerAction) : RunCoordinatorFormDataReducerState => {
    switch (action.field) {
        case 'item':
            return { ...state, item: action.value };
        case 'addon_data':
            return { ...state, addon_data: action.value };
        case 'required':
            return { ...state, required: action.value };
        case 'region':
            return { ...state, region: action.value };
        case 'realm':
            return { ...state, realm: action.value };
        case 'professions':
            const cleaned_prof = validateAndCleanProfessions(action.value);
            console.log(cleaned_prof);
            if (cleaned_prof !== undefined && !Array.isArray(cleaned_prof)) {
                const index = state.professions.indexOf(cleaned_prof);
                const new_profs = state.professions.slice();
                if (index > -1) {
                    new_profs.splice(index, 1);
                } else {
                    new_profs.push(cleaned_prof);
                }
                return { ...state, professions: new_profs };
            } else {
                return { ...state };
            }
        default:
            throw new Error();
    }
}

function RunCoordinator(props:RunCoordinatorProps) {
    const [apiState, setPayload] = useFetchCPCApi();
    const [formData, dispatchFormUpdate] = useReducer(formDataReducer, {
        item: 'Grim-Veiled Bracers',
        addon_data: '',
        required: 1,
        region: 'US',
        realm: 'Hyjal',
        professions: all_professions.slice(),
    });
    const enable_run_button = !apiState.isLoading;
    const output_display = apiState.isLoading ? `Analyzing ${formData.item}` : 'ready';
    const raw_data = apiState.data;

    const [show_raw_results, updateShowRawResults] = useState(false);
    const [run_type, updateRunType] = useState('advanced');

    const handleSubmit : React.FormEventHandler = (event) => {
        event.preventDefault();

        const run_data = {
            type: run_type === 'advanced' ? 'custom' : 'json',
            item_id: formData.item,
            addon_data: formData.addon_data,
            count: formData.required,
            region: formData.region,
            server: formData.realm,
            professions: JSON.stringify(formData.professions),
        };
        setPayload(run_data);
    };

    const pickForm : React.ChangeEventHandler<HTMLSelectElement | HTMLInputElement>= (e) => {
        switch (e.target.name) {
            case 'formType':
                updateRunType(e.target.value);
                break;
            case 'includeRaw':
                updateShowRawResults(!show_raw_results);
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
                        <input type="checkbox" name="includeRaw" checked={show_raw_results} onChange={pickForm} />
                </label>
            </form>
            <div>
                <CraftingProfitsDispatch.Provider value={dispatchFormUpdate}>
                    <RunForm handleSubmit={handleSubmit}
                        form_type={run_type}
                        item={formData.item}
                        addon_data={formData.addon_data}
                        required={formData.required}
                        region={formData.region}
                        realm={formData.realm}
                        professions={formData.professions}
                        allProfessions={all_professions}
                        button_enabled={enable_run_button} />
                </CraftingProfitsDispatch.Provider>
            </div>
            <div>
                <RunResultDisplay raw_run={raw_data} status={output_display} show_raw_result={show_raw_results} />
            </div>
        </div>
    );
}

export default RunCoordinator;