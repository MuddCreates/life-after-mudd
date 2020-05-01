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
import { formatCity, tag, tagAll } from "../tag";
import {
  allowResizingWindow,
  originalWindowWidth,
  originalWindowHeight,
} from "../util";

function groupPlansConfigurable(
  responses,
  getFirstGroupKey,
  getSecondGroupKey,
) {
  const index = {};
  for (const resp of responses) {
    const firstGroupKey = getFirstGroupKey(resp);
    const secondGroupKey = getSecondGroupKey(resp);

    if (!index[firstGroupKey]) {
      index[firstGroupKey] = [];
    }
    if (!index[firstGroupKey][secondGroupKey]) {
      index[firstGroupKey][secondGroupKey] = [];
    }
    index[firstGroupKey][secondGroupKey].push(resp);
  }
  return Object.keys(index)
    .sort()
    .map((firstKey) => ({
      firstKey,
      secondKeys: Object.keys(index[firstKey])
        .sort()
        .map((secondKey) => ({
          secondKey,
          responses: _.sortBy(index[firstKey][secondKey], "name"),
        })),
    }));
}

class Sidebar extends React.Component {
  doSimpleSearch(searchGetter, searchValue, view) {
    store.dispatch({
      type: "SHOW_DETAILS",
      responses: this.props.index
        .filter((resp) => searchGetter(resp) === searchValue)
        .map((resp) => resp.idx),
      sidebarView: view,
    });
    store.dispatch({
      type: "UPDATE_MAP_VIEW_ZOOM",
    });
  }

  createTwoLevelViewJSX(
    taggedData,
    firstKeyView,
    secondKeyView,
    firstGroupBy,
    secondGroupBy,
    firstIcon,
    secondIcon,
  ) {
    const groupedData = groupPlansConfigurable(
      taggedData,
      firstGroupBy,
      secondGroupBy,
    );
    return groupedData.map(({ firstKey, secondKeys }, idx) => (
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
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                this.doSimpleSearch(
                  firstGroupBy,
                  firstGroupBy(secondKeys[0].responses[0]),
                  firstKeyView,
                );
              }}
            >
              {firstKey}
            </a>
          </b>
        </p>
        {secondKeys.map(({ secondKey, responses }, idx) => (
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
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  this.doSimpleSearch(
                    secondGroupBy,
                    secondGroupBy(responses[0]),
                    secondKeyView,
                  );
                }}
              >
                {secondKey}
              </a>
            </p>
            {responses.map((resp, idx) => {
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
                          responses: [resp.idx],
                          sidebarView: SidebarView.detailView,
                        });
                      }}
                    >
                      {resp.name || "Anonymous"}
                    </a>
                  </p>
                </Fragment>
              );
            })}
          </Fragment>
        ))}
      </Fragment>
    ));
  }

  detailItem({ resp, icon, field, separator, noLink }) {
    const fields = (resp) => {
      let vals = field(resp);
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
                      responses: this.props.index
                        .filter(
                          (resp) => fields(resp) && fields(resp).includes(val),
                        )
                        .map((resp) => resp.idx),
                      sidebarView: SidebarView.summaryView,
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
        })}
        {this.detailItem({
          resp,
          icon: resp.path === "Graduate school" ? "university" : "building",
          field: (resp) => resp.org,
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
            })}
            {this.detailItem({
              resp,
              icon: "building",
              field: (resp) => resp.summerOrg,
            })}
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
          </>
        )}
      </div>
    );
  }

  render() {
    const taggedData = tagAll(this.props.responses, this.props.geotagView);
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
          : `${(1 - sidebarWidthFraction) * originalWindowWidth}px`,
        top: "0",
        width: allowResizingWindow()
          ? `${sidebarWidthFraction * 100}%`
          : `${sidebarWidthFraction * originalWindowWidth}px`,
        height: allowResizingWindow() ? "100%" : `${originalWindowHeight}px`,
      });
    } else {
      Object.assign(style, {
        left: "0",
        top: allowResizingWindow()
          ? `${(1 - sidebarHeightFraction) * 100}%`
          : `${(1 - sidebarHeightFraction) * originalWindowHeight}px`,
        width: allowResizingWindow() ? "100%" : `${originalWindowWidth}px`,
        height: allowResizingWindow()
          ? `${sidebarHeightFraction * 100}%`
          : `${sidebarHeightFraction * originalWindowHeight}px`,
      });
    }

    let sidebarBody = null;
    if (this.props.sidebarView === SidebarView.detailView) {
      const subject = tag(this.props.responses[0], this.props.geotagView);
      sidebarBody = this.detailView(subject);
    } else {
      // for all view made with createTwoLevelViewJSX
      switch (this.props.sidebarView) {
        case SidebarView.summaryView:
          sidebarBody = this.createTwoLevelViewJSX(
            taggedData,
            SidebarView.summaryView,
            SidebarView.organizationView,
            (resp) => resp.tag.loc,
            (resp) => resp.tag.desc,
            "globe-americas",
            "building",
          );
          break;

        case SidebarView.organizationView:
          sidebarBody = this.createTwoLevelViewJSX(
            taggedData,
            SidebarView.organizationView,
            SidebarView.summaryView,
            (resp) => resp.tag.desc,
            (resp) => resp.tag.loc,
            "building",
            "globe-americas",
          );
          break;
      }
    }
    return <div style={style}>{sidebarBody}</div>;
  }
}

export default connect((state) => {
  const displayedResponses = new Set(state.displayedResponses);
  const responses = state.responses.filter((resp) =>
    displayedResponses.has(resp.idx),
  );
  return {
    responses: responses,
    geotagView: state.geotagView,
    sidebarView: state.sidebarView,
    showVertically: state.landscape,
    index: responses && tagAll(state.responses, state.geotagView),
  };
})(Sidebar);
