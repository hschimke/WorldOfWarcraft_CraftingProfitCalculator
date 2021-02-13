import React from 'react';
import { textFriendlyOutputFormat } from './text-output-helpers.mjs';
import './RunResultDisplay.css';
import { GoldFormatter, VendorItemPrice, AHItemPrice } from './GoldFormatter.js';
import { ShoppingLists } from './ShoppingLists.js';

const hidden_recipe_listing_header = {};

const hidden_run_result_header = {};

class RecipeListing extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            child_display: false,
        };
        this.toggleChildren = this.toggleChildren.bind(this);
    }

    toggleChildren(e) {
        this.setState({ child_display: !this.state.child_display });
    }

    render() {
        const show_ah_price = ((this.props.recipe.ah !== undefined) && (this.props.recipe.ah.sales > 0));
        const show_parts = (this.props.recipe.parts !== undefined);
        const parent_styles = this.state.child_display ? {} : hidden_recipe_listing_header;
        const child_addins = this.state.child_display ? '' : ' HiddenChild';
        return (
            <div className="RecipeListing" style={parent_styles}>
                <div className="RecipeHeader">
                    <span className="RecipeBanner">
                        Recipe
                    </span>
                    <span className="RecipeHeaderDetails">
                        <span className="RecipeName">
                            {this.props.recipe.name}
                        </span>
                        <span className="RecipeRank">
                            {this.props.recipe.rank}
                        </span>
                        <span className="RecipeId">
                            ({this.props.recipe.id})
                        </span>
                    </span>
                    <span className="RecipeCost">
                        <GoldFormatter raw_price={this.props.recipe.high} />
                        /
                        <GoldFormatter raw_price={this.props.recipe.low} />
                        /
                        <GoldFormatter raw_price={this.props.recipe.average} />
                    </span>
                </div>
                {show_ah_price &&
                    <AHItemPrice ah={this.props.recipe.ah} />}
                <span className="RecipePartsBanner" onClick={this.toggleChildren}>
                    {this.props.recipe.parts.length} Components
                </span>
                <div class={'HideableChild' + child_addins}>
                    {show_parts &&
                        this.props.recipe.parts.map(part => {
                            return <RunResultItem raw_run={part} show_children={false} />;
                        })
                    }
                </div>
            </div>
        );
    }
}

class RunResultItem extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            show_children: (this.props.show_children === true),
        };
        this.toggleChildren = this.toggleChildren.bind(this);
    }

    toggleChildren(e) {
        this.setState({ show_children: !this.state.show_children });
    }

    render() {
        if (this.props.raw_run === undefined) {
            return null;
        }
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

        const children_classes = this.state.show_children ? '' : ' HiddenChild';
        const parent_styles = this.state.show_children ? {} : hidden_run_result_header;

        return (
            <div className="RunResultItem">
                <div className="RunResultItemRecipes" style={parent_styles}>
                    <div className="RunResultItemRecipesHeader">
                        <span className="ItemBanner">
                            Item
                        </span>
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
                    <span className="ItemRecipesBanner" onClick={this.toggleChildren}>
                        {output_data.recipes.length} Recipes
                    </span>
                    <div className={'RunResultItemRecipesChildren HideableChild' + children_classes}>
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
                </div>
                {shopping &&
                    <ShoppingLists lists={output_data.shopping_lists} name={output_data.name} />
                }
            </div>
        );
    }
}

RunResultItem.defaultProps = {
    show_children: true,
};

class RunResultDisplay extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        const SHOW_RES = this.props.show_raw_result;
        let res;
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