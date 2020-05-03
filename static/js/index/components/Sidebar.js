"use strict";

import _ from "lodash";
import React from "react";
import { Fragment } from "react";
import { connect } from "react-redux";

import {
  sidebarIndentWidth,
  sidebarWidthFraction,
  sidebarHeightFraction,
} from "../config";
import { store } from "../redux";
import { SidebarView } from "../state";
import { formatCity, formatPlan } from "../tag";
import { allowResizingWindow } from "../util";

function groupData(responses, getFirstKey, getSecondKey) {
  const index = {};
  const firstIconIndex = {};
  const secondIconIndex = {};
  const firstSortIndex = {};
  const secondSortIndex = {};
  for (const resp of responses) {
    const {
      key: theFirstKey,
      summerKey: firstSummerKey,
      icon: theFirstIcon,
      summerIcon: firstSummerIcon,
      noLinkForSummer: noLinkForSummerFirst,
      sortAs: firstSortAs,
    } = getFirstKey(resp);
    const {
      key: theSecondKey,
      summerKey: secondSummerKey,
      icon: theSecondIcon,
      summerIcon: secondSummerIcon,
      noLinkForSummer: noLinkForSummerSecond,
      sortAs: secondSortAs,
    } = getSecondKey(resp);

    for (const [
      firstKey,
      secondKey,
      firstIcon,
      secondIcon,
      noLinkFirst,
      noLinkSecond,
      summer,
    ] of [
      [
        theFirstKey,
        theSecondKey,
        theFirstIcon,
        theSecondIcon,
        false,
        false,
        false,
      ],
      [
        firstSummerKey,
        secondSummerKey,
        firstSummerIcon,
        secondSummerIcon,
        noLinkForSummerFirst,
        noLinkForSummerSecond,
        true,
      ],
    ]) {
      if (!(firstKey && secondKey)) {
        continue;
      }
      if (
        (!summer &&
          (!resp.hasOwnProperty("showLongTerm") || resp.showLongTerm)) ||
        (summer && (!resp.hasOwnProperty("showSummer") || resp.showSummer))
      ) {
        if (!index[firstKey]) {
          index[firstKey] = [];
        }
        if (!index[firstKey][secondKey]) {
          index[firstKey][secondKey] = [];
        }
        index[firstKey][secondKey].push({ resp, summer });
        firstIconIndex[firstKey] = { icon: firstIcon, noLink: noLinkFirst };
        secondIconIndex[secondKey] = { icon: secondIcon, noLink: noLinkSecond };
        firstSortIndex[firstKey] = firstSortAs
          ? firstSortAs(firstKey)
          : firstKey;
        secondSortIndex[secondKey] = secondSortAs
          ? secondSortAs(secondKey)
          : secondKey;
      }
    }
  }
  return _.sortBy(Object.keys(index), (val) => firstSortIndex[val]).map(
    (firstKey) => ({
      firstKey,
      firstIcon: firstIconIndex[firstKey].icon,
      noLinkFirst: firstIconIndex[firstKey].noLink,
      secondKeys: _.sortBy(
        Object.keys(index[firstKey]),
        (val) => secondSortIndex[val],
      ).map((secondKey) => ({
        secondKey,
        secondIcon: secondIconIndex[secondKey].icon,
        noLinkSecond: secondIconIndex[secondKey].noLink,
        responses: _.sortBy(
          index[firstKey][secondKey],
          ({ resp }) => resp.name,
        ),
      })),
    }),
  );
}

class Sidebar extends React.Component {
  doSimpleSearch(searchGetter, searchValue, view) {
    store.dispatch({
      type: "SHOW_DETAILS",
      responses: this.props.allResponses
        .map((resp) => {
          const showLongTerm = searchGetter(resp).key === searchValue;
          const showSummer = searchGetter(resp).summerKey === searchValue;
          if (showLongTerm || showSummer) {
            return { ...resp, showLongTerm, showSummer };
          } else {
            return null;
          }
        })
        .filter((x) => x),
      sidebarView: view,
    });
    store.dispatch({
      type: "UPDATE_MAP_VIEW_ZOOM",
    });
  }

