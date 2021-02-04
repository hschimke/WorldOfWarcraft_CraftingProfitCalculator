import React from 'react';
import './RunForm.css';

class SimpleRunFrom extends React.Component {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(e) {
        this.props.handleInputChange(e);
    }

    handleSubmit(e) {
        this.props.handleSubmit(e);
    }

    render() {
        return (
            <form onSubmit={this.handleSubmit} className="RunForm">
                <label>Item:
                    <input type="text" name="item" value={this.props.item} onChange={this.handleChange} />
                </label>
                <label>Required Count:
                    <input type="text" name="required" value={this.props.required} onChange={this.handleChange} />
                </label>
                <label>Addon Data
                    <textarea name="addon_data" rows="20" cols="100" value={this.props.addon_data} onChange={this.handleChange} />
                </label>
                <button type="submit" disabled={!this.props.button_enabled} value="Run">Run</button>
            </form >
        );
    }
}

class AdvancedRunFrom extends React.Component {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleCheckbox = this.handleCheckbox.bind(this);
    }

    handleChange(e) {
        this.props.handleInputChange(e);
    }

    handleSubmit(e) {
        this.props.handleSubmit(e);
    }

    handleCheckbox(e) {
        this.props.handleCheckbox(e);
    }

    render() {
        const profession_list = this.props.allProfessions;
        return (
            <form onSubmit={this.handleSubmit} className="RunForm">
                <label>Item:
                    <input type="text" name="item" value={this.props.item} onChange={this.handleChange} />
                </label>
                <label>Region:
                    <input type="text" name="region" value={this.props.region} onChange={this.handleChange} />
                </label>
                <label>Server:
                    <input type="text" name="realm" value={this.props.realm} onChange={this.handleChange} />
                </label>
                <label>Required Count:
                    <input type="text" name="required" value={this.props.required} onChange={this.handleChange} />
                </label>
                <fieldset className="Professions">
                    <span>Professions:</span>
                    {profession_list.map(item => {
                        return (
                            <label>
                                {item}:
                                <input type="checkbox" name={item} key={`${item}key`} checked={!!this.props.professions.includes(item)} onChange={this.handleCheckbox} />
                            </label>
                        );
                    })}
                </fieldset>
                <label>Addon Data
                    <textarea name="addon_data" rows="20" cols="100" value={this.props.addon_data} onChange={this.handleChange} />
                </label>
                <button type="submit" disabled={!this.props.button_enabled} value="Run">Run</button>
            </form >
        );
    }
}

export { SimpleRunFrom, AdvancedRunFrom };