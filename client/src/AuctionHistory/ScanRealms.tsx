import {useEffect, useState} from 'react';
import {BugReportLink} from '../Shared/Links';
import './ScanRealms.css';

export function ScanRealms(){
    const [result, updateResult] = useState<{ realm_names: string, realm_id: ConnectedRealmID, region: RegionCode }[]>([]);

    useEffect(()=>{
        fetch('/scanned_realms').then((data) => {
            data.json().then((realms:{ realm_names: string, realm_id: ConnectedRealmID, region: RegionCode }[]) => {
                updateResult(realms);
            } );
        })
    });

    return <div id="ScanRealmsList">
        <p>You can enter any realm or region in the search box but you won't get any results unless it is one of the ones listed below.
            If you would like to have you realm added to the scan list, please <BugReportLink text="let us known" />.
        </p>
        Scanning is enabled on the following realms:
        <ul>
            {result.map((scan_target) => {
                return(<li key={scan_target.realm_id}>{scan_target.realm_names.slice(2)} in {scan_target.region}</li>);
            })}
        </ul>
    </div>;
}