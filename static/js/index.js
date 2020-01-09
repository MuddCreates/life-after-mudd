// https://github.com/parcel-bundler/parcel/issues/871#issuecomment-367899522
import "babel-polyfill";

import React from "react";
import { render } from "react-dom";
import { hot } from "react-hot-loader";
import { connect, Provider } from "react-redux";
import {
  applyMiddleware,
  bindActionCreators,
  combineReducers,
  createStore,
} from "redux";
import thunk from "redux-thunk";

import { initMapbox } from "./shared.js";

function decapitalize(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

function mapCallWhenReady(map, cb) {
  // https://github.com/mapbox/mapbox-gl-directions/issues/111
  if (map._loaded) {
    cb();
  } else {
    map.on("load", cb);
  }
}

const initialState = {
  fetching: false,
  fetchError: null,
  responses: null,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case "FETCH_PENDING":
      return { ...state, fetching: true, fetchError: null, responses: null };
    case "FETCH_SUCCESS":
      return {
        ...state,
        fetching: false,
        fetchError: null,
        responses: action.responses,
      };
    case "FETCH_ERROR":
      return {
        ...state,
        fetching: false,
        fetchError: action.error,
        responses: null,
      };
    default:
      return state;
  }
};

const store = createStore(reducer, initialState, applyMiddleware(thunk));

function fetchResponsesAction() {
  return async dispatch => {
    dispatch({
      type: "FETCH_PENDING",
    });
    try {
      const response = await fetch("/api/v1/data");
      if (!response.ok) {
        throw new Error(`Got status ${response.status} from API`);
      }
      const responses = await response.json();
      dispatch({
        type: "FETCH_SUCCESS",
        responses,
      });
    } catch (error) {
      dispatch({
        type: "FETCH_ERROR",
        error: error.message,
      });
    }
  };
}

class Map extends React.Component {
  render() {
    return (
      <div>
        <div
          ref={el => (this.mapContainer = el)}
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            bottom: "0",
            right: "0",
          }}
        />
      </div>
    );
  }
  componentDidMount() {
    const map = new mapboxgl.Map({
      container: this.mapContainer,
      style: "mapbox://styles/mapbox/streets-v9",
      center: [-97, 38],
      zoom: 4.3,
    });
    this.map = map;
    window.map = map;
    this.renderLandmarks();
  }
  componentDidUpdate() {
    this.renderLandmarks();
  }
  renderLandmarks() {
    mapCallWhenReady(this.map, () => {
      if (this.map.getLayer("people")) {
        this.map.removeLayer("people");
      }
      if (this.map.getSource("people")) {
        this.map.removeSource("people");
      }
      if (this.props.responses === null) {
        return;
      }
      this.map.addLayer({
        id: "people",
        type: "symbol",
        source: {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: this.props.responses.map(response => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [
                  parseFloat(response.cityLong),
                  parseFloat(response.cityLat),
                ],
              },
            })),
          },
        },
        layout: {
          "icon-image": "circle-15",
        },
      });
    });
  }
}

Map = connect(state => ({
  responses: state.responses,
}))(Map);

class App extends React.Component {
  render() {
    if (this.props.fetching) {
      return (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <center>
            <div
              style={{
                marginBottom: "5px",
              }}
            >
              <div className="spinner-border"></div>
            </div>
            <p>Loading, please wait.</p>
          </center>
        </div>
      );
    } else if (this.props.fetchError !== null) {
      return (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <p>
            Sorry, couldn't fetch the data (
            {decapitalize(this.props.fetchError)}).
          </p>
          <p>
            Try reloading the page, or contact{" "}
            <a href="mailto:rrosborough@hmc.edu">Radon Rosborough</a>.
          </p>
        </div>
      );
    } else if (this.props.responses !== null) {
      return <Map />;
    } else {
      return <div></div>;
    }
  }
}

App = connect(state => ({
  fetching: state.fetching,
  fetchError: state.fetchError,
  responses: state.responses,
}))(App);

async function main() {
  initMapbox();
  render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById("app"),
  );
  store.dispatch(fetchResponsesAction());
}

main().catch(console.error);

// https://dev.to/cronokirby/react-typescript-parcel-setting-up-hot-module-reloading-4f3f#setting-up-hmr
export default hot(module)(App);
