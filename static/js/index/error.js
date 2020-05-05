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

let alreadyCrashed = false;

// Instantly crash the webapp and try to display a human-friendly
// error page. If that fails, fall back to alert(). error can be
// literally anything that seems like an error.
export function failHard(error) {
  if (alreadyCrashed) {
    return;
  } else {
    alreadyCrashed = true;
  }
  console.error("Crashing app due to error:", error);
  try {
    const msg = getErrorMessage(error);
    const tips = (also) => (
      <div style={{ textAlign: "left" }}>
        You can {also ? "also" : ""} try:
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
            <a href="mailto:rrosborough@hmc.edu">emailing me</a>
          </li>
        </ul>
      </div>
    );
    let elt;
    if (msg === "Failed to initialize WebGL.") {
      elt = MessageScreen(
        <div style={{ textAlign: "left" }}>
          <p>
            Sorry, but we couldn't initialize the map because your browser is
            not handling WebGL correctly. If you are running Firefox on a
            recently updated Arch-based Linux distribution, then this is
            probably because of a bug that was recently introduced into Firefox.
            You can work around the issue either by switching to a different
            browser or by following these steps:
          </p>
          <ul>
            <li>Type "about:config" into the URL bar</li>
            <li>Click "Accept the Risk and Continue"</li>
            <li>Search for "security.sandbox.content.read_path_whitelist"</li>
            <li>Type in "/sys/" to the value box</li>
            <li>Restart Firefox</li>
          </ul>
          <p>
            For more information on the bug, see{" "}
            <a href="https://bbs.archlinux.org/viewtopic.php?pid=1801935#p1801935">
              this forum post
            </a>
            .
          </p>
        </div>,
        tips(true),
      );
    } else {
      elt = MessageScreen(
        <p>
          Sorry, there was an unexpected error.{" "}
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
        tips(false),
      );
    }
    try {
      document.getElementById("app").remove();
    } catch (_) {
      // whatever
    }
    render(elt, document.getElementById("error"));
  } catch (newError) {
    alert(
      `An error occurred (${newError}) while trying to display an error message (${error}). Sorry!`,
    );
  }
  throw "error raised in order to break control flow";
}
