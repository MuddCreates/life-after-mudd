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

import {
  searchBarHeight,
  searchBarPadding,
  searchBarWidth,
  sidebarHeightFraction,
  sidebarWidthFraction,
} from "../config";
import { failHard } from "../error";
import { store } from "../redux";
import { SidebarView } from "../state";

const statesByName = {};
const statesByAbbr = {};
for (const state of new UsaStates().states) {
  statesByName[state.name] = state;
  statesByAbbr[state.abbreviation] = state;
}

function inBayArea(latLong) {
  return (
    latLong &&
    latLong.lat > 36.878 &&
    latLong.lat < 38.859 &&
    latLong.lng > -123.569 &&
    latLong.lng < -121.199
  );
}

function inSeattleArea(latLong) {
  return (
    latLong &&
    latLong.lat > 46.724 &&
    latLong.lat < 48.309 &&
    latLong.lng > -122.725 &&
    latLong.lng < -120.877
  );
}

const searchSources = [
  {
    name: "Show all",
    filter: (_) => true,
    summerFilter: (_) => true,
  },
  {
    name: "Show all long-term",
    filter: (_) => true,
  },
  {
    name: "Show all summer",
    summerFilter: (_) => true,
  },
  {
    field: (resp) => resp.path,
    rename: {
      Job: "Job/Internship/Working",
      "Not sure": "No plans yet/Not sure/Unsure",
    },
  },
  {
    name: "Location unknown",
    filter: (resp) => resp.path && !(resp.orgLatLong || resp.cityLatLong),
    summerFilter: (resp) =>
      resp.summerPlans && !(resp.summerOrgLatLong || resp.summerCityLatLong),
  },
  (resp) => resp.major.split(" + "),
  {
    field: (resp) => [resp.city, { val: resp.summerCity, summer: true }],
    alias: {
      "New York City": "NYC",
      "San Francisco": "SF",
    },
  },
  {
    field: (resp) => [
      (statesByAbbr[resp.state] || { name: "" }).name,
      {
        val: (statesByAbbr[resp.summerState] || { name: "" }).name,
        summer: true,
      },
    ],
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
      filter: (resp) => inBayArea(resp.orgLatLong || resp.cityLatLong),
      summerFilter: (resp) =>
        inBayArea(resp.summerOrgLatLong || resp.citySummerLatLong),
    },
    {
      name: "Seattle Area",
      filter: (resp) => inSeattleArea(resp.orgLatLong || resp.cityLatLong),
      summerFilter: (resp) =>
        inSeattleArea(resp.summerOrgLatLong || resp.citySummerLatLong),
    },
  ],
  {
    field: (resp) => [resp.country, { val: resp.summerCountry, summer: true }],
    alias: { "United States": "USA" },
  },
  {
    field: (resp) => [resp.org, { val: resp.summerOrg, summer: true }],
    alias: { Facebook: "FB" },
    view: SidebarView.organizationView,
  },
  {
    field: (resp) => resp.name,
    view: SidebarView.detailView,
  },
];

