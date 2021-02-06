"use strict";

import Cookies from "js-cookie";
import { v4 as getUUID } from "uuid";

import { fetchAction } from "./api";
import { thunk } from "./util";

// Set up OAuth, check auth status, and arrange for auth status to be
// re-checked when the Google client library says the user has logged
// in.
export const oauthSetupAction = thunk(async (dispatch) => {
  if (Cookies.get("oauthToken") === undefined) {
    dispatch({ type: "PROMPT_FOR_LOGIN" });
  } else {
    dispatch(fetchAction);
  }
});

// Start the OAuth login flow, and update the UI to have some helpful
// info in case the user closes the popup.
export const oauthLoginAction = thunk(async (dispatch) => {
  dispatch({ type: "WAIT_FOR_LOGIN" });

  // https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#javascript-sample-code
  //
  // We're making a GET request using a <form> element because... some
  // kind of bizarre hack around CORS restrictions? Dunno, that's what
  // Google told me to do.

  const form = document.createElement("form");
  form.setAttribute("method", "GET");
  form.setAttribute("action", "https://accounts.google.com/o/oauth2/v2/auth");

  const params = {
    client_id:
      "548868103597-3th6ihbnejkscon1950m9mm31misvhk9.apps.googleusercontent.com",
    redirect_uri: document.location.origin + "/oauth",
    response_type: "id_token",
    nonce: getUUID(),
    scope: "email",
  };

  for (const [key, value] of Object.entries(params)) {
    const input = document.createElement("input");
    input.setAttribute("type", "hidden");
    input.setAttribute("name", key);
    input.setAttribute("value", value);
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
});
