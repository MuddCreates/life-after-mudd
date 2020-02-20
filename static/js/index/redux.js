"use strict";

import { applyMiddleware, compose, createStore } from "redux";
import thunkMiddleware from "redux-thunk";

import { initialState, reducer } from "./state";

// The Redux store for the entire app.
export const store = createStore(
  reducer,
  initialState,
  compose(
    applyMiddleware(thunkMiddleware),
    window.__REDUX_DEVTOOLS_EXTENSION__
      ? window.__REDUX_DEVTOOLS_EXTENSION__()
      : e => e,
  ),
);
