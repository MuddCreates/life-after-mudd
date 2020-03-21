"use strict";

import latinize from "latinize";
import React from "react";
import { connect } from "react-redux";
import { UsaStates } from "usa-states";

// https://github.com/parcel-bundler/parcel/issues/333#issuecomment-549273429
//
// Sigh. Refer to the following commit message.
// https://bitbucket.org/sjl/dotfiles/commits/b211864a20cef443ba20212b67e3392968a27b46
window.$ = window.jQuery = require("jquery");
require("bootstrap");
require("bootstrap-autocomplete");

import { store } from "../redux";

const statesByName = {};
const statesByAbbr = {};
for (const state of new UsaStates().states) {
  statesByName[state.name] = state;
  statesByAbbr[state.abbreviation] = state;
}

// IMPORTANT: when updating this function, also update the doSearch
// function.
function getSearchSuggestions(responses) {
  const cities = [].concat
    .apply(
      [],
      responses.map(resp => [resp.city, resp.summerCity]),
    )
    .sort();
  const states = [].concat
    .apply(
      [],
      responses.map(resp => [
        statesByAbbr[resp.state] ? statesByAbbr[resp.state].name : "",
        statesByAbbr[resp.summerState]
          ? statesByAbbr[resp.summerState].name
          : "",
      ]),
    )
    .sort();
  const countries = [].concat
    .apply(
      [],
      responses.map(resp => [resp.country, resp.summerCountry]),
    )
    .sort();
  const orgs = [].concat
    .apply(
      [],
      responses.map(resp => [resp.org, resp.summerOrg]),
    )
    .sort();
  const names = responses.map(resp => resp.name).sort();
  const queries = new Set(
    [].concat(
      countries,
      states,
      ["Bay Area"],
      cities,
      orgs,
      countries,
      orgs,
      names,
    ),
  );
  queries.delete("");
  return queries;
}

function normalize(query) {
  return latinize(query)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

// IMPORTANT: when updating this function, also update the
// getSearchSuggestions function.
function doSearch(query, responses) {
  console.log("query:", query);
  const results = [];
  for (const resp of responses) {
    if (
      [
        resp.city,
        resp.summerCity,
        statesByAbbr[resp.state] ? statesByAbbr[resp.state].name : "",
        statesByAbbr[resp.summerState]
          ? statesByAbbr[resp.summerState].name
          : "",
        resp.country,
        resp.summerCountry,
        resp.org,
        resp.summerOrg,
        resp.name,
      ]
        .filter(x => x)
        .includes(query)
    ) {
      results.push(resp.idx);
    }
  }
  store.dispatch({ type: "SHOW_DETAILS", responses: results });
}

class SearchBar extends React.Component {
  constructor(props) {
    super(props);
    this.input = React.createRef();
  }
  render() {
    const input = (
      <input
        className="mapboxgl-ctrl-geocoder--input"
        type="text"
        placeholder="Search"
        ref={this.input}
      />
    );
    return (
      <div
        style={{
          position: "absolute",
          left: "20px",
          top: "20px",
          width: "1000px",
        }}
      >
        <div className="mapboxgl-ctrl-geocoder mapboxgl-ctrl">
          <svg
            className="mapboxgl-ctrl-geocoder--icon mapboxgl-ctrl-geocoder--icon-search"
            viewBox="0 0 18 18"
            width="18"
            height="18"
          >
            <path d="M7.4 2.5c-2.7 0-4.9 2.2-4.9 4.9s2.2 4.9 4.9 4.9c1 0 1.8-.2 2.5-.8l3.7 3.7c.2.2.4.3.8.3.7 0 1.1-.4 1.1-1.1 0-.3-.1-.5-.3-.8L11.4 10c.4-.8.8-1.6.8-2.5.1-2.8-2.1-5-4.8-5zm0 1.6c1.8 0 3.2 1.4 3.2 3.2s-1.4 3.2-3.2 3.2-3.3-1.3-3.3-3.1 1.4-3.3 3.3-3.3z"></path>
          </svg>
          {input}
        </div>
      </div>
    );
  }
  componentDidMount() {
    // Set up autocompletions and provide the suggestions list.
    $(this.input.current).autoComplete({
      resolver: "custom",
      events: {
        search: (query, callback) => {
          const normQuery = normalize(query);
          const results = [];
          for (const item of this.props.suggestions) {
            const normItem = normalize(item);
            if (normItem.includes(normQuery)) {
              results.push({ text: item });
            }
          }
          callback(results);
        },
      },
      minLength: 0,
      autoSelect: false,
    });
    // Autoselect the first suggestion.
    //
    // https://github.com/xcash/bootstrap-autocomplete/issues/28#issuecomment-602104553
    const ac = $(this.input.current).data("autoComplete");
    const dd = ac._dd;
    dd._refreshItemList = dd.refreshItemList;
    dd.refreshItemList = () => {
      dd._refreshItemList();
      dd.focusNextItem();
    };
    // Bring the suggestions list back when the user clicks back into
    // the field.
    $(this.input.current).on("focus", () => {
      ac.handlerTyped($(this.input.current).val());
    });
    // Do a search when an item is selected. We don't allow any
    // searches that aren't autosuggested.
    $(this.input.current).on("autocomplete.select", (_event, item) => {
      $(this.input.current).blur();
      doSearch(item.text, this.props.responses);
    });
    // Unfocus the input on ESC.
    $(this.input.current).on("keyup", event => {
      if (event.key === "Escape") {
        $(this.input.current).blur();
      }
    });
    // Don't dismiss the suggestions on RET unless a
    // suggestion was actually accepted.
    for (const trigger of ["keyup", "keydown"]) {
      $(this.input.current).on(trigger, event => {
        if (event.key === "Enter") {
          if (!dd.isItemFocused) {
            dd.show();
          }
        }
      });
    }
  }
}

export default connect(state => ({
  responses: state.responses,
  suggestions: state.responses && getSearchSuggestions(state.responses),
}))(SearchBar);
