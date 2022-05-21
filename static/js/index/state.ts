import * as $ from "jquery";

import { ResponsePublic } from "./lib/response";
import { State, LoadingStatus, initialState } from "./lib/state";
import { Action } from "./lib/action";

import {
  allowResizingWindow,
  inLandscapeMode,
  findClassYearByEmail,
} from "./util";

let wasSearchPreviouslyFocused = false;

// Global reducer for the app's Redux store.
export const reducer = (state = initialState, action: Action): State => {
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
