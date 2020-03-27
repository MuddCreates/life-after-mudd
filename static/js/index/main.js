"use strict";

// https://github.com/parcel-bundler/parcel/issues/871#issuecomment-367899522
// https://babeljs.io/docs/en/next/babel-polyfill.html
import "regenerator-runtime/runtime";

import React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

import App from "./components/App";
import { failHard } from "./error";
import { oauthSetupAction } from "./oauth";
import { store } from "./redux";

async function main() {
  render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById("app"),
  );
  await store.dispatch(oauthSetupAction);
}

window.addEventListener("error", (event) => {
  failHard(event.error);
});
main().catch(failHard);

// Fix Parcel's broken HMR, see
// <https://github.com/parcel-bundler/parcel/issues/3299#issuecomment-518919533>.
if (module.hot) {
  module.hot.dispose(() => {});
  module.hot.accept(() => {});
}
