"use strict";

import { allowResizingWindow, inLandscapeMode } from "./util";

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

export const SidebarView = Object.freeze({
  // Show results grouped by location, then organization
  summaryView: "summaryView",
  // Show results grouped by organization, then location
  organizationView: "organizationView",
  // Show detailed info about a particular person
  detailView: "detailView",
});

// Initial state for the Redux store. Covers the whole app.
export const initialState = {
  // Whether a loading indicator should be shown, and if so what the
  // message should be.
  loadingStatus: LoadingStatus.none,
  // Whether we're currently showing the login modal.
  showingModal: false,
  // Whether the login modal is waiting for the user to finish the
  // OAuth flow. If false, the user hasn't started the flow yet.
  modalWaiting: null,
  // List of objects. As retrieved from the API, with some minor
  // touch-ups. Each object has an idx key which can be used as a uid.
  responses: null,
  // What info is shown in the sidebar
  sidebarView: SidebarView.summaryView,
  // List of responses that are displayed. They can optionally be
  // augmented with keys 'showLongTerm' and 'showSummer' which, if
  // present, control whether the long-term and summer plans
  // respectively are shown. By default both are shown.
  displayedResponses: null,
  // Incremented when we want to the map view to adjust its zoom
  // position (happens when we do a search).
  mapViewSerial: 0,
  // Whether the browser is in landscape mode.
  landscape: inLandscapeMode(),
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
        sidebarView: action.sidebarView,
      };
    case "HIDE_DETAILS":
      return {
        ...state,
        displayedResponses: null,
      };
    case "UPDATE_MAP_VIEW_ZOOM":
      return {
        ...state,
        mapViewSerial: state.mapViewSerial + 1,
      };
    case "WINDOW_RESIZED":
      if (allowResizingWindow()) {
        state = {
          ...state,
          landscape: inLandscapeMode(),
        };
      }
      return state;
    default:
      return state;
  }
};
