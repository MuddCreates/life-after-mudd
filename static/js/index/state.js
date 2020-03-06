"use strict";

// Enum for the finite-state machine that represents different states
// the UI can be in.
export const Screen = Object.freeze({
  // Nothing displayed. Used until the first Redux action is
  // processed.
  initial: "initial",
  // Checking to see if the user is successfully authenticated.
  oauthVerifying: "oauthVerifying",
  // Displaying a login button because the user needs to sign in with
  // OAuth.
  oauthNeedsLogin: "oauthNeedsLogin",
  // Waiting for the user to complete the OAuth flow in another
  // window. Displaying a link to re-open the flow if they close it.
  oauthWaitingForLogin: "oauthWaitingForLogin",
  // Fetching API data.
  fetching: "fetching",
  // Displaying the main app.
  map: "map",
});

// Enum for what geotags are displayed on the map.
export const GeotagView = Object.freeze({
  // org || city || summerOrg || summerCity
  standard: "standard",
});

// Initial state for the Redux store. Covers the whole app.
export const initialState = {
  screen: Screen.initial,
  responses: null,
  geotagView: GeotagView.standard,
  displayedResponses: null,
  popupCoords: null,
};

// Global reducer for the app's Redux store.
export const reducer = (state = initialState, action) => {
  switch (action.type) {
    case "OAUTH_VERIFYING":
      return { ...state, screen: Screen.oauthVerifying };
    case "OAUTH_PROMPT_FOR_LOGIN":
      return { ...state, screen: Screen.oauthNeedsLogin };
    case "OAUTH_WAITING_FOR_LOGIN":
      return { ...state, screen: Screen.oauthWaitingForLogin };
    case "FETCHING":
      return { ...state, screen: Screen.fetching };
    case "SHOW_DATA":
      return { ...state, screen: Screen.map, responses: action.responses };
    case "SHOW_DETAILS":
      return {
        ...state,
        displayedResponses: action.responses,
        popupCoords: action.coords,
      };
    case "HIDE_DETAILS":
      return {
        ...state,
        displayedResponses: null,
        popupCoords: null,
      };
    default:
      return state;
  }
};
