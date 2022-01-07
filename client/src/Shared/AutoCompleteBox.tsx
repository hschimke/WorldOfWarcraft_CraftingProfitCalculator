import React, { MouseEventHandler, Suspense, useEffect, useState, useTransition } from "react";
import { fetchPromiseWrapper } from "./ApiClient"

export type AutoCompleteAgg = { read: () => (string[] | undefined) };

function AutoCompleteBox({ source, filter, onSelect, currentValue, targetField }: { targetField: string, source: string, currentValue: string, filter?: string, onSelect:  (field:string,value:string) => void }) {
    const visible = useState(false);
    const [isLoading, onBatch] = useTransition();
    const [list, setList] = useState({ read: () => { return undefined; } } as AutoCompleteAgg);

    useEffect(() => {
        const timer = setTimeout(() => {
            onBatch(() => {
                const endPoint = `${source}${filter !== undefined ? '?' + filter + '=' + encodeURIComponent(currentValue) : ''}`;
                setList(fetchPromiseWrapper<string[]>(endPoint));
            })
        }, 1000);

        return () => {
            clearTimeout(timer);
        }
    }, [currentValue]);

    const onClick = (event: string) => {
        onSelect(targetField,event);
    };

    return <ul>
        <Suspense fallback={null}>
            <ItemList items={list} onSelect={onClick} />
        </Suspense>
    </ul>
}

function ItemList({ items, onSelect }: { items: AutoCompleteAgg, onSelect: (event: string) => void }) {
    const item_list = items.read();
    if (item_list === undefined) {
        return null;
    }

    return <>
        {item_list.map((z) => {
            return <li key={z} onClick={() => {
                onSelect(z);
            }}>{z}</li>
        })}
    </>
}

export { AutoCompleteBox };