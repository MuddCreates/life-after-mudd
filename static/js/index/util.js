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

// XXX: Horrifying hack. On Android there is a bug that affects at
// least Chrome and Firefox where the viewport gets resized when
// the on-screen keyboard comes up (which happens when you focus
// any text input). This looks like trash because it breaks a bunch of
// pieces of CSS and causes stuff to resize. No such issue on
// iOS. We hack it by just freezing the app's height on load and then
// hardcoding that height into all of our generated CSS, but only on
// Android (otherwise we use proper CSS). Thanks, Google.
export function allowResizingWindow() {
  return navigator.userAgent.toLowerCase().indexOf("android") === -1;
}

export const findClassYearByEmail = (data, email) => {
  for (const year in data) {
    for (const response of data[year]) {
      if (response.email == email) return parseInt(year, 10);
    }
  }
  // fallback: if no match, return latest
  return Math.max(...Object.keys(data).map((s) => parseInt(s, 10)));
};
