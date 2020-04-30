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

import "@fortawesome/fontawesome-free/css/all.css";

import { searchBarHeight, searchBarPadding, searchBarWidth } from "../config";
import { failHard } from "../error";
import { tagAll } from "../tag";
import { store } from "../redux";
import { SidebarView } from "../state";

const statesByName = {};
const statesByAbbr = {};
for (const state of new UsaStates().states) {
  statesByName[state.name] = state;
  statesByAbbr[state.abbreviation] = state;
}

const searchSources = [
  {
    field: (resp) => resp.path,
    rename: {
      Job: "Job/Internship/Working",
    },
  },
  (resp) => resp.major.split(" + "),
  {
    field: (resp) => resp.tag.city,
    alias: {
      "New York City": "NYC",
      "San Francisco": "SF",
    },
  },
  {
    field: (resp) => (statesByAbbr[resp.tag.state] || {}).name,
    alias: Object.fromEntries(
      Object.entries(statesByName).map(([name, state]) => [
        name,
        state.abbreviation,
      ]),
    ),
  },
  [
    {
      name: "San Francisco (SF) Bay Area",
      filter: (resp) =>
        resp.tag.latLong.lat > 36.878 &&
        resp.tag.latLong.lat < 38.859 &&
        resp.tag.latLong.lng > -123.569 &&
        resp.tag.latLong.lng < -121.199,
    },
    {
      name: "Seattle Area",
      filter: (resp) =>
        resp.tag.latLong.lat > 46.724 &&
        resp.tag.latLong.lat < 48.309 &&
        resp.tag.latLong.lng > -122.725 &&
        resp.tag.latLong.lng < -120.877,
    },
  ],
  {
    field: (resp) => resp.tag.country,
    alias: { "United States": "USA" },
  },
  {
    field: (resp) => resp.tag.org,
    alias: { Facebook: "FB" },
  },
  (resp) => resp.name,
];

function getSearchIndex(responses) {
  const index = new Map();
  searchSources
    .map((source) => {
      if (typeof source === "function") {
        source = { field: source };
      }
      if (!Array.isArray(source)) {
        source = [source];
      }
      return source;
    })
    .forEach((sources, idx) =>
      sources.forEach((source) => {
        let values;
        if (source.field && !source.name) {
          values = [].concat.apply(
            [],
            responses.map((resp) => {
              let vals = source.field(resp);
              if (!Array.isArray(vals)) {
                vals = [vals];
              }
              return vals.map((val) => {
                if (source.rename && source.rename[val]) {
                  val = source.rename[val];
                }
                if (source.alias && source.alias[val]) {
                  val = `${val} (${source.alias[val]})`;
                }
                return { response: resp, val };
              });
            }),
          );
        } else if (source.name && source.filter && !source.field) {
          values = responses
            .filter((resp) => source.filter(resp))
            .map((resp) => ({ response: resp, val: source.name }));
        } else {
          failHard(`Malformed search source: ${JSON.stringify(source)}`);
        }
        values.forEach(({ response: resp, val }) => {
          if (!index.has(val)) {
            index.set(val, { priority: idx, responses: [] });
          }
          index.get(val).responses.push(resp);
        });
      }),
    );
  index.delete("");
  return new Map(
    Array.from(index)
      .sort(
        ([val1, { priority: priority1 }], [val2, { priority: priority2 }]) => {
          if (priority1 < priority2) return -1;
          if (priority1 > priority2) return +1;
          if (val1 < val2) return -1;
          if (val1 > val2) return +1;
          return 0;
        },
      )
      .map(([val, { responses }]) => [val, responses]),
  );
}

function normalize(query) {
  return latinize(query)
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/ +/g, " ");
}

function doSearch(query, index) {
  store.dispatch({
    type: "SHOW_DETAILS",
    responses: index.get(query).map((resp) => resp.idx),
    sidebarView: SidebarView.summaryView,
  });
  store.dispatch({
    type: "UPDATE_MAP_VIEW_ZOOM",
  });
}

