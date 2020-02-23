"use strict";

import { oauthLoginAction } from "../oauth";
import React from "react";
import { connect } from "react-redux";

import { failHard } from "../error";
import { store } from "../redux";
import { Screen } from "../state";
import MapView from "./MapView";
import MessageScreen from "./MessageScreen";

// Higher-order component that displays a loading spinner and a
// message.
function LoadingScreen(message) {
  return MessageScreen(
    <div
      style={{
        marginBottom: "5px",
      }}
    >
      <div className="spinner-border"></div>
    </div>,
    <p>{message}</p>,
  );
}

// Wrapper component that is rendered at the root. Displays loading
// messages, handles OAuth, wraps the main map app.
class App extends React.Component {
  render() {
    switch (this.props.screen) {
      case Screen.initial:
        return null;
      case Screen.oauthVerifying:
        return LoadingScreen("Authorizing your session...");
      case Screen.oauthNeedsLogin:
        return MessageScreen(
          <p>All data is private to the HMC Class of 2020.</p>,
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => store.dispatch(loginAction)}
          >
            Sign in with your HMC Google Account
          </button>,
        );
      case Screen.oauthWaitingForLogin:
        return MessageScreen(
          <p>
            Waiting for you to log in with Google. If you close the login
            window,{" "}
            <a
              href="#"
              onClick={event => {
                store.dispatch(oauthLoginAction);
                event.preventDefault();
              }}
            >
              click here
            </a>{" "}
            to open another one.
          </p>,
        );
      case Screen.fetching:
        return LoadingScreen("Fetching geolocation data...");
      case Screen.map:
        return <MapView />;
      default:
        failHard(new Error(`Unknown screen state: ${this.props.screen}`));
        return null;
    }
  }
}

export default connect(state => ({ screen: state.screen }))(App);
