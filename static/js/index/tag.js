"use strict";

export function formatCity(city, state, country) {
  // User will assume cities are in the US unless otherwise specified.
  if (country === "United States") {
    country = "";
  }
  return [city, state, country].filter(Boolean).join(", ");
}

export function formatPlan(resp) {
  let plan = resp.path;
  switch (plan) {
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
      plan = "Not sure what";
      break;
  }
  if (resp.org) {
    plan += " at " + resp.org;
  }
  return plan;
}
