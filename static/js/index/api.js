"use strict";

import { thunk } from "./util";

// Given a latitude and longitude (in reverse order), where both
// values are strings, parse them into floats and return an object
// with keys long and lat. If either parsing fails, return null
// instead.
function parseLatLong(long, lat) {
  const longF = parseFloat(long);
  const latF = parseFloat(lat);
  if (!Number.isNaN(longF) && !Number.isNaN(latF)) {
    return { lng: longF, lat: latF };
  } else {
    return null;
  }
}

// Given the list of responses from the API, return a cleaned-up
// version suitable for use on the frontend. May reuse storage of the
// original objects and array.
function cleanResponses(responses) {
  responses.map((response, idx) => {
    response.cityLatLong = parseLatLong(response.cityLong, response.cityLat);
    response.orgLatLong = parseLatLong(response.orgLong, response.orgLat);
    response.summerCityLatLong = parseLatLong(
      response.summerCityLong,
      response.summerCityLat,
    );
    response.summerOrgLatLong = parseLatLong(
      response.summerOrgLong,
      response.summerOrgLat,
    );
    response.idx = idx;
  });
  return responses;
}

// Make the UI say it's fetching the data. Then make an API request.
// Once it returns, clean it up and show the data on the map in the
// UI.
export const fetchAction = thunk(async (dispatch) => {
  dispatch({ type: "FETCHING_DATA" });
  const GoogleAuth = gapi.auth2.getAuthInstance();
  const oauthToken = GoogleAuth.currentUser.get().getAuthResponse().id_token;
  const response = await fetch("/api/v1/data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      oauthToken,
    }),
  });
  if (!response.ok) {
    let explanation = "";
    try {
      explanation = ": " + (await response.text());
    } catch (e) {
      // If stream is interrupted, forget about getting an
      // explanation. Who does that server think it is, anyway? We
      // don't need it anyway.
    }
    throw new Error(`Got status ${response.status} from API` + explanation);
  }
  const responses = cleanResponses(await response.json());
  dispatch({
    type: "SHOW_DATA",
    responses,
  });
});
