import React from 'react';
import './Auctions.css';
import { apiAuctionHistoryFetch } from '../Shared/ApiClient.js';
import { Chart } from "react-google-charts";
import { GoldFormatter } from '../Shared/GoldFormatter.js';
import {BonusListDropdown} from './BonusListDropdown.js';

class Auctions extends React.Component {
    constructor(props) {
        super(props);

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleApiReturn = this.handleApiReturn.bind(this);
        this.handleSelectChange = this.handleSelectChange.bind(this);

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
            bonuses: [this.state.ilevel, this.state.sockets, this.state.quality],
        }
        apiAuctionHistoryFetch(send_data, this.handleApiReturn);
    }

    handleApiReturn(data) {
        this.setState({ button_enabled: true });
        this.setState({ raw_data: data });

        if('ERROR' in data){
            return;
        }

        const latest = data.price_map[data.latest];

        const bubble_chart = [['ID', 'Auctions', 'Price', 'Quantity']];
        latest.data.forEach(element => {
            bubble_chart.push(['', element.sales_at_price, element.price, element.quantity_at_price]);
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
        this.setState({ latest: latest });
    }

    handleSelectChange(event){
        this.handleChange(event);
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
                    <BonusListDropdown item={this.state.item_name} region={this.state.region} ilevel={this.state.ilevel} quality={this.state.quality} sockets={this.state.sockets} handleSelect={this.handleSelectChange} />
                    <button type="submit" disabled={!this.state.button_enabled} value="Run">Run</button>
                </form>
                {
                    (this.state.chart_ready === true) &&
                    <div className="DataReturnDisplay">
                        <PriceSummary title="Current Spot" high={this.state.raw_data.price_map[this.state.raw_data.latest].max_value} low={this.state.raw_data.price_map[this.state.raw_data.latest].min_value} average={this.state.raw_data.price_map[this.state.raw_data.latest].avg_value} />
                        <PriceSummary title="Historical" high={this.state.raw_data.max} low={this.state.raw_data.min} average={this.state.raw_data.avg} />
                        <PriceChart title="Current Breakdown" rows={this.state.raw_data.price_map[this.state.raw_data.latest].data} />
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
                                        degree: 3,
                                    },
                                    1: {
                                        type: 'polynomial',
                                        degree: 3,
                                    },
                                    2: {
                                        type: 'polynomial',
                                        degree: 3,
                                    },
                                },
                            }}
                            // For tests
                            rootProps={{ 'data-testid': '2' }}
                        />

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
                    </div>
                }
                <div className="RawReturn">
                    <pre>
                        {false && JSON.stringify(this.state.raw_data, undefined, 2)}
                    </pre>
                </div>
            </div>
        );
    }
}

function PriceSummary(props) {
    return (
        <div className="PriceSummary">
            <span className="PriceSummaryTitle">{props.title}</span>
            <div>
                <span className="PriceSummarySection">High:</span>
                <GoldFormatter raw_price={props.high} />
            </div>
            <div>
                <span className="PriceSummarySection">Average:</span>
                <GoldFormatter raw_price={props.average} />
            </div>
            <div>
                <span className="PriceSummarySection">Low:</span>
                <GoldFormatter raw_price={props.low} />
            </div>
        </div>
    );
}

function PriceChart(props) {
    return (
        <div className="PriceChart">
            <span>{props.title}</span>
            <table>
                <thead>
                    <tr>
                        <th>
                            Price
                        </th>
                        <th>
                            Quantity Available
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {
                        props.rows.map(row => {
                            return (
                                <tr key={row.price}>
                                    <td>
                                        <GoldFormatter raw_price={row.price} />
                                    </td>
                                    <td>
                                        {row.quantity_at_price}
                                    </td>
                                </tr>
                            );
                        })
                    }
                </tbody>
            </table>
        </div>
    );
}

export default Auctions;