class SearchBar extends React.Component {
  constructor(props) {
    super(props);
    this.input = React.createRef();
  }
  render() {
    // XXX: Unfortunately, Mapbox GL has a bunch of CSS that gets
    // applied on a media query for >=640px width. It looks pretty
    // dumb (and also totally breaks the dropdown menu styling) if the
    // search bar resizes depending on screen width like this, so I
    // copied and pasted CSS properties from the Chrome inspector (to
    // make them unconditional) until it stopped moving around. Yuck!
    //
    // When changing layout stuff here, also change searchBarOcclusion
    // in config.js.
    const input = (
      <input
        className="mapboxgl-ctrl-geocoder--input"
        type="text"
        placeholder="person, company, area..."
        ref={this.input}
        style={{ height: "36px", fontSize: "15px", padding: "6px 35px" }}
      />
    );
    // We display padding, then the search bar, then padding, then the
    // help button, then padding. Three pieces of padding.
    return (
      <>
        <div
          style={{
            position: "absolute",
            left: `${searchBarPadding}px`,
            top: `${searchBarPadding}px`,
            width: `${searchBarWidth}px`,
            maxWidth: `calc(100% - ${
              searchBarPadding * 3 + searchBarHeight
            }px)`,
            touchAction: "none",
          }}
        >
          <div
            className="mapboxgl-ctrl-geocoder mapboxgl-ctrl"
            style={{ width: "100%", maxWidth: "100%" }}
          >
            <svg
              className="mapboxgl-ctrl-geocoder--icon mapboxgl-ctrl-geocoder--icon-search"
              viewBox="0 0 18 18"
              width="18"
              height="18"
              style={{
                left: "7px",
                width: "20px",
                height: "20px",
                top: "8px",
              }}
            >
              <path d="M7.4 2.5c-2.7 0-4.9 2.2-4.9 4.9s2.2 4.9 4.9 4.9c1 0 1.8-.2 2.5-.8l3.7 3.7c.2.2.4.3.8.3.7 0 1.1-.4 1.1-1.1 0-.3-.1-.5-.3-.8L11.4 10c.4-.8.8-1.6.8-2.5.1-2.8-2.1-5-4.8-5zm0 1.6c1.8 0 3.2 1.4 3.2 3.2s-1.4 3.2-3.2 3.2-3.3-1.3-3.3-3.1 1.4-3.3 3.3-3.3z"></path>
            </svg>
            {input}
          </div>
        </div>
        <button
          style={{
            position: "absolute",
            right: `${searchBarPadding}px`,
            top: `${searchBarPadding}px`,
            width: `${searchBarHeight}px`,
            height: `${searchBarHeight}px`,
            backgroundColor: "white",
            borderColor: "white",
            padding: "0",
            // copied from mapboxgl-ctrl-geocoder
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 0px 10px 2px",
          }}
          type="button"
          className="btn btn-light"
          data-toggle="modal"
          data-target="#about-modal"
        >
          <span className="fas fa-info-circle"></span>
        </button>
        <div className="modal fade" tabIndex="-1" id="about-modal">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">About</h5>
                <button type="button" className="close" data-dismiss="modal">
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <p>
                  Created by Radon Rosborough.{" "}
                  <a href="mailto:rrosborough@hmc.edu">Email me</a> if you have
                  questions or feedback!
                </p>
                <p>
                  Source code is available{" "}
                  <a href="https://github.com/MuddCreates/life-after-mudd">
                    on GitHub
                  </a>
                  . I welcome{" "}
                  <a href="https://github.com/MuddCreates/life-after-mudd/issues">
                    bug reports
                  </a>{" "}
                  or improvements.
                </p>
                <p>
                  Data comes from{" "}
                  <a href="https://forms.gle/PqEHTjpBDGBXfH4W8">
                    this Google Form
                  </a>
                  . Add your post-graduation plans!
                </p>
                <p>Quick tips:</p>
                <ul>
                  <li>
                    You can search for people, companies, majors, or regions
                    ("Bay Area"). Anything that was submitted on the form!
                  </li>
                  <li>
                    Keyboard shortcuts: escape to cancel search and sidebar,
                    forward-slash to start a new search
                  </li>
                  <li>
                    If you'd like the raw data, you can grab it from the Network
                    tab in your browser's development tools. Please do not
                    publicize it beyond the Class of 2020, as per the Honor
                    Code.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  componentDidMount() {
    // Set up autocompletions and provide the suggestions list.
    $(this.input.current).autoComplete({
      resolver: "custom",
      events: {
        search: (query, callback) => {
          const normQuery = normalize(query)
            .split(" ")
            .filter((x) => x);
          const results = [];
          this.props.index.forEach((_, item) => {
            const normItem = normalize(item);
            for (const part of normQuery) {
              if (!normItem.includes(part)) {
                return;
              }
            }
            // Limit to 10 results, like Google.
            if (results.length < 10) {
              results.push({ text: item });
            }
          });
          callback(results);
        },
      },
      minLength: 0,
      autoSelect: false,
    });
    const ac = $(this.input.current).data("autoComplete");
    const dd = ac._dd;
    // Do a search when an item is selected. We don't allow any
    // searches that aren't autosuggested.
    $(this.input.current).on("autocomplete.select", (_event, item) => {
      $(this.input.current).blur();
      doSearch(item.text, this.props.index);
    });
    // Don't dismiss the suggestions on RET unless a
    // suggestion was actually accepted.
    $(this.input.current).on("keypress", (event) => {
      if (event.key === "Enter") {
        if (!dd.isItemFocused) {
          dd.show();
        }
      }
    });
    // ESC dismisses our completions. Prevent it from bubbling up and
    // doing other stuff too, like dismissing the sidebar.
    $(this.input.current).on("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
      }
    });
    // Fix highlighting behavior. (Why isn't this customizable?)
    dd._showMatchedText = dd.showMatchedText;
    dd.showMatchedText = (text, query) => {
      const folded = latinize(text).toLowerCase();
      if (folded.length !== text.length) {
        // Oh shoot this sounds hard, fall back to something less
        // intelligent.
        return dd._showMatchedText(text, query);
      }
      const highlighted = new Array(folded.length).fill(false);
      for (const part of normalize(query)
        .split(" ")
        .filter((x) => x)) {
        let start = 0;
        let index;
        while ((index = folded.indexOf(part, start)) != -1) {
          for (let i = index; i < index + part.length; i++) {
            highlighted[i] = true;
          }
          start = index + part.length;
        }
      }
      // Just stick <b></b> around every individual bolded character.
      // It looks dumb but nobody is reading the DOM.
      //
      // In case you're wondering why this API doesn't create
      // horrifyingly obvious XSS exploits, the answer is it totally
      // does and you should blame bootstrap-autocomplete.
      return text
        .split("")
        .map((char, idx) => (highlighted[idx] ? `<b>${char}</b>` : char))
        .join("");
    };
    document.addEventListener("keydown", this.keyListener, false);
  }
  keyListener = (e) => {
    if (
      e.key === "/" &&
      document.activeElement.tagName.toLowerCase() !== "input"
    ) {
      $(this.input.current).focus();
      e.preventDefault();
    }
  };
}

export default connect((state) => {
  const responses = tagAll(state.responses, state.geotagView);
  return {
    responses: responses,
    index: responses && getSearchIndex(responses),
  };
})(SearchBar);
