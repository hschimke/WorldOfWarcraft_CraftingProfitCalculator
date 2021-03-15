import './RunForm.css';
import { CraftingProfitsDispatch } from './Shared.js';
import { useContext } from 'react';
import { RegionSelector } from '../Shared/RegionSelector.js';

function RunForm(props) {
    const dispatch = useContext(CraftingProfitsDispatch);

    const handleInputChange = (event) => {
        dispatch({ field: event.target.name, value: event.target.value });
    };

    const handleCheckbox = (event) => {
        dispatch({ field: 'professions', value: event.target.name });
    };

    switch (props.form_type) {
        case 'advanced':
            return <AdvancedRunFrom {...props} handleInputChange={handleInputChange} handleCheckbox={handleCheckbox} />
        case 'simple':
            return <SimpleRunFrom {...props} handleInputChange={handleInputChange} />
        default:
            throw new Error();
    }
}

function SimpleRunFrom(props) {
    return (
        <form onSubmit={props.handleSubmit} className="RunForm">
            <label>Item:
                    <input type="text" name="item" value={props.item} onChange={props.handleInputChange} />
            </label>
            <label>Required Count:
                    <input type="text" name="required" value={props.required} onChange={props.handleInputChange} />
            </label>
            <label>Addon Data
                    <textarea name="addon_data" rows="5" cols="100" value={props.addon_data} onChange={props.handleInputChange} />
            </label>
            <button type="submit" disabled={!props.button_enabled} value="Run">Run</button>
        </form >
    );
}

function AdvancedRunFrom(props) {
    const profession_list = props.allProfessions;
    return (
        <form onSubmit={props.handleSubmit} className="RunForm">
            <label>Item:
                    <input type="text" name="item" value={props.item} onChange={props.handleInputChange} />
            </label>
            <RegionSelector selected_region={props.region} onChange={props.handleInputChange} />
            <label>Server:
                    <input type="text" name="realm" value={props.realm} onChange={props.handleInputChange} />
            </label>
            <label>Required Count:
                    <input type="text" name="required" value={props.required} onChange={props.handleInputChange} />
            </label>
            <fieldset className="Professions">
                <span>Professions:</span>
                {profession_list.map(item => {
                    return (
                        <label key={`${item}key`}>
                            {item}:
                            <input type="checkbox" name={item} checked={!!props.professions.includes(item)} onChange={props.handleCheckbox} />
                        </label>
                    );
                })}
            </fieldset>
            <label>Addon Data
                    <textarea name="addon_data" rows="5" cols="100" value={props.addon_data} onChange={props.handleInputChange} />
            </label>
            <button type="submit" disabled={!props.button_enabled} value="Run">Run</button>
        </form >
    );
}

export { SimpleRunFrom, AdvancedRunFrom, RunForm };