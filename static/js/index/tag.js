"use strict";

import { failHard } from "./error";
import { GeotagView } from "./state";

function formatCity(city, state, country) {
  // User will assume cities are in the US unless otherwise specified.
  if (country === "United States") {
    country = "";
  }
  return (
    [city, state, country].filter(Boolean).join(", ") || "No location given"
  );
}

export function tag(response, view) {
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
        latLong: response.summerOrgLatLong || response.summerCityLatLong,
      }
    : {
        plan: response.path,
        city: response.city,
        state: response.state,
        country: response.country,
        org: response.org,
        latLong: response.orgLatLong || response.cityLatLong,
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
  return { ...response, tag: info };
}

export function tagAll(responses, view) {
  return responses && responses.map(resp => tag(resp, view));
}
