import React, { FormEvent, useReducer } from 'react';
import './Auctions.css';
import { useFetchHistoryApi, UseFetchApiState } from '../Shared/ApiClient';
import { Chart } from "react-google-charts";
import { GoldFormatter } from '../Shared/GoldFormatter';
import { BonusListDropdown } from './BonusListDropdown';
import { RegionSelector } from '../Shared/RegionSelector';
import { AuctionHistoryDispatch } from './Shared';
import {ScanRealms} from './ScanRealms';

export interface AuctionsFormDataReducerAction {
    fieldName: string,
    value: string
}

export interface AuctionsFormDataReducerState {
    item_name: string,
    realm_name: string,
    region: string
    ilevel: string,
    sockets: string,
    quality: string
}

export interface AuctionsProps {

}

function formDataReducer(state: AuctionsFormDataReducerState, action: AuctionsFormDataReducerAction): AuctionsFormDataReducerState {
    switch (action.fieldName) {
        case 'item_name':
            return {
                ...state,
                item_name: action.value,
                ilevel: '',
                quality: '',
                sockets: '',
            };
        case 'realm_name':
            return {
                ...state,
                realm_name: action.value,
                ilevel: '',
                quality: '',
                sockets: '',
            };
        case 'region':
            return {
                ...state,
                region: action.value,
                ilevel: '',
                quality: '',
                sockets: '',
            };
        case 'ilevel':
            return {
                ...state,
                ilevel: action.value
            };
        case 'quality':
            return {
                ...state,
                quality: action.value
            };
        case 'sockets':
            return {
                ...state,
                sockets: action.value
            };
        default:
            throw new Error();
    }
}

function Auctions(props: AuctionsProps) {
    const [apiState, sendPayload] = useFetchHistoryApi();
    const [formState, dispatchFormUpdate] = useReducer(formDataReducer, {
        item_name: 'Grim-Veiled Bracers',
        realm_name: 'Hyjal',
        region: 'US',
        ilevel: '',
        quality: '',
        sockets: '',
    });

    const button_enabled = (apiState.isLoading) ? false : true;
    let chart_ready = false;

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
        dispatchFormUpdate({ fieldName: event.target.name, value: event.target.value });
    };

    const handleSubmit: React.FormEventHandler = (event) => {
        event.preventDefault();
        const send_data = {
            item: formState.item_name,
            realm: formState.realm_name,
            region: formState.region,
            bonuses: [formState.ilevel, formState.sockets, formState.quality],
        }
        sendPayload(send_data);
    };

    let bubble_chart_data: (string | number | Date)[][] = [['ID', 'Auctions', 'Price', 'Quantity']];
    let bar_chart_data: (string | number | Date)[][] = [['Fetch', 'High', 'Low', 'Average']];
    let volume_chart_data: (string | number | Date)[][] = [['Date', 'Quantity']];
    let no_data_result = '';
    try {
        if (!(apiState.isLoading || apiState.isError) && apiState.data !== undefined) {
            const data = apiState.data;
            if (data.ERROR === undefined) {

                const latest = data.price_map[data.latest];

                //bubble_chart_data = [['ID', 'Auctions', 'Price', 'Quantity']];
                if (latest.data !== undefined) {
                    latest.data.forEach(element => {
                        bubble_chart_data.push(['', Number(element.sales_at_price), Number(element.price), Number(element.quantity_at_price)]);
                    });
                }

                //bar_chart_data = [['Fetch', 'High', 'Low', 'Average']];
                Object.keys(data.price_map).forEach(key => {
                    const element = data.price_map[key];
                    bar_chart_data.push([new Date(Number(key)), Number(element.max_value), Number(element.min_value), Number(element.avg_value)]);
                });

                //volume_chart_data = [['Date', 'Qauntity']];
                Object.keys(data.price_map).forEach(key => {
                    let sales_by_key = 0;
                    const price_map_for_key = data.price_map[key];
                    if (price_map_for_key.data !== undefined) {
                        price_map_for_key.data.forEach(element => {
                            sales_by_key += Number(element.quantity_at_price);
                        });
                    }
                    volume_chart_data.push([new Date(Number(key)), sales_by_key]);
                });

                // Handle Archives
                for (const archive_row of data.archives) {
                    bar_chart_data.push([new Date(Number(archive_row.timestamp)), Number(archive_row.max_value), Number(archive_row.min_value), Number(archive_row.avg_value)])
                    {
                        let sales_by_key = 0;
                        archive_row.data.forEach(element => {
                            sales_by_key += Number(element.quantity_at_price);
                        });
                        volume_chart_data.push([new Date(Number(archive_row.timestamp)), (sales_by_key / 24)]);
                    }
                }

                chart_ready = true;
            }
        }

        if (apiState.data !== undefined) {
            const latest_price_data = apiState.data.price_map[apiState.data.latest];
            const historical_price_data = apiState.data;
            const current_price_data = apiState.data.price_map[apiState.data.latest].data;
        }
    }catch{
        no_data_result = 'No Data Found for item';
    }


    // https://react-google-charts.com/scatter-chart
    return (
        <div className="Auctions">
            <span className="NoDataResult">{no_data_result}</span>
            <AuctionHistoryDispatch.Provider value={dispatchFormUpdate}>
                <form className="AuctionHistorySelector" onSubmit={handleSubmit}>
                    <label>
                        Item:
                        <input type="text" name="item_name" value={formState.item_name} onChange={handleChange} />
                    </label>
                    <label>
                        Realm:
                        <input type="text" name="realm_name" value={formState.realm_name} onChange={handleChange} />
                    </label>
                    <RegionSelector selected_region={formState.region} onChange={handleChange} label="Region:" />
                    <BonusListDropdown item={formState.item_name} region={formState.region} realm={formState.realm_name} ilevel={formState.ilevel} quality={formState.quality} sockets={formState.sockets} />
                    <button type="submit" disabled={!button_enabled} value="Run">Run</button>
                </form>
            </AuctionHistoryDispatch.Provider>
            <ScanRealms />
            {
                (chart_ready === true) &&
                <div className="DataReturnDisplay">
                    {(apiState.data !== undefined) &&
                        <span>
                            <PriceSummary title="Current Spot" high={apiState.data.price_map[apiState.data.latest].max_value} low={apiState.data.price_map[apiState.data.latest].min_value} average={apiState.data.price_map[apiState.data.latest].avg_value} />
                            <PriceSummary title="Historical" high={apiState.data.max} low={apiState.data.min} average={apiState.data.avg} />
                            <PriceChart title="Current Breakdown" rows={apiState.data.price_map[apiState.data.latest].data} />
                        </span>
                    }
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
                    {false && JSON.stringify(apiState.data, undefined, 2)}
                </pre>
            </div>
        </div>
    );
}

export interface PriceSummaryProps {
    title: string,
    high: number,
    average: number,
    low: number
}

function PriceSummary(props: PriceSummaryProps) {
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

export interface PriceChartProps {
    title: string,
    rows?: SalesCountSummaryPrice[]
}
function PriceChart(props: PriceChartProps) {
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
                        (props.rows !== undefined) &&
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