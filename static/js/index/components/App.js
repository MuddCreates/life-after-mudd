"use strict";

import React from "react";
import LoadingOverlay from "react-loading-overlay";
import { connect } from "react-redux";
import ScaleLoader from "react-spinners/ScaleLoader";

import { failHard } from "../error";
import { store } from "../redux";
import { LoadingStatus } from "../state";
import LoginModal from "./LoginModal";
import MapView from "./MapView";
import Sidebar from "./Sidebar";

// Wrapper component that is rendered at the root. Displays loading
// messages, handles OAuth, wraps the main map app.
class App extends React.Component {
  render() {
    let isLoading = true;
    let text = null;
    switch (this.props.loadingStatus) {
      case LoadingStatus.none:
        isLoading = false;
        break;
      case LoadingStatus.verifyingOAuth:
        text = "Authenticating...";
        break;
      case LoadingStatus.fetchingData:
        text = "Fetching data...";
        break;
      default:
        failHard(`Unknown loading status: ${this.props.loadingStatus}`);
    }
    return (
      <>
        <LoadingOverlay
          active={isLoading}
          spinner={<ScaleLoader />}
          text={text}
          fadeSpeed={0}
          styles={{
            wrapper: { width: "100%", height: "100%" },
            overlay: base => ({ ...base, background: "white" }),
            content: base => ({ ...base, color: "black" }),
          }}
        >
          <MapView />
          {this.props.showingSidebar && <Sidebar />}
        </LoadingOverlay>
        <LoginModal />
      </>
    );
  }
  keyListener(e) {
    if (e.key === "Escape") {
      store.dispatch({
        type: "HIDE_DETAILS",
      });
    }
  }
  componentDidMount() {
    document.addEventListener("keydown", this.keyListener, false);
  }
  componentWillUnmount() {
    document.removeEventListener("keydown", this.keyListener, false);
  }
}

export default connect(state => ({
  loadingStatus: state.loadingStatus,
  showingSidebar: state.displayedResponses !== null,
}))(App);
