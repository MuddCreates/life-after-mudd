"use strict";

// Enum that indicates whether a loading spinner is displayed
// overlaying the map, and if so what message is shown.
export const LoadingStatus = Object.freeze({
  // Nothing is loading.
  none: "none",
  // We are initializing OAuth or verifying the user's access scopes.
  verifyingOAuth: "verifyingOAuth",
  // We are fetching geolocation data from the server.
  fetchingData: "fetchingData",
});

// Enum for what geotags are displayed on the map.
export const GeotagView = Object.freeze({
  // org || city || summerOrg || summerCity
  standard: "standard",
});

// Initial state for the Redux store. Covers the whole app.
export const initialState = {
  loadingStatus: LoadingStatus.none,
  showingModal: false,
  modalWaiting: null,
  responses: null,
  geotagView: GeotagView.standard,
  displayedResponses: null,
};

// Global reducer for the app's Redux store.
export const reducer = (state = initialState, action) => {
  switch (action.type) {
    case "VERIFYING_OAUTH":
      return { ...state, loadingStatus: LoadingStatus.verifyingOAuth };
    case "PROMPT_FOR_LOGIN":
      return {
        ...state,
        loadingStatus: LoadingStatus.none,
        showingModal: true,
        modalWaiting: false,
      };
    case "WAIT_FOR_LOGIN":
      return { ...state, modalWaiting: true };
    case "FETCHING_DATA":
      return {
        ...state,
        loadingStatus: LoadingStatus.fetchingData,
        showingModal: false,
        modalWaiting: null,
      };
    case "SHOW_DATA":
      return {
        ...state,
        loadingStatus: LoadingStatus.none,
        responses: action.responses,
        displayedResponses: null,
      };
    case "SHOW_DETAILS":
      return {
        ...state,
        displayedResponses: action.responses,
      };
    case "HIDE_DETAILS":
      return {
        ...state,
        displayedResponses: null,
      };
    default:
      return state;
  }
};
