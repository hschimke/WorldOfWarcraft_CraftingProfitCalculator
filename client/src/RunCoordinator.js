import React from 'react';
import { AdvancedRunFrom, SimpleRunFrom } from './RunForm.js';
import { apiRunCall } from './ApiClient.js';
import RunResultDisplay from './RunResultDisplay.js';
import './RunCoordinator.css';

class RunCoordinator extends React.Component {
    constructor(props) {
        super(props);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.pickForm = this.pickForm.bind(this);
        this.handleCheckbox = this.handleCheckbox.bind(this);
        this.handleApiRun = this.handleApiRun.bind(this);

        const all_professions = ['Jewelcrafting', 'Tailoring', 'Alchemy', 'Herbalism', 'Inscription', 'Enchanting', 'Blacksmithing', 'Mining', 'Engineering', 'Leatherworking', 'Skinning', 'Cooking'];
        this.state = {
            run_type: 'simple',
            item: 'Grim-Veiled Bracers',
            addon_data: '',
            required: 1,
            region: 'US',
            realm: 'Hyjal',
            professions: all_professions.slice(),
            all_professions: all_professions.slice(),
            enabled_run_button: true,
            output_display: 'empty',
        };
    }

    handleInputChange(event) {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        this.setState({
            [name]: value
        });
    }

    handleSubmit(event) {
        event.preventDefault();
        // Disable the run button
        this.setState({ enabled_run_button: false });
        this.setState({output_display:`Analyzing ${this.state.item}`});
        const run_data = {
            type: this.state.run_type === 'advanced' ? 'custom' : 'json',
            item_id: this.state.item,
            addon_data: this.state.addon_data,
            count: this.state.required,
            region: this.state.region,
            server: this.state.realm,
            professions: JSON.stringify(this.state.professions),
        };
        apiRunCall(run_data, this.handleApiRun);
        // Re-enable when done
    }

    handleApiRun(data){
        this.setState({output_display:'ready'});
        //this.setState({output_display:JSON.stringify(data,null,1)});
        this.setState({raw_run:data});
        this.setState({enabled_run_button:true});
    }

    handleCheckbox(event) {
        const target = event.target;
        const name = target.name;
        const professions = this.state.professions.slice();

        const index = professions.indexOf(name);
        if (index > -1) {
            professions.splice(index, 1);
        } else {
            professions.push(name);
        }
        this.setState({ professions: professions });
    }

    pickForm(e) {
        this.setState({ run_type: e.target.value });
    }

    render() {
        let runform;
        //const output = <pre>{this.state.output_display}</pre>;
        if (this.state.run_type === 'advanced') {
            runform = <AdvancedRunFrom
                handleInputChange={this.handleInputChange} handleSubmit={this.handleSubmit} handleCheckbox={this.handleCheckbox}
                item={this.state.item}
                addon_data={this.state.addon_data}
                required={this.state.required}
                region={this.state.region}
                realm={this.state.realm}
                professions={this.state.professions}
                allProfessions={this.state.all_professions}
                button_enabled={this.state.enabled_run_button} />
        } else {
            runform = <SimpleRunFrom handleInputChange={this.handleInputChange} handleSubmit={this.handleSubmit}
                item={this.state.item}
                addon_data={this.state.addon_data}
                required={this.state.required}
                button_enabled={this.state.enabled_run_button} />
        }
        return (
            <div className="RunCoordinator">
                <fieldset>
                    <select onChange={this.pickForm} value={this.state.run_type}>
                        <option value="advanced">Advanced</option>
                        <option value="simple">Simple</option>
                    </select>
                </fieldset>
                <div>
                    {runform}
                </div>
                <div>
                    <RunResultDisplay raw_run={this.state.raw_run} status={this.state.output_display} />
                </div>
            </div>
        );
    }
}

export default RunCoordinator;