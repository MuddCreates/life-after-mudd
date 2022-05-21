"use strict";

import Cookies from "js-cookie";

import { oauthSetupAction } from "./oauth";
import { thunk } from "./util";
import { ActionType } from "./lib/action";

import { ApiResponse, Response } from "./lib/response";

// Given a latitude and longitude (in reverse order), where both
// values are strings, parse them into floats and return an object
// with keys long and lat. If either parsing fails, return null
// instead.
const parseLatLong = (long: string, lat: string) => {
  const longF = parseFloat(long);
  const latF = parseFloat(lat);
  return !Number.isNaN(longF) && !Number.isNaN(latF)
    ? { lng: longF, lat: latF }
    : null;
};

// Given the list of responses from the API, return a cleaned-up
// version suitable for use on the frontend. May reuse storage of the
// original objects and array.
const cleanResponses = (
  responses: Record<string, ApiResponse[]>,
): Record<string, Response[]> =>
  Object.fromEntries(
    Object.entries(responses).map(([year, batch]) => [
      year,
      batch.map((response, idx) => ({
        ...response,
        idx,
        cityLatLong: parseLatLong(response.cityLong, response.cityLat),
        orgLatLong: parseLatLong(response.orgLong, response.orgLat),
        summerCityLatLong: parseLatLong(
          response.summerCityLong,
          response.summerCityLat,
        ),
        summerOrgLatLong: parseLatLong(
          response.summerOrgLong,
          response.summerOrgLat,
        ),
      })),
    ]),
  );

// Make the UI say it's fetching the data. Then make an API request.
// Once it returns, clean it up and show the data on the map in the
// UI.
export const fetchAction = thunk(async (dispatch) => {
  dispatch({ type: ActionType.fetchingData });

  let oauthToken = Cookies.get("oauthToken");
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
    let err = null;
    try {
      err = await response.text();
      explanation = ": " + err;
    } catch (e) {
      // If stream is interrupted, forget about getting an
      // explanation. Who does that server think it is, anyway? We
      // don't need it anyway.
    }

    // Delete OAuth token in case it caused the error
    Cookies.remove("oauthToken");

    // Handle a bad OAuth token cookie by rerunning the oauthSetupAction phase
    if (err?.startsWith("Bad token")) {
      dispatch(oauthSetupAction);
    } else {
      throw new Error(`Got status ${response.status} from API` + explanation);
    }
  } else {
    const { responses, email } = await response.json();
    const newResponses = cleanResponses(responses);
    dispatch({
      type: ActionType.setEmail,
      email,
    });
    dispatch({
      type: ActionType.showData,
      responses: newResponses,
    });
  }
});
