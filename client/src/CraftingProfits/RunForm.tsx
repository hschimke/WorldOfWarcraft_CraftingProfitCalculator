import './RunForm.css';
import { CraftingProfitsDispatch } from './Shared';
import { useContext } from 'react';
import { RegionSelector } from '../Shared/RegionSelector';

function RunForm(props) {
    switch (props.form_type) {
        case 'advanced':
            return <AdvancedRunFrom {...props} />
        case 'simple':
            return <SimpleRunFrom {...props} />
        default:
            throw new Error();
    }
}

function SimpleRunFrom(props) {
    const dispatch = useContext(CraftingProfitsDispatch);

    const handleInputChange = (event) => {
        dispatch({ field: event.target.name, value: event.target.value });
    };
    return (
        <form onSubmit={props.handleSubmit} className="RunForm">
            <label>Item:
                    <input type="text" name="item" value={props.item} onChange={handleInputChange} />
            </label>
            <label>Required Count:
                    <input type="text" name="required" value={props.required} onChange={handleInputChange} />
            </label>
            <label>Addon Data
                    <textarea name="addon_data" rows="5" cols="100" value={props.addon_data} onChange={handleInputChange} />
            </label>
            <button type="submit" disabled={!props.button_enabled} value="Run">Run</button>
        </form >
    );
}

function AdvancedRunFrom(props) {
    const profession_list = props.allProfessions;
    const dispatch = useContext(CraftingProfitsDispatch);

    const handleInputChange = (event) => {
        dispatch({ field: event.target.name, value: event.target.value });
    };

    const handleCheckbox = (event) => {
        dispatch({ field: 'professions', value: event.target.name });
    };
    return (
        <form onSubmit={props.handleSubmit} className="RunForm">
            <label>Item:
                    <input type="text" name="item" value={props.item} onChange={handleInputChange} />
            </label>
            <RegionSelector selected_region={props.region} onChange={handleInputChange} />
            <label>Server:
                    <input type="text" name="realm" value={props.realm} onChange={handleInputChange} />
            </label>
            <label>Required Count:
                    <input type="text" name="required" value={props.required} onChange={handleInputChange} />
            </label>
            <fieldset className="Professions">
                <span>Professions:</span>
                {profession_list.map(item => {
                    return (
                        <label key={`${item}key`}>
                            {item}:
                            <input type="checkbox" name={item} checked={!!props.professions.includes(item)} onChange={handleCheckbox} />
                        </label>
                    );
                })}
            </fieldset>
            <label>Addon Data
                    <textarea name="addon_data" rows="5" cols="100" value={props.addon_data} onChange={handleInputChange} />
            </label>
            <button type="submit" disabled={!props.button_enabled} value="Run">Run</button>
        </form >
    );
}

export { SimpleRunFrom, AdvancedRunFrom, RunForm };