import { applyMiddleware, compose, createStore } from "redux";
import thunkMiddleware from "redux-thunk";

import { reducer } from "./state";
import { initialState } from "./lib/state";

import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({ reducer });

export type Dispatch = typeof store.dispatch;

// The Redux store for the entire app.
//export const store = createStore(
//  reducer,
//  initialState,
//  compose(
//    applyMiddleware(thunkMiddleware),
//    window.__REDUX_DEVTOOLS_EXTENSION__
//      ? window.__REDUX_DEVTOOLS_EXTENSION__()
//      : (e) => e,
//  ),
//);
