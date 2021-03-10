import React from 'react';
import './ShoppingLists.css';
import { AHItemPrice, VendorItemPrice } from '../Shared/GoldFormatter.js';

class ShoppingLists extends React.Component {
    render() {
        return (
            <div className="ShoppingLists">
                <span className="ShoppingListsHeader">
                    Shopping List For: {this.props.name}
                </span>
                <ul>
                    {Object.keys(this.props.lists).map(list => {
                        return <ShoppingList list={this.props.lists[list]} level={list} />
                    })}
                </ul>
            </div>
        );
    }
}

class ShoppingList extends React.Component {
    render() {
        return (
            <li className="ShoppingList">
                <span className="ShoppingListTitle">
                    List for rank {this.props.level}
                </span>
                <ul>
                    {this.props.list.map(list_item => {
                        return <ShoppingListItem item={list_item} />
                    })}
                </ul>
            </li>
        );
    }
}

class ShoppingListItem extends React.Component {
    render() {
        const li = this.props.item;
        const show_vendor = (li.cost.vendor !== undefined);
        const show_ah = (li.cost.ah !== undefined);

        return (
            <li className="ShoppingListItem">
                <div className="ShoppingListColumn Quantity">
                    {li.quantity.toLocaleString()}
                </div>
                <div className="ShoppingListColumn Data">
                    {li.name} ({li.id})
                    {show_vendor &&
                        <VendorItemPrice vendor={li.cost.vendor} />
                    }
                    {show_ah &&
                        <AHItemPrice ah={li.cost.ah} />
                    }
                </div>
            </li>
        );
    }
}

export { ShoppingLists };