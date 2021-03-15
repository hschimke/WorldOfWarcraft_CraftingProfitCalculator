import React, { useState, useEffect, useContext } from 'react';
import { apiGetSeenBonuses } from '../Shared/ApiClient.js';
import { AuctionHistoryDispatch } from './Shared.js';
import './BonusListDropdown.css';

function BonusListDropdown(props) {
    const [bonuses, setBonuses] = useState([]);
    const [mapped, setMapped] = useState([]);
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
        return () => { clearTimeout(timer) };
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

    const dispatch = useContext(AuctionHistoryDispatch);

    const handleChange = (event) => {
        dispatch({ field: event.target.name, value: event.target.value });
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