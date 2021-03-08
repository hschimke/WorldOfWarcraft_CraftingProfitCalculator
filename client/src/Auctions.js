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

        const bubble_chart = [['ID', 'Auctions', 'Price', 'Quantity']];
        Object.keys(data.latest_data.price_map).forEach(key => {
            data.price_map[key].data.forEach(element => {
                bubble_chart.push(['', element.sales_at_price, element.price, element.quantity_at_price]);
            });
        });

        const bar_chart = [['Fetch', 'High', 'Low', 'Average']];
        Object.keys(data.price_map).forEach(key => {
            const element = data.price_map[key];
            bar_chart.push([new Date(Number(key)), element.max_value, element.min_value, element.avg_value]);
        });

        const sales_volume_chart = [['Date', 'Qauntity']];
        Object.keys(data.price_map).forEach(key => {
            let sales_by_key = 0;
            data.price_map[key].data.forEach(element => {
                sales_by_key += element.quantity_at_price;
            });
            sales_volume_chart.push([new Date(Number(key)), sales_by_key]);
        });


        this.setState({ chart_ready: true });
        this.setState({ bubble_chart_data: bubble_chart });
        this.setState({ bar_chart_data: bar_chart });
        this.setState({ volume_chart_data: sales_volume_chart });
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
                            width={'500px'}
                            height={'300px'}
                            chartType="BubbleChart"
                            loader={<div>Loading Chart</div>}
                            data={this.state.bubble_chart_data}
                            options={{
                                colorAxis: { colors: ['yellow', 'red'] },
                            }}
                            rootProps={{ 'data-testid': '2' }}
                        />
                    }
                    {
                        (this.state.chart_ready === true) &&
                        <Chart
                            width={'500px'}
                            height={'300px'}
                            chartType="ColumnChart"
                            loader={<div>Loading Chart</div>}
                            data={this.state.bar_chart_data}
                            options={{
                                // Material design options
                                chart: {
                                    title: 'Price Over Time',
                                },
                                  trendlines: {
                                    0: {
                                        type: 'polynomial',
                                        degree: 2,
                                    },
                                    1: {
                                        type: 'polynomial',
                                        degree: 2,
                                    },
                                    2: {
                                        type: 'polynomial',
                                        degree: 2,
                                    },
                                  },
                            }}
                            // For tests
                            rootProps={{ 'data-testid': '2' }}
                        />
                    }
                    {
                        (this.state.chart_ready === true) &&
                        <Chart
                            width={'500px'}
                            height={'300px'}
                            chartType="ColumnChart"
                            loader={<div>Loading Chart</div>}
                            data={this.state.volume_chart_data}
                            options={{
                                // Material design options
                                chart: {
                                    title: 'Sales Over Time',
                                },
                                  trendlines: {
                                    0: {
                                        type: 'polynomial',
                                        degree: 2,
                                    },
                                  },
                            }}
                            // For tests
                            rootProps={{ 'data-testid': '2' }}
                        />
                    }
                    <pre>
                        {false && JSON.stringify(this.state.chart_data, undefined, 2)}
                    </pre>
                    <pre>
                        {false && JSON.stringify(this.state.raw_data, undefined, 2)}
                    </pre>
                </div>
            </div>
        );
    }
}

export default Auctions;