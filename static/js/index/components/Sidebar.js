"use strict";

import React from "react";
import { Fragment } from "react";
import { connect } from "react-redux";

import { sidebarWidthFraction } from "../config";
import { store } from "../redux";
import { SidebarView } from "../state";
import { tag, tagAll } from "../tag";

function groupPlansConfigurable(responses, getFirstGroupKey, getSecondGroupKey) {
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
        .map((secondKey) => ({ secondKey, responses: index[firstKey][secondKey] })),
    }));
}

// TODO: Ignore empty fields
function describeSubject(taggedSubject){
  return (
      <div>
      <h5><b> {taggedSubject.name}</b></h5>
      <div>{taggedSubject.tag.desc} in {taggedSubject.tag.loc}</div>
      <div>Majored in {taggedSubject.major}</div>
      <div>Note: {taggedSubject.comments}</div>
    </div>
  );
}

class Sidebar extends React.Component {
  render() {
    const grouped = groupPlansConfigurable(
      tagAll(this.props.responses, this.props.geotagView), resp => resp.tag.loc, resp => resp.tag.desc,
    );
    let sidebarContent = null;
    switch (this.props.sidebarView){
      case SidebarView.summaryView:
        console.log("in summary view");
        sidebarContent = (
        <div
          style={{
            position: "absolute",
            left: `${(1 - sidebarWidthFraction) * 100}%`,
            top: "0",
            width: `${sidebarWidthFraction * 100}%`,
            height: "100%",
            padding: "10px",
            background: "white",
            zIndex: "3",
          }}
        >
          {grouped.map(({ firstKey, secondKeys}, idx) => (
            <Fragment key={idx}>
              <h5>
                <b>{firstKey}</b>
              </h5>
              {secondKeys.map(({ secondKey, responses }, idx) => (
                <Fragment key={idx}>
                  <b>{secondKey}</b>
                  {responses.map((resp, idx) => (
                      <div
                    key={idx}
                    onClick={
                      () => {
                        console.log([resp]);
                        store.dispatch({
                        type: "SHOW_DETAILS",
                        responses: [resp.idx],
                          sidebarView: SidebarView.detailView,
                        });
                      }
                    }>{resp.name || "Anonymous"}</div>
                  ))}
                </Fragment>
              ))}
            </Fragment>
          ))}
        </div>
        );
      break;
    case SidebarView.detailView:
      const subject = tag(this.props.responses[0], this.props.geotagView);
      console.log("in detailed view");
      console.log(subject);
      sidebarContent = (
          <div
        style={{
          position: "absolute",
          left: `${(1 - sidebarWidthFraction) * 100}%`,
          top: "0",
          width: `${sidebarWidthFraction * 100}%`,
          height: "100%",
          padding: "10px",
          background: "white",
          zIndex: "3",
        }}
          >
          {describeSubject(subject)}
          </div>
      );
    }
    return (
      sidebarContent
    );
  }
}

export default connect((state) => {
  const displayedResponses = new Set(state.displayedResponses);
  return {
    responses: state.responses.filter((resp) =>
      displayedResponses.has(resp.idx),
    ),
    geotagView: state.geotagView,
    sidebarView: state.sidebarView,
  };
})(Sidebar);
