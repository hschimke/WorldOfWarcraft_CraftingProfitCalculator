import './GoldFormatter.css';
import React from 'react';

function GoldFormatter(props) {
    const price_in = props.raw_price;
    const price = Math.trunc(price_in);
    const copper = price % 100;
    const silver = (((price % 10000) - copper)) / 100;
    const gold = (price - (price % 10000)) / 10000;
    return (
        <span className="PriceData">
            <span className="Gold">
                {gold.toLocaleString()}
                <span className="Currency">g</span>
            </span>
            <span className="Silver">
                {silver.toLocaleString()}
                <span className="Currency">s</span>
            </span>
            <span className="Copper">
                {copper.toLocaleString()}
                <span className="Currency">c</span>
            </span>
        </span>
    );
}

class AHItemPrice extends React.Component {
    render() {
        return (
            <div className="AHItemPrice">
                AH {this.props.ah.sales}: <GoldFormatter raw_price={this.props.ah.high} />/<GoldFormatter raw_price={this.props.ah.low} />/<GoldFormatter raw_price={this.props.ah.average} />
            </div>
        );
    }
}

class VendorItemPrice extends React.Component {
    render() {
        return (
            <div className="VendorItemPrice">
                Vendor <GoldFormatter raw_price={this.props.vendor} />
            </div>
        );
    }
}

export { GoldFormatter, AHItemPrice, VendorItemPrice };