  createTwoLevelViewJSX(
    firstKeyView,
    secondKeyView,
    firstGroupBy,
    secondGroupBy,
  ) {
    const groupedData = groupData(
      this.props.responses,
      firstGroupBy,
      secondGroupBy,
    );
    return groupedData.map(
      ({ firstKey, firstIcon, noLinkFirst, secondKeys }, idx) => (
        <Fragment key={idx}>
          <p
            style={{
              fontSize: "120%",
              paddingTop: idx === 0 ? "0px" : "16px",
            }}
          >
            <span
              className={`fas fa-${firstIcon}`}
              style={{
                paddingRight: "10px",
              }}
            ></span>
            <b>
              {noLinkFirst ? (
                firstKey
              ) : (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    this.doSimpleSearch(firstGroupBy, firstKey, firstKeyView);
                  }}
                >
                  {firstKey}
                </a>
              )}
            </b>
          </p>
          {secondKeys.map(
            ({ secondKey, secondIcon, noLinkSecond, responses }, idx) => (
              <Fragment key={idx}>
                <p
                  style={{
                    marginBottom: "0px",
                  }}
                >
                  <span
                    className={`fas fa-${secondIcon}`}
                    style={{
                      paddingLeft: `${sidebarIndentWidth}px`,
                      paddingRight: "10px",
                    }}
                  ></span>
                  {noLinkSecond ? (
                    secondKey
                  ) : (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        this.doSimpleSearch(
                          secondGroupBy,
                          secondKey,
                          secondKeyView,
                        );
                      }}
                    >
                      {secondKey}
                    </a>
                  )}
                </p>
                {responses.map(({ resp, summer }, idx) => {
                  return (
                    <Fragment key={idx}>
                      <p
                        style={{
                          marginBottom: "0px",
                        }}
                      >
                        <span
                          className={`fas fa-user-graduate`}
                          style={{
                            paddingLeft: `${sidebarIndentWidth * 2}px`,
                            paddingRight: "10px",
                          }}
                        ></span>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            store.dispatch({
                              type: "SHOW_DETAILS",
                              responses: [resp],
                              sidebarView: SidebarView.detailView,
                            });
                            store.dispatch({
                              type: "UPDATE_MAP_VIEW_ZOOM",
                            });
                          }}
                        >
                          {resp.name || "Anonymous"}
                        </a>
                        <i
                          style={{
                            fontSize: "75%",
                          }}
                        >
                          {summer && " (for the summer)"}
                        </i>
                      </p>
                    </Fragment>
                  );
                })}
              </Fragment>
            ),
          )}
        </Fragment>
      ),
    );
  }

  detailItem({
    resp,
    icon,
    field,
    match,
    matchSummer,
    separator,
    noLink,
    sidebarView,
  }) {
    const arrayify = (fn) => (resp) => {
      let vals = fn(resp);
      if (!vals) {
        return null;
      }
      if (!Array.isArray(vals)) {
        vals = [vals];
      }
      if (vals.length === 0) {
        return null;
      }
      return vals;
    };
    const fields = arrayify(field);
    const matches = arrayify(match || field);
    const matchesSummer = matchSummer && arrayify(matchSummer);
    return (
      fields(resp) && (
        <p
          style={{
            marginBottom: "8px",
          }}
        >
          <span
            className={`fas fa-${icon}`}
            style={{
              paddingRight: "10px",
              width: "30px",
              textAlign: "center",
            }}
          ></span>{" "}
          {fields(resp).map((val, idx) => (
            <Fragment key={idx}>
              {idx !== 0 && separator}
              {noLink ? (
                val
              ) : (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    store.dispatch({
                      type: "SHOW_DETAILS",
                      responses: this.props.allResponses
                        .map((resp) => {
                          const showLongTerm =
                            matches(resp) && matches(resp).includes(val);
                          const showSummer =
                            matchesSummer &&
                            matchesSummer(resp) &&
                            matchesSummer(resp).includes(val);
                          if (showLongTerm || showSummer) {
                            return { ...resp, showLongTerm, showSummer };
                          } else {
                            return null;
                          }
                        })
                        .filter((x) => x),
                      sidebarView: sidebarView || SidebarView.summaryView,
                    });
                    store.dispatch({
                      type: "UPDATE_MAP_VIEW_ZOOM",
                    });
                  }}
                >
                  {val}
                </a>
              )}
            </Fragment>
          ))}
        </p>
      )
    );
  }

  detailView(resp) {
    return (
      <div
        style={{
          paddingLeft: "3px",
        }}
      >
        <h5>
          <b>{resp.name || "Anonymous"}</b>
        </h5>
        {this.detailItem({
          resp,
          icon: "graduation-cap",
          field: (resp) => resp.major && resp.major.split(" + "),
          separator: " + ",
        })}
        {this.detailItem({
          resp,
          icon: "globe-americas",
          field: (resp) => formatCity(resp.city, resp.state, resp.country),
          matchSummer: (resp) =>
            formatCity(resp.summerCity, resp.summerState, resp.summerCountry),
        })}
        {this.detailItem({
          resp,
          icon: resp.path === "Graduate school" ? "university" : "building",
          field: (resp) => resp.org,
          matchSummer: (resp) => resp.summerOrg,
          sidebarView: SidebarView.organizationView,
        })}
        {(resp.summerPlans ||
          resp.summerCity ||
          resp.summerState ||
          resp.summerCountry ||
          resp.summerOrg) && (
          <>
            <p
              style={{
                marginTop: "25px",
                marginBottom: "8px",
              }}
            >
              <b>Summer plans</b>
            </p>
            {this.detailItem({
              resp,
              icon: "calendar-check",
              field: (resp) => resp.summerPlans,
              noLink: true,
            })}
            {this.detailItem({
              resp,
              icon: "globe-americas",
              field: (resp) =>
                formatCity(
                  resp.summerCity,
                  resp.summerState,
                  resp.summerCountry,
                ),
              match: (resp) => formatCity(resp.city, resp.state, resp.country),
              matchSummer: (resp) =>
                formatCity(
                  resp.summerCity,
                  resp.summerState,
                  resp.summerCountry,
                ),
            })}
            {this.detailItem({
              resp,
              icon: "building",
              field: (resp) => resp.summerOrg,
              match: (resp) => resp.org,
              matchSummer: (resp) => resp.summerOrg,
              sidebarView: SidebarView.organizationView,
            })}
          </>
        )}
        {resp.comments && (
          <p
            style={{
              marginTop: "55px",
            }}
          >
            <span
              style={{
                position: "absolute",
              }}
            >
              <span
                style={{
                  color: "#ccc",
                  fontSize: "400%",
                  position: "absolute",
                  top: "-45px",
                }}
              >
                &ldquo;
              </span>
            </span>
            <span
              style={{
                marginLeft: "5px",
              }}
            >
              {resp.comments}
            </span>
          </p>
        )}
      </div>
    );
  }

  render() {
    const cachedWindowWidth = this.props.cachedWindowWidth;
    const cachedWindowHeight = this.props.cachedWindowHeight;
    const style = {
      position: "absolute",
      padding: "10px",
      background: "white",
      zIndex: "3",
      overflowY: "auto",
      boxShadow: "rgba(0, 0, 0, 0.1) 0px 0px 10px 2px",
      paddingLeft: "12.5px",
    };
    if (this.props.showVertically) {
      Object.assign(style, {
        left: allowResizingWindow()
          ? `${(1 - sidebarWidthFraction) * 100}%`
          : `${(1 - sidebarWidthFraction) * cachedWindowWidth}px`,
        top: "0",
        width: allowResizingWindow()
          ? `${sidebarWidthFraction * 100}%`
          : `${sidebarWidthFraction * cachedWindowWidth}px`,
        height: allowResizingWindow() ? "100%" : `${cachedWindowHeight}px`,
      });
    } else {
      Object.assign(style, {
        left: "0",
        top: allowResizingWindow()
          ? `${(1 - sidebarHeightFraction) * 100}%`
          : `${(1 - sidebarHeightFraction) * cachedWindowHeight}px`,
        width: allowResizingWindow() ? "100%" : `${cachedWindowWidth}px`,
        height: allowResizingWindow()
          ? `${sidebarHeightFraction * 100}%`
          : `${sidebarHeightFraction * cachedWindowHeight}px`,
      });
    }

    let sidebarBody = null;
    const locationGroupBy = (resp) => ({
      key: formatCity(resp.city, resp.state, resp.country),
      summerKey: formatCity(
        resp.summerCity,
        resp.summerState,
        resp.summerCountry,
      ),
      icon: "globe-americas",
      summerIcon: "globe-americas",
      noLinkForSummer: false,
      sortAs: (val) => val.split(", ").reverse(),
    });
    const orgGroupBy = (resp) => ({
      key: formatPlan(resp),
      summerKey: resp.summerPlans,
      icon: resp.path === "Graduate school" ? "university" : "building",
      summerIcon: "calendar-check",
      noLinkForSummer: true,
      sortAs: (val) => [
        resp.path !== "Job",
        resp.path !== "Graduate school",
        resp.path !== "Gap year",
        resp.path,
        val,
      ],
    });

    switch (this.props.sidebarView) {
      case SidebarView.detailView:
        sidebarBody = this.props.responses.map((resp) => (
          <Fragment key={resp.idx}>{this.detailView(resp)}</Fragment>
        ));
        break;

      case SidebarView.summaryView:
        sidebarBody = this.createTwoLevelViewJSX(
          SidebarView.summaryView,
          SidebarView.organizationView,
          locationGroupBy,
          orgGroupBy,
        );
        break;

      case SidebarView.organizationView:
        sidebarBody = this.createTwoLevelViewJSX(
          SidebarView.organizationView,
          SidebarView.summaryView,
          orgGroupBy,
          locationGroupBy,
        );
        break;
    }
    return <div style={style}>{sidebarBody}</div>;
  }
}

export default connect((state) => ({
  responses: state.displayedResponses,
  geotagView: state.geotagView,
  sidebarView: state.sidebarView,
  showVertically: state.landscape,
  allResponses: state.responses,
  cachedWindowWidth: state.cachedWindowWidth,
  cachedWindowHeight: state.cachedWindowHeight,
}))(Sidebar);
