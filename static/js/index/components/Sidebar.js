"use strict";

import React from "react";
import { Fragment } from "react";
import { connect } from "react-redux";

import { sidebarWidthFraction } from "../config";
import { store } from "../redux";
import { SidebarView } from "../state";
import { tag, tagAll } from "../tag";

function groupPlans(responses) {
  const index = {};
  for (const resp of responses) {
    if (!index[resp.tag.loc]) {
      index[resp.tag.loc] = [];
    }
    if (!index[resp.tag.loc][resp.tag.desc]) {
      index[resp.tag.loc][resp.tag.desc] = [];
    }
    index[resp.tag.loc][resp.tag.desc].push(resp);
  }
  return Object.keys(index)
    .sort()
    .map((loc) => ({
      loc,
      descs: Object.keys(index[loc])
        .sort()
        .map((desc) => ({ desc, responses: index[loc][desc] })),
    }));
}

class Sidebar extends React.Component {
  render() {
    const grouped = groupPlans(
      tagAll(this.props.responses, this.props.geotagView),
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
          {grouped.map(({ loc, descs }, idx) => (
            <Fragment key={idx}>
              <h5>
                <b>{loc}</b>
              </h5>
              {descs.map(({ desc, responses }, idx) => (
                <Fragment key={idx}>
                  <b>{desc}</b>
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
            <h5>
              <b>{subject.name}</b>
            </h5>
          <div>Working at {subject.org} in {subject.tag.loc}</div>
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
