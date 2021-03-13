import './RunForm.css';

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
            <label>Region:
                    <input type="text" name="region" value={props.region} onChange={props.handleInputChange} />
            </label>
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

export { SimpleRunFrom, AdvancedRunFrom };