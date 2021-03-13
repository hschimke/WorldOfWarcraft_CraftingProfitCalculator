import './GoldFormatter.css';

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

function AHItemPrice(props) {
    return (
        <div className="AHItemPrice">
            AH {props.ah.sales}: <GoldFormatter raw_price={props.ah.high} />/<GoldFormatter raw_price={props.ah.low} />/<GoldFormatter raw_price={props.ah.average} />
        </div>
    );
}

function VendorItemPrice(props) {
    return (
        <div className="VendorItemPrice">
            Vendor <GoldFormatter raw_price={props.vendor} />
        </div>
    );
}

export { GoldFormatter, AHItemPrice, VendorItemPrice };