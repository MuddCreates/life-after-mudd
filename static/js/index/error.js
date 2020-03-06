"use strict";

import React from "react";
import { render } from "react-dom";

import MessageScreen from "./components/MessageScreen";

// Given anything that could be reasonably interpreted as an error,
// turn it into a string for display to the user.
function getErrorMessage(error) {
  if (!error) {
    return "";
  } else if (typeof error === "string") {
    return error;
  } else if (error instanceof Error) {
    return error.message;
  } else if (
    typeof error.error === "string" &&
    typeof error.details === "string"
  ) {
    return `${error.error}: ${error.details}`;
  } else {
    return `Bizarre error: ${error}`;
  }
}

// Instantly crash the webapp and try to display a human-friendly
// error page. If that fails, fall back to alert(). error can be
// literally anything that seems like an error.
export function failHard(error) {
  console.error("Crashing app due to error:", error);
  try {
    const msg = getErrorMessage(error);
    render(
      MessageScreen(
        <p>
          Sorry, there was a totally unexpected error.{" "}
          {msg ? (
            <span>Here's what we got:</span>
          ) : (
            <span>
              Unfortunately, we don't have any further information. There might
              be some information in your browser's JavaScript console, though.
            </span>
          )}
        </p>,
        msg ? (
          <p>
            <b>{msg}</b>
          </p>
        ) : null,
        msg ? (
          <p>
            <span>
              There might be more information in your browser's JavaScript
              console, as well.
            </span>
          </p>
        ) : null,
        <div style={{ textAlign: "left" }}>
          You can try:
          <ul>
            <li>
              <a href={window.location.origin + window.location.pathname}>
                reloading the page
              </a>
            </li>
            <li>
              <a href="https://github.com/MuddCreates/life-after-mudd/issues">
                filing a bug report on GitHub
              </a>
            </li>
            <li>
              <a href="mailto:rrosborough@hmc.edu">emailing the author</a>
            </li>
          </ul>
        </div>,
      ),
      document.getElementById("app"),
    );
  } catch (newError) {
    alert(
      `An error occurred (${newError}) while trying to display an error message (${error}). Sorry!`,
    );
  }
}
