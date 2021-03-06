import React from 'react';
import './Auctions.css';
import { apiAuctionHistoryFetch } from './ApiClient.js';

class Auctions extends React.Component {
    constructor(props) {
        super(props);

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleApiReturn = this.handleApiReturn.bind(this);

        this.state = {
            button_enabled: true,
            item_name: 'Grim-Veiled Bracers',
            realm_name: 'Hyjal',
            region: 'US',
        };
    }

    handleChange(event) {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        this.setState({
            [name]: value
        });
    }

    handleSubmit(event) {
        event.preventDefault();
        this.setState({ button_enabled: false });
        const send_data = {
            item: this.state.item_name,
            realm: this.state.realm_name,
            region: this.state.region,
            bonuses: undefined,
        }
        apiAuctionHistoryFetch(send_data, this.handleApiReturn);
    }

    handleApiReturn(data) {
        this.setState({ button_enabled: true });
        this.setState({raw_data: data});
    }

    render() {
        return (
            <div className="Auctions">
                <form className="AuctionHistorySelector" onSubmit={this.handleSubmit}>
                    <label>
                        Item:
                        <input type="text" name="item_name" value={this.state.item_name} onChange={this.handleChange} />
                    </label>
                    <label>
                        Realm:
                        <input type="text" name="realm_name" value={this.state.realm_name} onChange={this.handleChange} />
                    </label>
                    <label>
                        Region:
                        <input type="text" name="region" value={this.state.region} onChange={this.handleChange} />
                    </label>
                    <button type="submit" disabled={!this.state.button_enabled} value="Run">Run</button>
                </form>
                <div className="RawReturn">
                    <pre>
                        {JSON.stringify(this.state.raw_data, undefined, 2)}
                    </pre>
                </div>
            </div>
        );
    }
}

export default Auctions;