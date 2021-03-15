import { useState, useEffect, useReducer } from 'react';

function apiGetSeenBonuses(payload, cb) {
    if (payload.item !== undefined && payload.item.length > 0) {
        return apiCall('/seen_item_bonuses', payload, cb);
    } else {
        return { 'ERROR': 'Empty' };
    }
}

function useFetchHistoryApi() {
    return useFetchApi('/auction_history');
}

function useFetchCPCApi() {
    return useFetchApi('/json_output');
}

const dataFetchReducer = (state, action) => {
    switch (action.type) {
        case 'FETCH_INIT':
            return {
                ...state,
                isLoading: true,
                isError: false,
            };
        case 'FETCH_SUCCESS':
            return {
                ...state,
                isLoading: false,
                isError: false,
                data: action.payload,
            };
        case 'FETCH_FAILURE':
            return {
                ...state,
                isLoading: false,
                isError: true,
            };
        default:
            throw new Error();
    }
};

function useFetchApi(endpoint) {
    const [payload, setPayload] = useState();
    const [state, dispatch] = useReducer(dataFetchReducer, {
        isLoading: false,
        isError: false,
        data: undefined,
    });
    useEffect(() => {
        let didCancel = false;

        const fetchData = async () => {
            dispatch({ type: 'FETCH_INIT' });

            try {
                const fetched_response = await fetch(endpoint, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                const status_checked_response = checkStatus(fetched_response);
                const json_data = await parseJSON(status_checked_response);

                if (!didCancel) {
                    dispatch({ type: 'FETCH_SUCCESS', payload: json_data });
                }
            } catch (error) {
                if (!didCancel) {
                    dispatch({ type: 'FETCH_FAILURE' });
                }
            }
        };
        if (payload !== undefined) {
            fetchData();
        }
        return () => {
            didCancel = true;
        };
    }, [payload, endpoint]);
    return [state, setPayload];
}

function useSeenBonusesApi(item, region, realm) {
    const [state, dispatch] = useReducer(dataFetchReducer, {
        isLoading: false,
        isError: false,
        data: undefined,
    });

    useEffect(() => {
        let didCancel = false;
        const payload = { item: item, region: region, realm: realm };

        const fetchData = async () => {
            dispatch({ type: 'FETCH_INIT' });

            try {
                const fetched_response = await fetch('/seen_item_bonuses', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                const status_checked_response = checkStatus(fetched_response);
                const json_data = await parseJSON(status_checked_response);

                if (!didCancel) {
                    dispatch({ type: 'FETCH_SUCCESS', payload: json_data });
                }
            } catch (error) {
                if (!didCancel) {
                    dispatch({ type: 'FETCH_FAILURE' });
                }
            }
        };
        const timer = setTimeout(() => {
            if (payload !== undefined && payload.item.length > 0) {
                fetchData();
            }
        }, 1000);
        return () => {
            clearTimeout(timer);
            didCancel = true;
        };
    }, [item, region, realm]);
    return [state];
};

function apiCall(end_point, data, cb) {
    return fetch(end_point, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
        },
    }).then(checkStatus)
        .then(parseJSON)
        .then(cb);
}

function checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
        return response;
    }
    const error = new Error(`HTTP Error ${response.statusText}`);
    error.status = response.statusText;
    error.response = response;
    console.log(error); // eslint-disable-line no-console
    throw error;
}

function parseJSON(response) {
    return response.json();
}

export { apiGetSeenBonuses, useFetchHistoryApi, useFetchApi, useFetchCPCApi, useSeenBonusesApi };