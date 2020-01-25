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
  compose,
  createStore,
} from "redux";
import thunkMiddleware from "redux-thunk";

import { initMapbox } from "./shared.js";

function mapCallWhenReady(map, cb) {
  // https://github.com/mapbox/mapbox-gl-directions/issues/111
  if (map._loaded) {
    cb();
  } else {
    map.on("load", cb);
  }
}

const initialState = {
  catastrophicError: null,
  auth: {
    setupInProgress: false,
    loginInProgress: false,
    loggedIn: null,
  },
  fetch: {
    inProgress: false,
    finished: false,
  },
  responses: null,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case "CATASTROPHIC_ERROR":
      return { ...state, catastrophicError: action.error };
    case "OAUTH_SETUP_IN_PROGRESS":
      return {
        ...state,
        auth: { ...state.auth, setupInProgress: true, loggedIn: null },
      };
    case "OAUTH_LOGGED_IN":
      return {
        ...state,
        auth: {
          ...state.auth,
          setupInProgress: false,
          loginInProgress: false,
          loggedIn: true,
        },
      };
    case "OAUTH_NOT_LOGGED_IN":
      return {
        ...state,
        auth: {
          ...state.auth,
          setupInProgress: false,
          loginInProgress: false,
          loggedIn: false,
        },
      };
    case "OAUTH_LOGIN_IN_PROGRESS":
      return {
        ...state,
        auth: { ...state.auth, loginInProgress: true, loggedIn: null },
      };
    case "RESPONSES_FETCH_IN_PROGRESS":
      return {
        ...state,
        fetch: { ...state.fetch, inProgress: true, finished: false },
        responses: null,
      };
    case "RESPONSES_FETCHED":
      return {
        ...state,
        fetch: { ...state.fetch, inProgress: false, finished: true },
        responses: action.responses,
      };
    default:
      return state;
  }
};

function failHard(error) {
  if (error.message) {
    console.error(error);
  }
  store.dispatch({ type: "CATASTROPHIC_ERROR", error });
}

const store = createStore(
  reducer,
  initialState,
  compose(
    applyMiddleware(thunkMiddleware),
    window.__REDUX_DEVTOOLS_EXTENSION__ &&
      window.__REDUX_DEVTOOLS_EXTENSION__(),
  ),
);

function thunk(action) {
  return dispatch => {
    try {
      let result = action(dispatch);
      // https://stackoverflow.com/a/38339199/3538165
      if (Promise.resolve(result) === result) {
        result = result.catch(failHard);
      }
      return result;
    } catch (error) {
      failHard(error);
    }
  };
}

const fetchResponsesAction = thunk(async dispatch => {
  dispatch({
    type: "RESPONSES_FETCH_IN_PROGRESS",
  });
  const GoogleAuth = gapi.auth2.getAuthInstance();
  const oauthToken = GoogleAuth.currentUser.get().getAuthResponse().id_token;
  const response = await fetch("/api/v1/data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      oauthToken,
    }),
  });
  if (!response.ok) {
    throw new Error(`Got status ${response.status} from API`);
  }
  const responses = await response.json();
  dispatch({
    type: "RESPONSES_FETCHED",
    responses,
  });
});

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

const loginAction = thunk(async dispatch => {
  dispatch({ type: "OAUTH_LOGIN_IN_PROGRESS" });
  const GoogleAuth = gapi.auth2.getAuthInstance();
  try {
    await GoogleAuth.signIn();
  } catch (error) {
    // e.g., user closed login popup
  }
});

class App extends React.Component {
  messageScreen(...items) {
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
          {items.map((jsx, idx) => {
            const Item = () => jsx;
            return <Item key={idx} />;
          })}
        </center>
      </div>
    );
  }
  loadingScreen(message) {
    return this.messageScreen(
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
  render() {
    switch (this.props.redux.screen) {
      case "error":
        return this.messageScreen(
          <p>
            Sorry, there was a totally unexpected error.{" "}
            {this.props.redux.error.message ? (
              <span>Here's all the information we have:</span>
            ) : (
              <span>
                Unfortunately, we don't have any further information. There
                might be some information in your browser's JavaScript console,
                though.
              </span>
            )}
          </p>,
          this.props.redux.error.message ? (
            <p>
              <b>{this.props.redux.error.message}</b>
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
        );
      case "authSetupInProgress":
        return this.loadingScreen("Authorizing your session...");
      case "authLoginInProgress":
        return this.messageScreen(
          <p>
            Waiting for you to log in with Google. If you close the login
            window,{" "}
            <a
              href="#"
              onClick={event => {
                store.dispatch(loginAction);
                event.preventDefault();
              }}
            >
              click here
            </a>{" "}
            to open another one.
          </p>,
        );
      case "authLoginRequired":
        return this.messageScreen(
          <p>All data is private to the HMC Class of 2020.</p>,
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => store.dispatch(loginAction)}
          >
            Sign in with your HMC Google Account
          </button>,
        );
      case "fetchInProgress":
        return this.loadingScreen("Fetching geolocation data...");
      case "map":
        return <Map />;
      case "blank":
        return null;
      default:
        store.dispatch({
          type: "CATASTROPHIC_ERROR",
          error: new Error(`Unknown screen name: ${this.props.redux.screen}`),
        });
        return null;
    }
  }
}

App = connect(state => {
  let redux;
  if (state.catastrophicError !== null) {
    redux = {
      screen: "error",
      error: state.catastrophicError,
    };
  } else if (state.auth.setupInProgress) {
    redux = {
      screen: "authSetupInProgress",
    };
  } else if (state.auth.loginInProgress) {
    redux = {
      screen: "authLoginInProgress",
    };
  } else if (!state.auth.loggedIn) {
    redux = {
      screen: "authLoginRequired",
    };
  } else if (state.fetch.inProgress) {
    redux = {
      screen: "fetchInProgress",
    };
  } else if (state.fetch.finished) {
    redux = {
      screen: "map",
      responses: state.responses,
    };
  } else {
    redux = {
      screen: "blank",
    };
  }
  return { redux };
})(App);

const updateLoginStatusAction = thunk(dispatch => {
  const GoogleAuth = gapi.auth2.getAuthInstance();
  if (GoogleAuth.currentUser.get().hasGrantedScopes("email")) {
    dispatch({ type: "OAUTH_LOGGED_IN" });
    dispatch(fetchResponsesAction);
  } else {
    dispatch({ type: "OAUTH_NOT_LOGGED_IN" });
  }
});

async function main() {
  initMapbox();
  render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById("app"),
  );
  await store.dispatch(
    thunk(async dispatch => {
      dispatch({ type: "OAUTH_SETUP_IN_PROGRESS" });
      // https://developers.google.com/identity/protocols/OAuth2UserAgent
      await new Promise(resolve => gapi.load("client:auth2", resolve));
      await gapi.client.init({
        clientId:
          "548868103597-3th6ihbnejkscon1950m9mm31misvhk9.apps.googleusercontent.com",
        scope: "email",
      });
      const GoogleAuth = gapi.auth2.getAuthInstance();
      GoogleAuth.isSignedIn.listen(() => dispatch(updateLoginStatusAction));
      dispatch(updateLoginStatusAction);
    }),
  );
}

window.addEventListener("error", event => {
  failHard(event.error || new Error(""));
});
main().catch(error => store.dispatch({ type: "CATASTROPHIC_ERROR", error }));

// https://dev.to/cronokirby/react-typescript-parcel-setting-up-hot-module-reloading-4f3f#setting-up-hmr
export default hot(module)(App);
