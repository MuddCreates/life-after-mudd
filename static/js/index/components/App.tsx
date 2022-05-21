import * as FastClick from "fastclick";
import "inobounce";
import $ from "jquery";
import * as React from "react";
import LoadingOverlay from "react-loading-overlay-ts";
import { connect } from "react-redux";
import ScaleLoader from "react-spinners/ScaleLoader";

import { failHard } from "../error";

import { useDispatch, useSelector } from "../hooks/redux";
import { store } from "../redux";
import { LoadingStatus } from "../lib/state";
import LoginModal from "./LoginModal";
import MapView from "./MapView";
import SearchBar from "./SearchBar";
import Sidebar from "./Sidebar";

import { ActionType } from "../lib/action";

const loadingDisplay = (status: LoadingStatus) => {
  switch (status) {
    case LoadingStatus.none:
      return { isLoading: false, text: "" };
    case LoadingStatus.verifyingOAuth:
      return { isLoading: true, text: "Authenticating..." };
    case LoadingStatus.fetchingData:
      return { isLoading: true, text: "Fetching data..." };
  }
};

// Wrapper component that is rendered at the root. Displays loading
// messages, handles OAuth, wraps the main map app.
const App = () => {
  const mapRef = React.useRef<mapboxgl.Map>();

  const loadingStatus = useSelector((state) => state.loadingStatus);
  const showingSidebar = useSelector(
    (state) => state.displayedResponses !== null,
  );

  React.useEffect(() => {
    document.addEventListener("keydown", keyListener, false);
    window.addEventListener("resize", resizeListener);
    // ??? <https://github.com/ftlabs/fastclick/issues/398>
    FastClick.FastClick.attach(document.body);

    return () => {
      document.removeEventListener("keydown", keyListener, false);
    };
  }, []);

  const dispatch = useDispatch();

  const keyListener = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") dispatch({ type: ActionType.hideDetails });
  };
  const resizeListener = () => {
    dispatch({ type: ActionType.windowResized });
  };

  const { isLoading, text } = loadingDisplay(loadingStatus);

  return (
    <div style={{ overflow: "hidden" }}>
      <LoadingOverlay
        active={isLoading}
        spinner={<ScaleLoader />}
        text={text}
        fadeSpeed={0}
        styles={{
          wrapper: (base) => ({
            ...base,
            position: "absolute",
            width: "100%",
            height: "100%",
          }),
          overlay: (base) => ({ ...base, background: "white" }),
          content: (base) => ({ ...base, color: "black" }),
          spinner: (base) => base,
        }}
      >
        <MapView ref={mapRef} />
        <SearchBar mapRef={mapRef} />
        {showingSidebar && <Sidebar />}
      </LoadingOverlay>
      <LoginModal />
    </div>
  );
};

export default App;
