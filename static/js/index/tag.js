"use strict";

export function formatCity(city, state, country) {
  // User will assume cities are in the US unless otherwise specified.
  if (country === "United States") {
    country = "";
  }
  return [city, state, country].filter(Boolean).join(", ");
}

export function formatCitySuffix(city) {
  if (city) {
    return " in " + city;
  } else {
    return "";
  }
}

function formatPlan(path, org) {
  let plan = path;
  switch (path) {
    case "Job":
    case "Internship":
      plan = "Working";
      break;
    case "Graduate school":
      if (org) {
        plan = "Studying";
      }
      break;
    case "Not sure":
      plan = "No plans yet";
      break;
    case "Job and graduate school":
      plan = "Working and studying";
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