export function getSearchIndex(responses) {
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
        if (
          source.field &&
          !(source.name || source.filter || source.summerFilter)
        ) {
          values = [].concat.apply(
            [],
            responses.map((resp) => {
              let vals = source.field(resp);
              if (!Array.isArray(vals)) {
                vals = [vals];
              }
              return vals.map((val) => {
                if (val.summer || !(resp.orgLatLong || resp.cityLatLong)) {
                  if (val.summer) {
                    val = val.val;
                  }
                  resp = { ...resp, showLongTerm: false, showSummer: true };
                } else {
                  resp = { ...resp, showLongTerm: true, showSummer: false };
                }
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
        } else if (
          source.name &&
          (source.filter || source.summerFilter) &&
          !source.field
        ) {
          values = [];
          for (const [fn, summer] of [
            [source.filter, false],
            [source.summerFilter, true],
          ]) {
            if (fn) {
              values = values.concat(
                responses.filter(fn).map((resp) => ({
                  response: {
                    ...resp,
                    showLongTerm: !summer,
                    showSummer: summer,
                  },
                  val: source.name,
                })),
              );
            }
          }
        } else {
          failHard(`Malformed search source: ${JSON.stringify(source)}`);
        }
        values.forEach(({ response: resp, val }) => {
          if (!index.has(val)) {
            index.set(val, {
              priority: idx,
              responses: [],
              view: source.view || SidebarView.summaryView,
            });
          }
          let alreadyPresent = false;
          for (const existing of index.get(val).responses) {
            if (existing.idx != resp.idx) {
              continue;
            }
            existing.showLongTerm = existing.showLongTerm || resp.showLongTerm;
            existing.showSummer = existing.showSummer || resp.showSummer;
            alreadyPresent = true;
            break;
          }
          if (!alreadyPresent) {
            index.get(val).responses.push(resp);
          }
        });
      }),
    );
  index.delete("");
  return new Map(
    Array.from(index).sort(
      ([val1, { priority: priority1 }], [val2, { priority: priority2 }]) => {
        if (priority1 < priority2) return -1;
        if (priority1 > priority2) return +1;
        if (val1 < val2) return -1;
        if (val1 > val2) return +1;
        return 0;
      },
    ),
  );
}

function normalize(query) {
  return latinize(query)
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/ +/g, " ");
}

export function doSearch(query, index) {
  store.dispatch({
    type: "SHOW_DETAILS",
    responses: index.get(query).responses,
    sidebarView: index.get(query).view,
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
        placeholder="Search for anything"
        ref={this.input}
        id="searchInput"
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
            style={{
              width: "100%",
              maxWidth: "100%",
              position: "absolute",
              left: `${searchBarHeight + searchBarPadding}px`,
            }}
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
          <button
            style={{
              position: "absolute",
              left: `0px`,
              top: `0px`,
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
          <div
            style={{
              position: "absolute",
              left: `0px`,
              top: `${searchBarHeight + searchBarPadding}px`,
              width: `${searchBarHeight}px`,
              height: `${searchBarHeight * 2}px`,
              padding: "0",
              // copied from mapboxgl-ctrl-geocoder
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 0px 10px 2px",
              borderRadius: "4px",
            }}
          ></div>
          <button
            style={{
              position: "absolute",
              left: `0px`,
              top: `${searchBarHeight + searchBarPadding}px`,
              width: `${searchBarHeight}px`,
              height: `${searchBarHeight}px`,
              backgroundColor: "white",
              borderColor: "white",
              padding: "0",
              // hacks
              borderBottomLeftRadius: "0",
              borderBottomRightRadius: "0",
            }}
            type="button"
            className="btn btn-light"
            onClick={() => {
              let { lng, lat } = window.map.getCenter();
              let zoom = window.map.getZoom() + 1;
              // Correction for sidebar.
              if (this.props.showingSidebar) {
                if (this.props.sidebarVertical) {
                  lng -=
                    (sidebarWidthFraction / 4) *
                    (window.map.getBounds().getEast() -
                      window.map.getBounds().getWest());
                } else {
                  lat +=
                    (sidebarHeightFraction / 4) *
                    (window.map.getBounds().getNorth() -
                      window.map.getBounds().getSouth());
                }
              }
              window.map &&
                window.map.easeTo({
                  zoom: zoom,
                  center: { lng, lat },
                });
            }}
          >
            <span className="fas fa-plus"></span>
          </button>
          <button
            style={{
              position: "absolute",
              left: `0px`,
              top: `${2 * searchBarHeight + searchBarPadding}px`,
              width: `${searchBarHeight}px`,
              height: `${searchBarHeight}px`,
              backgroundColor: "white",
              borderColor: "white",
              padding: "0",
              // hacks
              borderTopLeftRadius: "0",
              borderTopRightRadius: "0",
            }}
            type="button"
            className="btn btn-light"
            onClick={() => {
              let { lng, lat } = window.map.getCenter();
              let zoom = window.map.getZoom() - 1;
              // Correction for sidebar.
              if (this.props.showingSidebar) {
                if (this.props.sidebarVertical) {
                  lng +=
                    (sidebarWidthFraction / 2) *
                    (window.map.getBounds().getEast() -
                      window.map.getBounds().getWest());
                } else {
                  lat -=
                    (sidebarHeightFraction / 2) *
                    (window.map.getBounds().getNorth() -
                      window.map.getBounds().getSouth());
                }
              }
              window.map &&
                window.map.easeTo({
                  zoom: zoom,
                  center: { lng, lat },
                });
            }}
          >
            <span className="fas fa-minus"></span>
          </button>
          <div
            style={{
              position: "absolute",
              right: `${
                -(searchBarPadding + searchBarHeight) + searchBarHeight * 0.125
              }px`,
              top: `${searchBarHeight * 2 + searchBarPadding - 0.5}px`,
              width: `${searchBarHeight * 0.75}px`,
              height: `1px`,
              // stolen from Google Maps
              backgroundColor: "#e6e6e6",
            }}
          ></div>
        </div>
        <div
          className="modal fade"
          tabIndex="-1"
          id="about-modal"
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >
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
                  questions or feedback, if you find any wrong data, or if you
                  would like to be removed from the map.
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
          let results = [];
          if (query) {
            const normQuery = normalize(query)
              .split(" ")
              .filter((x) => x);
            this.props.index.forEach((_, item) => {
              const normItem = normalize(item);
              for (const part of normQuery) {
                if (!normItem.includes(part)) {
                  return;
                }
              }
              if (results.length < 5) {
                results.push({
                  text: item,
                });
              }
            });
          } else {
            for (const example of [
              "Show all",
              "Graduate school",
              "Seattle Area",
              "Joint CS/Math",
              "Facebook (FB)",
            ]) {
              if (this.props.index.has(example)) {
                results.push({
                  text: example,
                  html:
                    example === "Show all"
                      ? `Show all ${this.props.responses.length}`
                      : example,
                });
              }
            }
          }
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
  return {
    responses: state.responses,
    index: state.responses && getSearchIndex(state.responses),
    sidebarVertical: state.landscape,
    showingSidebar: state.displayedResponses !== null,
  };
})(SearchBar);
