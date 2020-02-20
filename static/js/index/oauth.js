"use strict";

import { fetchAction } from "./api";
import { store } from "./redux";
import { Screen } from "./state";
import { thunk } from "./util";

// Check if the session is currently authenticated with the necessary
// permissions. If it is and the UI is currently in an OAuth state,
// move on to fetching the API data. If the UI has already moved on
// from the OAuth states, do nothing. If the session isn't
// authenticated, display the login screen so the user can trigger an
// OAuth flow.
const oauthCheckAuthAction = thunk(dispatch => {
  // If we already fetched or started to fetch the data, don't go back
  // to OAuth-land.
  if (
    !(
      store.getState().screen === Screen.oauthVerifying ||
      store.getState().screen === Screen.oauthNeedsLogin ||
      store.getState().screen === Screen.oauthWaitingForLogin
    )
  ) {
    return;
  }
  dispatch({ type: "OAUTH_VERIFYING" });
  const GoogleAuth = gapi.auth2.getAuthInstance();
  if (GoogleAuth.currentUser.get().hasGrantedScopes("email")) {
    dispatch(fetchAction);
  } else {
    dispatch({ type: "OAUTH_PROMPT_FOR_LOGIN" });
  }
});

// Set up OAuth, check auth status, and arrange for auth status to be
// re-checked when the Google client library says the user has logged
// in.
export const oauthSetupAction = thunk(async dispatch => {
  dispatch({ type: "OAUTH_VERIFYING" });
  // https://developers.google.com/identity/protocols/OAuth2UserAgent
  await new Promise(resolve => gapi.load("client:auth2", resolve));
  await gapi.client.init({
    clientId:
      "548868103597-3th6ihbnejkscon1950m9mm31misvhk9.apps.googleusercontent.com",
    scope: "email",
  });
  const GoogleAuth = gapi.auth2.getAuthInstance();
  GoogleAuth.isSignedIn.listen(() => dispatch(oauthCheckAuthAction));
  dispatch(oauthCheckAuthAction);
});

// Start the OAuth login flow, and update the UI to have some helpful
// info in case the user closes the popup.
export const oauthLoginAction = thunk(async dispatch => {
  dispatch({ type: "OAUTH_WAITING_FOR_LOGIN" });
  const GoogleAuth = gapi.auth2.getAuthInstance();
  try {
    await GoogleAuth.signIn();
  } catch (error) {
    // e.g., user closed login popup
  }
});
