"use strict";

export function formatCity(city, state, country) {
  // User will assume cities are in the US unless otherwise specified.
  if (country === "United States") {
    country = "";
  }
  return [city, state, country].filter(Boolean).join(", ");
}

export function formatPlan(resp) {
  let plan;
  switch (resp.path) {
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
      plan = resp.path;
      break;
  }
  if (resp.org) {
    plan += " at " + resp.org;
  }
  return plan;
}
