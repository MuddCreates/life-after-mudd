"use strict";

import { minLandscapeWidth, sidebarWidthFraction } from "./config";
import { failHard } from "./error";

// Given a Redux action, wrap it with error handling so that if an
// exception occurs, the app crashes and displays an error message.
// Works with both synchronous and asynchronous actions.
export function thunk(action) {
  return (dispatch) => {
    try {
      let result = action(dispatch);
      // https://stackoverflow.com/a/38339199/3538165
      if (Promise.resolve(result) === result) {
        result = result.catch(failHard);
      }
      return result;
    } catch (error) {
      failHard(error);
    }
  };
}

// Return true if the browser is in landscape mode, false otherwise.
export function inLandscapeMode() {
  return (
    window.matchMedia("(orientation: landscape)").matches &&
    window.innerWidth * (1 - sidebarWidthFraction) >= minLandscapeWidth
  );
}
