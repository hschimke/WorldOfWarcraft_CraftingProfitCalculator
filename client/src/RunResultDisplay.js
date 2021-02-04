import React from 'react';
import { textFriendlyOutputFormat } from './text-output-helpers.mjs';
import './RunResultDisplay.css';
import {goldFormatter, VendorItemPrice, AHItemPrice} from './GoldFormatter.js';
import {ShoppingLists} from './ShoppingLists.js';

class RecipeListing extends React.Component {
    render() {
        const show_ah_price = ((this.props.recipe.ah !== undefined) && (this.props.recipe.ah.sales > 0));
        const show_parts = (this.props.recipe.parts !== undefined);
        return (
            <div className="RecipeListing">
                <div className="RecipeHeader">
                    <span className="RecipeName">
                        {this.props.recipe.name}
                    </span>
                    <span className="RecipeRank">
                        {this.props.recipe.rank}</span>
                    <span className="RecipeId">
                        ({this.props.recipe.id})
                    </span>
                    <span className="RecipeCost">
                        {goldFormatter(this.props.recipe.high)}/{goldFormatter(this.props.recipe.low)}/{goldFormatter(this.props.recipe.average)}
                    </span>
                </div>
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
                <div className="RunResultItemRecipes">
                    <div className="RunResultItemRecipesHeader">
                        <span className="ItemName">
                            {output_data.name}
                        </span>
                        <span className="ItemId">
                            ({output_data.id})
                        </span>
                        <span className="Required">
                            Requires {output_data.required}
                        </span>
                    </div>
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
                </div>
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
                {this.props.status !== 'ready' &&
                    <div className="Status">
                        {this.props.status}
                    </div>
                }
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