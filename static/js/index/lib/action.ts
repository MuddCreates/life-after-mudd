import { ResponsePublic, Response } from "./response";
import { SidebarView, LoadingStatus } from "./state";

export const enum ActionType {
  verifyingOauth = "VERIFYING_OAUTH",
  promptForLogin = "PROMPT_FOR_LOGIN",
  waitForLogin = "WAIT_FOR_LOGIN",
  fetchingData = "FETCHING_DATA",
  showData = "SHOW_DATA",
  showDetails = "SHOW_DETAILS",
  hideDetails = "HIDE_DETAILS",
  updateMapViewZoom = "UPDATE_MAP_VIEW_ZOOM",
  windowResized = "WINDOW_RESIZED",
  setEmail = "SET_EMAIL",
  setYear = "SET_YEAR",
}

export type Action =
  | { type: ActionType.verifyingOauth }
  | { type: ActionType.promptForLogin }
  | { type: ActionType.waitForLogin }
  | { type: ActionType.fetchingData }
  | { type: ActionType.showData; responses: Record<string, Response[]> }
  | {
      type: ActionType.showDetails;
      responses: Response[];
      sidebarView: SidebarView;
    }
  | { type: ActionType.hideDetails }
  | { type: ActionType.updateMapViewZoom }
  | { type: ActionType.windowResized }
  | { type: ActionType.setEmail; email: string }
  | { type: ActionType.setYear; year: string };
