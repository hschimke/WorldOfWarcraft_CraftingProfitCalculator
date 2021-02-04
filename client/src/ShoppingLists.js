import React from 'react';
import './ShoppingLists.css';
import {AHItemPrice, VendorItemPrice} from './GoldFormatter.js';

class ShoppingLists extends React.Component {
    render() {
        return (
            <div className="ShoppingLists">
                <span className="ShoppingListsHeader">
                    Shopping List For: {this.props.name}
                </span>
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
                        <th colSpan="2">
                            <span className="ShoppingListTitle">
                                List for rank {this.props.level}
                            </span>
                        </th>
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
                <td className="Data">
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

export {ShoppingLists};