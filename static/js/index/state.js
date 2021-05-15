"use strict";

import $ from "jquery";

import {
  allowResizingWindow,
  inLandscapeMode,
  findClassYearByEmail,
} from "./util";

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
  // Cached window size, pixels.
  cachedWindowWidth: window.innerWidth,
  cachedWindowHeight: window.innerHeight,
  // Email address of authenticated user.
  email: null,
  // Detected class year of authenticated user.
  classYear: null,
};

let wasSearchPreviouslyFocused = false;

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
        // update class-year only if not already manually set
        classYear:
          state.classYear ||
          (state.email && findClassYearByEmail(action.responses, state.email)),
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
      const searchFocused = $("#searchInput").is(":focus");
      // XXX: Horrifying hack. On Android there is a bug that affects at
      // least Chrome and Firefox where the viewport gets resized when
      // the on-screen keyboard comes up (which happens when you focus
      // any text input). This looks like trash because it breaks a bunch of
      // pieces of CSS and causes stuff to resize. No such issue on
      // iOS. We hack it by basing our calculations on a cached window
      // size and then hardcoding that size into all of our generated
      // CSS, but only on Android (otherwise we use proper CSS). Also,
      // by checking whether the search bar is focused before and
      // after a window resize, we conditionally update the cached
      // window size, so that the user can switch between portrait and
      // landscape mode properly. Thanks, Google.
      if (
        allowResizingWindow() ||
        searchFocused === wasSearchPreviouslyFocused
      ) {
        state = {
          ...state,
          landscape: inLandscapeMode(),
          cachedWindowWidth: window.innerWidth,
          cachedWindowHeight: window.innerHeight,
        };
      }
      wasSearchPreviouslyFocused = searchFocused;
      return state;
    case "SET_EMAIL":
      return {
        ...state,
        email: action.email,
        // update class-year only if not already manually set
        classYear:
          state.classYear ||
          (state.data && findClassYearByEmail(state.data, action.email)),
      };
    case "SET_YEAR":
      return { ...state, classYear: action.year };
    default:
      return state;
  }
};
