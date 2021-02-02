import React from 'react';
import { textFriendlyOutputFormat } from './text-output-helpers.mjs';
import './RunResultDisplay.css';

function goldFormatter(price_in) {
    const price = Math.trunc(price_in);
    const copper = price % 100;
    const silver = (((price % 10000) - copper)) / 100;
    const gold = (price - (price % 10000)) / 10000;
    return (
        <span className="PriceData">
            <span className="Gold">{gold.toLocaleString()}g</span> <span className="Silver">{silver.toLocaleString()}s</span> <span className="Copper">{copper.toLocaleString()}c</span>
        </span>
    );
}

class AHItemPrice extends React.Component {
    render() {
        return (
            <div className="AHItemPrice">AH {this.props.ah.sales}: {goldFormatter(this.props.ah.high)}/{goldFormatter(this.props.ah.low)}/{goldFormatter(this.props.ah.average)}</div>
        );
    }
}

class VendorItemPrice extends React.Component {
    render() {
        return (
            <div className="VendorItemPrice">Vendor {goldFormatter(this.props.vendor)}</div>
        );
    }
}

class RecipeListing extends React.Component {
    render() {
        const show_ah_price = ((this.props.recipe.ah !== undefined) && (this.props.recipe.ah.sales > 0));
        const show_parts = (this.props.recipe.parts !== undefined);
        return (
            <div className="RecipeListing">
                <div>{this.props.recipe.name} - {this.props.recipe.rank} - ({this.props.recipe.id}) : {goldFormatter(this.props.recipe.high)}/{goldFormatter(this.props.recipe.low)}/{goldFormatter(this.props.recipe.average)}</div>
                {show_ah_price &&
                    <AHItemPrice ah={this.props.recipe.ah} />}
                {show_parts &&
                    this.props.recipe.parts.map(part => {
                        return <RunResultItem raw_run={part} />;
                    })
                }
            </div>
        );
    }
}

class ShoppingLists extends React.Component {
    render() {
        return (
            <div className="ShoppingLists">
                Shopping List For: {this.props.name}
                {Object.keys(this.props.lists).map(list => {
                    return <ShoppingList list={this.props.lists[list]} level={list} />
                })}
            </div>
        );
    }
}

class ShoppingList extends React.Component {
    render() {
        return (
            <table className="ShoppingList">
                <thead>
                    <tr>
                        <td colSpan="2">
                            List for rank {this.props.level}
                        </td>
                        </tr>
                </thead>
                <tbody>
                    {this.props.list.map(list_item => {
                        return <ShoppingListItem item={list_item} />
                    })}
                </tbody>
            </table>
        );
    }
}

class ShoppingListItem extends React.Component {
    render() {
        const li = this.props.item;
        const show_vendor = (li.cost.vendor !== undefined);
        const show_ah = (li.cost.ah !== undefined);

        return (
            <tr className="ShoppingListItem">
                <td className="Quantity">
                    {li.quantity.toLocaleString()}
                </td>
                <td>
                    {li.name} ({li.id})
                    {show_vendor &&
                        <VendorItemPrice vendor={li.cost.vendor} />
                    }
                    {show_ah &&
                        <AHItemPrice ah={li.cost.ah} />
                    }
                </td>
            </tr>
        );
    }
}

class RunResultItem extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        let ah_addin = false;
        let vendor_addin = false;
        let recipes = false;
        let bonuses = false;
        let shopping = false;
        const output_data = this.props.raw_run !== undefined ? this.props.raw_run : {};

        ah_addin = ((output_data.ah !== undefined) && (output_data.ah.sales > 0));
        vendor_addin = (output_data.vendor > 0);
        recipes = (output_data.recipes !== undefined);
        bonuses = (output_data.bonus_prices !== undefined);
        shopping = ('shopping_lists' in output_data && Object.keys(output_data.shopping_lists).length > 0);
        return (
            <div className="RunResultItem">
                {`${output_data.name} (${output_data.id}) Requires ${output_data.required}`}
                {ah_addin &&
                    <AHItemPrice ah={output_data.ah} />
                }
                {vendor_addin &&
                    <VendorItemPrice vendor={output_data.vendor} />
                }
                {recipes &&
                    output_data.recipes.map(recipe => {
                        return <RecipeListing recipe={recipe} />
                    })
                }
                {bonuses &&
                    output_data.bonus_prices.map(bonus_price => {
                        return (
                            <div className="Bonuses">
                                {output_data.name} ({output_data.id}) iLvl {bonus_price.level}
                                <AHItemPrice ah={bonus_price.ah} />
                            </div>
                        );
                    })
                }
                {shopping &&
                    <ShoppingLists lists={output_data.shopping_lists} name={output_data.name} />
                }
            </div>
        );
    }
}

class RunResultDisplay extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        const SHOW_RES = false;
        let res = '';
        if (this.props.status === 'ready' && this.props.raw_run !== undefined) {
            res = textFriendlyOutputFormat(this.props.raw_run, 1);
        }
        return (
            <div className="RunResultDisplay">
                <div className="Status">
                    {this.props.status}
                </div>
                {SHOW_RES &&
                    <div class="RawResult">
                        <pre>
                            {res}
                        </pre>
                    </div>
                }
                <div className="WebResult">
                    <RunResultItem raw_run={this.props.raw_run} />
                </div>
            </div>
        );
    }
}

export default RunResultDisplay;