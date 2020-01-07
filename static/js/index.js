// https://github.com/parcel-bundler/parcel/issues/871#issuecomment-367899522
import "babel-polyfill";

import React from "react";
import { render } from "react-dom";
import { hot } from "react-hot-loader";
import { Provider } from "react-redux";
import { combineReducers, createStore } from "redux";

import { initMapbox } from "./shared.js";

const defaultState = {};

const reducers = (state = defaultState, action) => state;

const store = createStore(reducers);

class Map extends React.Component {
  render() {
    return (
      <div>
        <div ref={el => (this.mapContainer = el)} className="map" />
      </div>
    );
  }
  componentDidMount() {
    const map = new mapboxgl.Map({
      container: this.mapContainer,
      style: "mapbox://styles/mapbox/streets-v9",
    });
  }
}

class App extends React.Component {
  render() {
    return <Map />;
  }
}

function main() {
  initMapbox();
  render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById("mount"),
  );
}

main();

// https://dev.to/cronokirby/react-typescript-parcel-setting-up-hot-module-reloading-4f3f#setting-up-hmr
export default hot(module)(App);
