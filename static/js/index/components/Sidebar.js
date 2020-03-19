"use strict";

import React from "react";
import { connect } from "react-redux";

import { failHard } from "../error";
import { GeotagView } from "../state";

function formatCity(city, state, country) {
  // User will assume cities are in the US unless otherwise specified.
  if (country === "United States") {
    country = "";
  }
  return (
    [city, state, country].filter(Boolean).join(", ") || "No location given"
  );
}

function extractPlan(response, view) {
  const summerPlansAvailable =
    response.summerPlans ||
    response.summerCity ||
    response.summerState ||
    response.summerOrg ||
    response.summerCountry
      ? true
      : false;
  let showSummerPlans;
  switch (view) {
    case GeotagView.standard:
      showSummerPlans = false;
      break;
    case GeotagView.summer:
      showSummerPlans = summerPlansAvailable;
      break;
    default:
      failHard(`Unknown geotag view: ${view}`);
  }
  const info = showSummerPlans
    ? {
        plan: response.summerPlans,
        city: response.summerCity,
        state: response.summerState,
        country: response.summerCountry,
        org: response.summerOrg,
      }
    : {
        plan: response.path,
        city: response.city,
        state: response.state,
        country: response.country,
        org: response.org,
      };
  switch (info.plan) {
    case "Job":
      info.plan = "Working";
      break;
    case "Graduate school":
      info.plan = "Studying";
      break;
    case "Gap year":
      info.plan = "Taking a gap year";
      break;
    case "Not sure":
      info.plan = "Not sure what";
      break;
    case "":
      info.plan = "No plans shared";
      break;
  }
  info.desc = info.plan;
  if (info.org) {
    info.desc += " at " + info.org;
  }
  info.loc = formatCity(info.city, info.state, info.country);
  return { ...response, plan: info };
}

function groupPlans(responses) {
  const index = {};
  for (const resp of responses) {
    if (!index[resp.plan.loc]) {
      index[resp.plan.loc] = [];
    }
    if (!index[resp.plan.loc][resp.plan.desc]) {
      index[resp.plan.loc][resp.plan.desc] = [];
    }
    index[resp.plan.loc][resp.plan.desc].push(resp);
  }
  return Object.keys(index)
    .sort()
    .map(loc => ({
      loc,
      descs: Object.keys(index[loc])
        .sort()
        .map(desc => ({ desc, responses: index[loc][desc] })),
    }));
}

class Sidebar extends React.Component {
  render() {
    const grouped = groupPlans(
      this.props.responses.map(resp =>
        extractPlan(resp, this.props.geotagView),
      ),
    );
    return (
      <div
        style={{
          position: "absolute",
          left: "70%",
          top: "0",
          width: "30%",
          height: "100%",
          padding: "10px",
          background: "white",
        }}
      >
        {grouped.map(({ loc, descs }) => (
          <>
            <h5>
              <b>{loc}</b>
            </h5>
            {descs.map(({ desc, responses }) => (
              <>
                <b>{desc}</b>
                {responses.map(resp => (
                  <div>{resp.name || "Anonymous"}</div>
                ))}
              </>
            ))}
          </>
        ))}
      </div>
    );
  }
}

export default connect(state => ({
  responses: state.displayedResponses,
  geotagView: state.geotagView,
}))(Sidebar);
