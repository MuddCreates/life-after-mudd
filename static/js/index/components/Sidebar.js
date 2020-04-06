"use strict";

import React from "react";
import { Fragment } from "react";
import { connect } from "react-redux";

import { sidebarWidthFraction, sidebarHeightFraction } from "../config";
import { tagAll } from "../tag";

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
    const style = {
      position: "absolute",
      padding: "10px",
      background: "white",
      zIndex: "3",
    };
    if (this.props.showVertically) {
      Object.assign(style, {
        left: `${(1 - sidebarWidthFraction) * 100}%`,
        top: "0",
        width: `${sidebarWidthFraction * 100}%`,
        height: "100%",
      });
    } else {
      Object.assign(style, {
        left: "0",
        top: `${(1 - sidebarHeightFraction) * 100}%`,
        width: "100%",
        height: `${sidebarHeightFraction * 100}%`,
      });
    }
    return (
      <div style={style}>
        {grouped.map(({ loc, descs }, idx) => (
          <Fragment key={idx}>
            <h5>
              <b>{loc}</b>
            </h5>
            {descs.map(({ desc, responses }, idx) => (
              <Fragment key={idx}>
                <b>{desc}</b>
                {responses.map((resp, idx) => (
                  <div key={idx}>{resp.name || "Anonymous"}</div>
                ))}
              </Fragment>
            ))}
          </Fragment>
        ))}
      </div>
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
    showVertically: state.landscape,
  };
})(Sidebar);
