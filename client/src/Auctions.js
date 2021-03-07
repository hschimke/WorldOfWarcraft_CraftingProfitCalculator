import React from 'react';
import './Auctions.css';
import { apiAuctionHistoryFetch } from './ApiClient.js';
import { Chart } from "react-google-charts";

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
            chart_ready: false,
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
        this.setState({ raw_data: data });

        const chart_data = [['Downloaded', 'Price']].concat(data.map(element => {
            return [new Date(element.downloaded), element.price];
        }));
        this.setState({ chart_ready: true });
        this.setState({ chart_data: chart_data });
    }
    // https://react-google-charts.com/scatter-chart
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
                    {
                        (this.state.chart_ready === true) &&
                        <Chart
                            width={'600px'}
                            height={'400px'}
                            chartType="ScatterChart"
                            loader={<div>Loading Chart</div>}
                            data={this.state.chart_data}
                            options={{
                                title: 'Price Over Time',
                                hAxis: { title: 'Time' },
                                vAxis: { title: 'Price' },
                                legend: 'none',
                            }}
                            rootProps={{ 'data-testid': '1' }}
                        />
                    }
                    <pre>
                        {JSON.stringify(this.state.chart_data, undefined, 2)}
                    </pre>
                    <pre>
                        {JSON.stringify(this.state.raw_data, undefined, 2)}
                    </pre>
                </div>
            </div>
        );
    }
}

export default Auctions;