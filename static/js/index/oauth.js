"use strict";

import { fetchAction } from "./api";
import { thunk } from "./util";
import Cookies from "js-cookie";

// Check if the session is currently authenticated with the necessary
// permissions. If it is and the UI is currently in an OAuth state,
// move on to fetching the API data. If the UI has already moved on
// from the OAuth states, do nothing. If the session isn't
// authenticated, display the login screen so the user can trigger an
// OAuth flow.
const oauthCheckAuthAction = thunk((dispatch) => {
  dispatch({ type: "VERIFYING_OAUTH" });

  // Only get auth instances if oauth token isn't in cookie
  if (Cookies.get("oauthToken") === undefined) {
    const GoogleAuth = gapi.auth2.getAuthInstance();
    if (GoogleAuth.currentUser.get().hasGrantedScopes("email")) {
      dispatch(fetchAction);
    } else {
      dispatch({ type: "PROMPT_FOR_LOGIN" });
    }
  } else {
    dispatch(fetchAction);
  }
});

// Set up OAuth, check auth status, and arrange for auth status to be
// re-checked when the Google client library says the user has logged
// in.
export const oauthSetupAction = thunk(async (dispatch) => {
  dispatch({ type: "VERIFYING_OAUTH" });

  // Only get auth instances if oauth token isn't in cookie
  if (Cookies.get("oauthToken") === undefined) {
    // https://developers.google.com/identity/protocols/OAuth2UserAgent
    await new Promise((resolve) => gapi.load("client:auth2", resolve));
    await gapi.client.init({
      clientId:
        "548868103597-3th6ihbnejkscon1950m9mm31misvhk9.apps.googleusercontent.com",
      scope: "email",
    });
    const GoogleAuth = gapi.auth2.getAuthInstance();
    GoogleAuth.isSignedIn.listen(() => dispatch(oauthCheckAuthAction));
    dispatch(oauthCheckAuthAction);
  } else {
    dispatch(oauthCheckAuthAction);
  }
});

// Start the OAuth login flow, and update the UI to have some helpful
// info in case the user closes the popup.
export const oauthLoginAction = thunk(async (dispatch) => {
  dispatch({ type: "WAIT_FOR_LOGIN" });
  const GoogleAuth = gapi.auth2.getAuthInstance();
  try {
    await GoogleAuth.signIn({ prompt: "select_account" });
  } catch (error) {
    // e.g., user closed login popup
  }
});
