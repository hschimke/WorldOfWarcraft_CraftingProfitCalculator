function apiRunCall(run_data, cb) {
    return apiCall('/json_output', run_data, cb);
}

function apiAuctionHistoryFetch(item_data, cb) {
    return apiCall('/auction_history', item_data, cb);
}

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

export { apiRunCall, apiAuctionHistoryFetch };