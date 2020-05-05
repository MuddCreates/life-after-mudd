"use strict";

export function formatCity(city, state, country) {
  // User will assume cities are in the US unless otherwise specified.
  if (country === "United States") {
    country = "";
  }
  return [city, state, country].filter(Boolean).join(", ");
}

function formatPlan(path, org) {
  let plan;
  switch (path) {
    case "Job":
      plan = "Working";
      break;
    case "Graduate school":
      plan = "Studying";
      break;
    case "Gap year":
      plan = "Taking a gap year";
      break;
    case "Not sure":
      plan = "No plans yet";
      break;
    default:
      plan = path;
      break;
  }
  if (org) {
    plan += " at " + org;
  }
  return plan;
}

export function formatLongTermPlan(resp) {
  return formatPlan(resp.path, resp.org);
}

export function formatSummerPlan(resp) {
  return formatPlan(resp.summerPlans, resp.summerOrg);
}
