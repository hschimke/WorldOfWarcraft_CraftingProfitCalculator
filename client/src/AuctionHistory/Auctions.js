import { useState } from 'react';
import './Auctions.css';
import { apiAuctionHistoryFetch } from '../Shared/ApiClient.js';
import { Chart } from "react-google-charts";
import { GoldFormatter } from '../Shared/GoldFormatter.js';
import { BonusListDropdown } from './BonusListDropdown.js';

function Auctions(props) {
    const [button_enabled, updateButtonEnabled] = useState(true);
    const [item_name, updateItemName] = useState('Grim-Veiled Bracers');
    const [realm_name, updateRealmName] = useState('Hyjal');
    const [region, updateRegion] = useState('US');
    const [chart_ready, updateChartReady] = useState(false);
    const [ilevel, updateILevel] = useState('');
    const [quality, updateQuality] = useState('');
    const [sockets, updateSockets] = useState('');
    const [raw_data, updateRawData] = useState();
    const [bubble_chart_data, updateBubbleChartData] = useState();
    const [bar_chart_data, updateBarChartData] = useState();
    const [volume_chart_data, updateVolumeChartData] = useState();
    const [latest, updateLatest] = useState();

    const handleChange = (event) => {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        switch (name) {
            case 'item_name':
                updateItemName(value);
                break;
            case 'realm_name':
                updateRealmName(value);
                break;
            case 'region':
                updateRegion(value);
                break;
            case 'ilevel':
                updateILevel(value);
                break;
            case 'quality':
                updateQuality(value);
                break;
            case 'sockets':
                updateSockets(value);
                break;
            default:
                break;
        }

        if (name === 'item_name' || name === 'region' || name === 'realm_name') {
            updateILevel('');
            updateQuality('');
            updateSockets('');
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        updateButtonEnabled(false);
        const send_data = {
            item: item_name,
            realm: realm_name,
            region: region,
            bonuses: [ilevel, sockets, quality],
        }
        apiAuctionHistoryFetch(send_data, handleApiReturn);
    };

    const handleApiReturn = (data) => {
        updateButtonEnabled(true);
        updateRawData(data);

        if ('ERROR' in data) {
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

        updateChartReady(true);
        updateBubbleChartData(bubble_chart)
        updateBarChartData(bar_chart);
        updateVolumeChartData(sales_volume_chart);
        updateLatest(latest);
    };

    const handleSelectChange = (event) => {
        handleChange(event);
    };

    // https://react-google-charts.com/scatter-chart
    return (
        <div className="Auctions">
            <form className="AuctionHistorySelector" onSubmit={handleSubmit}>
                <label>
                    Item:
                        <input type="text" name="item_name" value={item_name} onChange={handleChange} />
                </label>
                <label>
                    Realm:
                        <input type="text" name="realm_name" value={realm_name} onChange={handleChange} />
                </label>
                <label>
                    Region:
                        <input type="text" name="region" value={region} onChange={handleChange} />
                </label>
                <BonusListDropdown item={item_name} region={region} ilevel={ilevel} quality={quality} sockets={sockets} handleSelect={handleSelectChange} />
                <button type="submit" disabled={!button_enabled} value="Run">Run</button>
            </form>
            {
                (chart_ready === true) &&
                <div className="DataReturnDisplay">
                    <PriceSummary title="Current Spot" high={raw_data.price_map[raw_data.latest].max_value} low={raw_data.price_map[raw_data.latest].min_value} average={raw_data.price_map[raw_data.latest].avg_value} />
                    <PriceSummary title="Historical" high={raw_data.max} low={raw_data.min} average={raw_data.avg} />
                    <PriceChart title="Current Breakdown" rows={raw_data.price_map[raw_data.latest].data} />
                    <Chart
                        width={'500px'}
                        height={'300px'}
                        chartType="BubbleChart"
                        loader={<div>Loading Chart</div>}
                        data={bubble_chart_data}
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
                        data={bar_chart_data}
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
                        data={volume_chart_data}
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
                    {false && JSON.stringify(raw_data, undefined, 2)}
                </pre>
            </div>
        </div>
    );
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