import './GoldFormatter.css';
import React from 'react';

function goldFormatter(price_in) {
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
                AH {this.props.ah.sales}: {goldFormatter(this.props.ah.high)}/{goldFormatter(this.props.ah.low)}/{goldFormatter(this.props.ah.average)}
            </div>
        );
    }
}

class VendorItemPrice extends React.Component {
    render() {
        return (
            <div className="VendorItemPrice">
                Vendor {goldFormatter(this.props.vendor)}
            </div>
        );
    }
}

export { goldFormatter, AHItemPrice, VendorItemPrice };