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
import {
  formatCity,
  formatCitySuffix,
  formatLongTermPlan,
  formatSummerPlan,
} from "../tag";
import { allowResizingWindow } from "../util";

function getPathIcon({ path, summer }) {
  switch (path) {
    case "Job":
    case "Internship":
      return "building";
    case "Graduate school":
      return "university";
    case "Gap year":
      return "route";
    case "Not sure":
      return "question";
    default:
      return summer ? "calendar-check" : "building";
  }
}

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
                marginRight: "10px",
                textAlign: "center",
                width: "30px",
              }}
            ></span>
            <b
              style={{
                display: "inline-block",
              }}
            >
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
                      marginLeft: `43px`,
                      marginRight: "10px",
                      textAlign: "center",
                      width: "16px",
                    }}
                  ></span>
                  <span
                    style={{
                      display: "inline-block",
                    }}
                  >
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
                  </span>
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
                            paddingLeft: `85px`,
                            paddingRight: "10px",
                            display: "inline-block",
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
    forcePredicate,
    separator,
    noLink,
    sidebarView,
    href,
    brand,
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
            className={`${brand ? "fab" : "fas"} fa-${icon}`}
            style={{
              paddingRight: "10px",
              width: "30px",
              textAlign: "center",
            }}
          ></span>{" "}
          {fields(resp).map((val, idx) => (
            <span
              key={idx}
              style={{
                display: "inline-block",
              }}
            >
              {idx !== 0 && (
                <span
                  style={{
                    whiteSpace: "pre",
                  }}
                >
                  {separator}
                </span>
              )}
              {noLink ? (
                val
              ) : (
                <a
                  href={href || "#"}
                  target={href ? "_blank" : null}
                  onClick={
                    href
                      ? null
                      : (e) => {
                          e.preventDefault();
                          store.dispatch({
                            type: "SHOW_DETAILS",
                            responses: this.props.allResponses
                              .map((resp) => {
                                let showLongTerm =
                                  (matches(resp) &&
                                    matches(resp).includes(val)) ||
                                  (forcePredicate && forcePredicate(resp));
                                let showSummer =
                                  (matchesSummer &&
                                    matchesSummer(resp) &&
                                    matchesSummer(resp).includes(val)) ||
                                  (forcePredicate &&
                                    forcePredicate(resp) &&
                                    !(resp.orgLatLong || resp.cityLatLong));
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
                        }
                  }
                >
                  {val}
                </a>
              )}
            </span>
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
          icon: getPathIcon({ path: resp.path, summer: false }),
          field: formatLongTermPlan,
          matchSummer: formatSummerPlan,
          forcePredicate: (other) => !resp.org && resp.path === other.path,
          sidebarView: SidebarView.organizationView,
        })}
        {this.detailItem({
          resp,
          icon: "link",
          field: (resp) => resp.orgLink,
          href: resp.orgLink,
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
              icon: getPathIcon({ path: resp.summerPlans, summer: true }),
              field: formatSummerPlan,
              match: formatLongTermPlan,
              matchSummer: formatSummerPlan,
              noLink: !resp.summerOrg,
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
              icon: "link",
              field: (resp) => resp.summerOrgLink,
              href: resp.summerOrgLink,
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
            <span>{resp.comments}</span>
          </p>
        )}
        <p
          style={{
            marginTop: "25px",
            marginBottom: "8px",
          }}
        >
          <b>Contact</b>
        </p>
        {this.detailItem({
          resp,
          icon: "inbox",
          field: (resp) => resp.postGradEmail,
          href: `mailto:${resp.postGradEmail}`,
        })}
        {this.detailItem({
          resp,
          icon: "phone",
          field: (resp) => resp.phoneNumber,
          href: `tel:${resp.phoneNumber}`,
        })}
        {this.detailItem({
          resp,
          icon: "facebook-messenger",
          field: (resp) => resp.facebookProfile && "Facebook profile",
          href: resp.facebookProfile,
          brand: true,
        })}
        {(resp.email === this.props.email || this.props.email === "*") && (
          <>
            <p
              style={{
                marginTop: "25px",
                marginBottom: "8px",
              }}
            >
              <b>Update your response</b>
            </p>
            <p>
              To update your information, simply{" "}
              <a href="https://forms.gle/PqEHTjpBDGBXfH4W8" target="_blank">
                fill out the form again
              </a>
              .
              {!resp.comments && resp.path !== "Not sure" && (
                <>
                  {" "}
                  <i>
                    Why not update the comments section to tell people{" "}
                    {resp.path === "Job"
                      ? "what you'll be doing at " +
                        (resp.org || "your new job")
                      : resp.path === "Graduate school"
                      ? "what program you'll be enrolled in at " +
                        (resp.org.startsWith("University") ? "the " : "") +
                        (resp.org || "grad school")
                      : resp.path === "Gap year"
                      ? "what you'll be doing during your gap year" +
                        formatCitySuffix(resp.city)
                      : resp.org
                      ? "what you'll be up to at " + resp.org
                      : "what you'll be up to" + formatCitySuffix(resp.city)}
                    ?
                  </i>
                </>
              )}
            </p>
            <p>
              If you want to be removed from the map, or you have any other
              concerns, just{" "}
              <a href="mailto:rrosborough@hmc.edu" target="_blank">
                shoot me an email
              </a>
              .
            </p>
          </>
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
      zIndex: "3",
      overflowY: "auto",
      boxShadow: "rgba(0, 0, 0, 0.1) 0px 0px 10px 2px",
      paddingLeft: "12.5px",
      paddingBottom: "0",
      backgroundColor: "white",
      WebkitOverflowScrolling: "touch",
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
      key:
        formatCity(resp.city, resp.state, resp.country) || "Location unknown",
      summerKey:
        formatCity(resp.summerCity, resp.summerState, resp.summerCountry) ||
        (resp.summerPlans && "Location unknown"),
      icon: "globe-americas",
      summerIcon: "globe-americas",
      noLinkForSummer: false,
      sortAs: (val) => [
        val === "Location unknown",
        val.split(", ").length > 2,
        val.split(", ").reverse(),
      ],
    });
    const orgGroupBy = (resp) => ({
      key: formatLongTermPlan(resp),
      summerKey: formatSummerPlan(resp),
      icon: getPathIcon({ path: resp.path, summer: false }),
      summerIcon: "calendar-check",
      noLinkForSummer: !resp.summerOrg,
      sortAs: (val) => [
        !val.startsWith("Working"),
        !val.startsWith("Studying"),
        !val.startsWith("Gap year"),
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
    // The div after the body is a hack because padding-bottom doesn't
    // seem to be respected on Android(??).
    //
    // Add class "hint-scrollable" here when it's time to fix up and
    // re-add the drop shadow.
    return (
      <div style={style}>
        {sidebarBody}
        <div style={{ height: "10px" }}></div>
      </div>
    );
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
  email: state.email,
}))(Sidebar);
