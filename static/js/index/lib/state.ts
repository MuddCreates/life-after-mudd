import { inLandscapeMode } from "../util";
import { Response } from "./response";

// Enum that indicates whether a loading spinner is displayed
// overlaying the map, and if so what message is shown.
export const enum LoadingStatus {
  // Nothing is loading.
  none = "none",
  // We are initializing OAuth or verifying the user's access scopes.
  verifyingOAuth = "verifyingOAuth",
  // We are fetching geolocation data from the server.
  fetchingData = "fetchingData",
}

export const enum SidebarView {
  // Show results grouped by location, then organization
  summaryView = "summaryView",
  // Show results grouped by organization, then location
  organizationView = "organizationView",
  // Show detailed info about a particular person
  detailView = "detailView",
}

export interface State {
  loadingStatus: LoadingStatus;
  showingModal: boolean;
  modalWaiting: boolean | null;
  responses: Record<string, Response[]> | null;
  sidebarView: SidebarView;
  displayedResponses: Response[];
  mapViewSerial: number;
  landscape: boolean;
  cachedWindowWidth: number;
  cachedWindowHeight: number;
  email: string | null;
  classYear: string | number | null;
  data: null;
}

// Initial state for the Redux store. Covers the whole app.
export const initialState: State = {
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
  data: null,
};
