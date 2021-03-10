import React from 'react';
import { apiGetSeenBonuses } from '../Shared/ApiClient.js';
import './BonusListDropdown.css';

class BonusListDropdown extends React.Component {
    constructor(props) {
        super(props);

        this.handleApiReturn = this.handleApiReturn.bind(this);
        this.handleChange = this.handleChange.bind(this);

        this.state = {
            ready: false,
            bonuses: [],
            mapped: [],
            bonus_mappings: undefined,
        };

        apiGetSeenBonuses({ item: this.props.item, region: this.props.region }, this.handleApiReturn);
    }

    componentDidUpdate(prevProps) {
        // Typical usage (don't forget to compare props):
        if ((this.props.item !== prevProps.item) || (this.props.region !== prevProps.region)) {
            apiGetSeenBonuses({ item: this.props.item, region: this.props.region }, this.handleApiReturn);
        }
    }

    handleApiReturn(data) {
        if ('ERROR' in data) {
            return;
        }

        this.setState({ bonuses: data.bonuses });
        this.setState({mapped: data.mapped});
        this.setState({ raw: data });
    }

    handleChange(event) {
        this.props.handleSelect(event);
    }

    render() {
        return (
            <label>
                {this.props.title}
                <select onChange={this.handleChange}>
                    {this.state.mapped.map(bonus => {
                        return (
                            <option key={bonus.text}>{bonus.reduced}</option>
                        )
                    }
                    )}
                </select>
            </label>
        );
    }
}

export { BonusListDropdown };