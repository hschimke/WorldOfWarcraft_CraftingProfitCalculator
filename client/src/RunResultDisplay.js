import React from 'react';
import { textFriendlyOutputFormat, goldFormatter } from './text-output-helpers.mjs';

class AHItemPrice extends React.Component {
    render() {
        return (
            <span>AH {this.props.ah.sales}: {goldFormatter(this.props.ah.high)}/{goldFormatter(this.props.ah.low)}/{goldFormatter(this.props.ah.average)}</span>
        );
    }
}

class VendorItemPrice extends React.Component {
    render() {
        return (
            <span>Vendor {goldFormatter(this.props.vendor)}</span>
        );
    }
}

class RecipeListing extends React.Component {
    render() {
        let option_ah;
        let recipe_parts;
        if ((this.props.recipe.ah !== undefined) && (this.props.recipe.ah.sales > 0)) {
            option_ah = <AHItemPrice ah={this.props.recipe.ah} />
        }
        if (this.props.recipe.parts !== undefined) {
            recipe_parts = this.props.recipe.parts.map(part => {
                return <RunResultDisplay raw_run={part} />;
            });
        }
        return (
            <div>
                <span>{this.props.recipe.name} - {this.props.recipe.rank} - ({this.props.recipe.id}) : {goldFormatter(this.props.recipe.high)}/{goldFormatter(this.props.recipe.low)}/{goldFormatter(this.props.recipe.average)}</span>
                {option_ah}
                {recipe_parts}
            </div>
        );
    }
}

class ShoppingLists extends React.Component {
    render() {
        return (
            <div>
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
            <div>
                List for rank {this.props.level}
                {this.props.list.map(list_item=>{
                    return <ShoppingListItem item={list_item} />
                })}
            </div>
        );
    }
}

class ShoppingListItem extends React.Component {
    render(){
        const li = this.props.item;
        let vendor;
        let ah;
        if (li.cost.vendor !== undefined) {
            vendor = <VendorItemPrice vendor={li.cost.vendor} />
        }
        if (li.cost.ah !== undefined) {
            ah = <AHItemPrice ah={li.cost.ah} />
        }
        return(
            <div>
                [{li.quantity.toLocaleString().padStart(8, ' ')}] -- {li.name} ({li.id})
                {vendor}
                {ah}
            </div>
        );
    }
}

class RunResultItem extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        let ah_addin = '';
        let vendor_addin = '';
        let recipes = '';
        let bonuses = '';
        let shopping = '';
        const output_data = this.props.raw_run;
        if ((output_data.ah !== undefined) && (output_data.ah.sales > 0)) {
            ah_addin = <AHItemPrice ah={output_data.ah} />
        }
        if (output_data.vendor > 0) {
            vendor_addin = <VendorItemPrice vendor={output_data.vendor} />
        }
        if (output_data.recipes !== undefined) {
            recipes = output_data.recipes.map(recipe => {
                return <RecipeListing recipe={recipe} />
            });
        }
        if (output_data.bonus_prices !== undefined) {
            bonuses = output_data.bonus_prices.map(bonus_price => {
                return (
                    <div>
                        {output_data.name} ({output_data.id}) iLvl {bonus_price.level}
                        AH {bonus_price.ah.sales}: {goldFormatter(bonus_price.ah.high)}/{goldFormatter(bonus_price.ah.low)}/{goldFormatter(bonus_price.ah.average)}
                    </div>
                );
            });
        }
        if ('shopping_lists' in output_data && Object.keys(output_data.shopping_lists).length > 0) {
            shopping = <ShoppingLists lists={output_data.shopping_lists} name={output_data.name} />
        }
        return (
            <div>
                {`${output_data.name} (${output_data.id}) Requires ${output_data.required}`}
                {ah_addin}
                {vendor_addin}
                {recipes}
                {bonuses}
                {shopping}
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
        let res = '';
        if (this.props.status === 'ready') {
            res = textFriendlyOutputFormat(this.props.raw_run, 1);
        }
        return (
            <div>
                <div>
                    {this.props.status}
                </div>
                <div>
                    {res}
                </div>
                <div>
                    <RunResultItem raw_run={this.props.raw_run} />
                </div>
            </div>
        );
    }
}

export default RunResultDisplay;