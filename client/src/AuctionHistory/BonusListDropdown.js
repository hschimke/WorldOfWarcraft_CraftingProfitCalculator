import React, { useState, useEffect } from 'react';
import { apiGetSeenBonuses } from '../Shared/ApiClient.js';
import './BonusListDropdown.css';

class BonusListDropdownz extends React.Component {
    constructor(props) {
        super(props);

        this.handleApiReturn = this.handleApiReturn.bind(this);
        this.handleChange = this.handleChange.bind(this);

        this.state = {
            ready: false,
            bonuses: [],
            mapped: [],
            bonus_mappings: undefined,
            collected: {
                ilvl: [],
                socket: [],
                quality: [],
                unknown: [],
                empty: true,
            },
        };

        apiGetSeenBonuses({ item: this.props.item, region: this.props.region }, this.handleApiReturn);
    }

    componentDidUpdate(prevProps) {
        // Typical usage (don't forget to compare props):
        if ((this.props.item !== prevProps.item) || (this.props.region !== prevProps.region)) {
            apiGetSeenBonuses({ item: this.props.item, region: this.props.region }, this.handleApiReturn);
        }
    }

    handleApiReturn(data) {
        if ('ERROR' in data) {
            return;
        }

        this.setState({ collected: data.collected });
        this.setState({ bonuses: data.bonuses });
        this.setState({ mapped: data.mapped });
        this.setState({ raw: data });
    }

    handleChange(event) {
        this.props.handleSelect(event);
    }

    render() {
        return (
            <span>
                {false &&
                    <label>
                        <select>
                            {this.state.mapped.map(bonus => {
                                return (
                                    <option key={bonus.text}>{bonus.reduced}</option>
                                )
                            }
                            )}
                        </select>
                    </label>
                }
                <label>
                    Level
                <select onChange={this.handleChange} name="ilevel" value={this.props.ilevel}>
                        <option value="">Any</option>
                        {this.state.collected.ilvl.map(element => {
                            return (
                                <option key={element.id} value={element.id}>{element.level}</option>
                            );
                        })}
                    </select>
                </label>
                <label>
                    Socket
                    <select name="sockets" onChange={this.handleChange} value={this.props.sockets}>
                        <option value="">Any</option>
                        {this.state.collected.socket.map(element => {
                            return (
                                <option key={element.id} value={element.id}>{element.sockets}</option>
                            )
                        })}
                    </select>
                </label>
                <label>
                    Quality
                <select onChange={this.handleChange} name="quality" value={this.props.quality}>
                        <option value="">Any</option>
                        {this.state.collected.quality.map(element => {
                            return (
                                <option key={element.id} value={element.id}>{element.quality}</option>
                            );
                        })}
                    </select>
                </label>
                {false &&
                    <pre>
                        {JSON.stringify(this.state.raw, undefined, 2)}
                    </pre>
                }
            </span>
        );
    }
}

function BonusListDropdown(props) {
    const [ready, setReady] = useState(false);
    const [bonuses, setBonuses] = useState([]);
    const [mapped, setMapped] = useState([]);
    const [bonus_mappings, setBonusMappings] = useState();
    const [collected, setCollected] = useState({
        ilvl: [],
        socket: [],
        quality: [],
        unknown: [],
        empty: true,
    });
    const [raw, setRaw] = useState();

    useEffect(() => {
        const timer = setTimeout(apiGetSeenBonuses, 1000, { item: props.item, region: props.region }, handleApiReturn);
        //apiGetSeenBonuses({ item: props.item, region: props.region }, handleApiReturn);
        return () => {clearTimeout(timer)};
    }, [props.item, props.region]);

    const handleApiReturn = (data) => {
        if ('ERROR' in data) {
            return;
        }

        setCollected(data.collected);
        setBonuses(data.bonuses);
        setMapped(data.mapped);
        setRaw(data);
    };

    const handleChange = (event) => {
        props.handleSelect(event);
    };

    return (
        <span>
            {false &&
                <label>
                    <select>
                        {mapped.map(bonus => {
                            return (
                                <option key={bonus.text}>{bonus.reduced}</option>
                            )
                        }
                        )}
                    </select>
                </label>
            }
            <label>
                Level
                <select onChange={handleChange} name="ilevel" value={props.ilevel}>
                    <option value="">Any</option>
                    {collected.ilvl.map(element => {
                        return (
                            <option key={element.id} value={element.id}>{element.level}</option>
                        );
                    })}
                </select>
            </label>
            <label>
                Socket
                    <select name="sockets" onChange={handleChange} value={props.sockets}>
                    <option value="">Any</option>
                    {collected.socket.map(element => {
                        return (
                            <option key={element.id} value={element.id}>{element.sockets}</option>
                        )
                    })}
                </select>
            </label>
            <label>
                Quality
                <select onChange={handleChange} name="quality" value={props.quality}>
                    <option value="">Any</option>
                    {collected.quality.map(element => {
                        return (
                            <option key={element.id} value={element.id}>{element.quality}</option>
                        );
                    })}
                </select>
            </label>
            {false &&
                <pre>
                    {JSON.stringify(raw, undefined, 2)}
                </pre>
            }
        </span>
    );
}

export { BonusListDropdown };