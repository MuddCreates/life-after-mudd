import { initMapbox } from "./shared.js";

import { UsaStates } from "usa-states";

// https://github.com/parcel-bundler/parcel/issues/871#issuecomment-367899522
import "babel-polyfill";

const USA_STATES = new UsaStates().states;

async function getData() {
  const resp = await fetch("/api/v1/admin/data");
  if (!resp.ok) {
    throw new Error(`HTTP status ${resp.status}`);
  }
  const data = await resp.json();
  return data;
}

async function setData(data) {
  const resp = await fetch("/api/v1/admin/data", {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!resp.ok) {
    throw new Error(`HTTP status ${resp.status}`);
  }
}

function normalizeWhitespace(str) {
  let parts = str.split(/\s+/);
  parts = parts.filter(part => part);
  return parts.join(" ");
}

// Taken from <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions>
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function containsWordCaseInsensitive(string, pattern) {
  return !!string.match(new RegExp(`\b` + escapeRegExp(pattern) + `\b`, "i"));
}

function replaceWordCaseInsensitive(string, pattern, replacement) {
  return string.replace(
    new RegExp(`\b` + escapeRegExp(pattern) + `\b`, "ig"),
    replacement
  );
}

function parseCityStateCountry(cityState) {
  cityState = normalizeWhitespace(cityState.replace(/,/g, " "));
  for (const state of USA_STATES) {
    if (
      containsWordCaseInsensitive(cityState, state.name) ||
      containsWordCaseInsensitive(cityState, state.abbreviation)
    ) {
      cityState = replaceWordCaseInsensitive(cityState, state.name, "");
      cityState = replaceWordCaseInsensitive(cityState, state.abbreviation, "");
      return {
        city: normalizeWhitespace(cityState),
        state: state.abbreviation,
        country: "United States"
      };
    }
  }
  return {
    city: cityState,
    state: "",
    country: "United States"
  };
}

function fillDefaults(responses) {
  return responses.map(r => {
    r = { ...r };
    if (r.processed) {
      return r;
    }
    r.email = r.email || r.emailRaw.replace("g.hmc.edu", "hmc.edu");
    r.name = r.name || r.nameRaw;
    r.major = r.major || r.majorRaw;
    r.path = r.path || r.pathRaw;
    r.org = r.org || r.orgRaw;
    if (!(r.city && r.state && r.country)) {
      const csc = parseCityStateCountry(r.cityStateRaw);
      r.city = r.city || csc.city;
      r.state = r.state || csc.state;
      r.country = r.country || csc.country;
    }
    return r;
  });
}

function getDefaultIndex(responses) {
  let idx = 0;
  for (const response of responses) {
    if (!response.processed) {
      return idx;
    }
    idx += 1;
  }
  return responses.length - 1;
}

function initPage(responses) {
  $("#response-dropdown")
    .find("option")
    .remove();
  responses.forEach((response, idx) => {
    $("#response-dropdown").append(
      $("<option>", {
        value: idx,
        text: response.name
      })
    );
  });
  initMapbox();
  return {
    cityMap: new mapboxgl.Map({
      container: "city-map",
      style: "mapbox://styles/mapbox/streets-v9"
    }),
    orgMap: new mapboxgl.Map({
      container: "org-map",
      style: "mapbox://styles/mapbox/streets-v9"
    })
  };
}

function selectResponse(responses, idx) {
  const r = responses[idx];
  $("#name-raw-input").val(r.nameRaw);
  $("#email-raw-input").val(r.emailRaw);
  $("#major-raw-input").val(r.majorRaw);
  $("#path-raw-input").val(r.pathRaw);
  $("#org-raw-input").val(r.orgRaw);
  $("#city-state-raw-input").val(r.cityStateRaw);
  $("#name-input").val(r.name);
  $("#email-input").val(r.email);
  $("#major-input").val(r.major);
  $("#path-input").val(r.path);
  $("#org-input").val(r.org);
  $("#city-input").val(r.city);
  $("#state-input").val(r.state);
  $("#country-input").val(r.country);
}

async function main() {
  let responses = await getData();
  responses = fillDefaults(responses);
  initPage(responses);
  selectResponse(responses, getDefaultIndex(responses));
}

main().catch(console.error);

// https://github.com/parcel-bundler/parcel/issues/2894#issuecomment-544607028
if (module.hot) {
  module.hot.accept(function() {
    setTimeout(function() {
      location.reload();
    }, 300);
  });
}
