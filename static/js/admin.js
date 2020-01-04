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
    r.email = r.email || r.rawEmail.replace("g.hmc.edu", "hmc.edu");
    r.name = r.name || r.rawName;
    r.major = r.major || r.rawMajor;
    r.path = r.path || r.rawPath;
    r.org = r.org || r.rawOrg;
    if (!(r.city && r.state && r.country)) {
      const csc = parseCityStateCountry(r.rawCityState);
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

function initMap(id) {
  const map = new mapboxgl.Map({
    container: id,
    style: "mapbox://styles/mapbox/streets-v9"
  });
  const search = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl
  });
  map.addControl(search);
  $("#" + id)
    .data("map", map)
    .data("search", search);
}

function setCityCoords(coords) {
  const [longitude, latitude] =
    coords ||
    $("#city-map")
      .data("search")
      .getProximity();
  $("#city-lat-input").val(latitude);
  $("#city-long-input").val(longitude);
}

function setOrgCoords(coords) {
  const [longitude, latitude] =
    coords ||
    $("#org-map")
      .data("search")
      .getProximity();
  $("#org-lat-input").val(latitude);
  $("#org-long-input").val(longitude);
}

function saveFormData() {
  const responses = $("body").data("responses");
  const idx = $("body").data("idx");
  const r = responses[idx];
  r.name = $("#name-input").val();
  r.email = $("#email-input").val();
  r.major = $("#major-input").val();
  r.path = $("#path-input").val();
  r.org = $("#org-input").val();
  r.city = $("#city-input").val();
  r.state = $("#state-input").val();
  r.country = $("#country-input").val();
  r.cityLat = $("#city-lat-input").val();
  r.cityLong = $("#city-long-input").val();
  r.orgLat = $("#org-lat-input").val();
  r.orgLong = $("#org-long-input").val();
  r.processed = "yes";
}

function submitForm() {
  saveFormData();
  const responses = $("body").data("responses");
  setData(responses);
  $("body").data("idx", getDefaultIndex(responses));
  populateForm();
}

function initPage() {
  const responses = $("body").data("responses");
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
  $("#set-city-button").on("click", setCityCoords);
  $("#set-org-button").on("click", setOrgCoords);
  $("#next-button").on("click", submitForm);
  $("#response-form").on("submit", submitForm);
  initMapbox();
  initMap("city-map");
  initMap("org-map");
  $("#city-map")
    .data("search")
    .on("result", response => {
      const idx = $("body").data("idx");
      if (
        !$("#city-lat-input").val() &&
        !$("#city-long-input").val() &&
        !responses[idx].processed
      ) {
        setCityCoords(response.result.center);
      }
    });
  $("#org-map")
    .data("search")
    .on("result", response => {
      const idx = $("body").data("idx");
      if (
        !$("#org-lat-input").val() &&
        !$("#org-long-input").val() &&
        !responses[idx].processed
      ) {
        setOrgCoords(response.result.center);
      }
    });
}

function populateForm() {
  const responses = $("body").data("responses");
  const idx = $("body").data("idx");
  const r = responses[idx];
  $("#name-raw-input").val(r.rawName);
  $("#email-raw-input").val(r.rawEmail);
  $("#major-raw-input").val(r.rawMajor);
  $("#path-raw-input").val(r.rawPath);
  $("#org-raw-input").val(r.rawOrg);
  $("#city-state-raw-input").val(r.rawCityState);
  $("#name-input").val(r.name);
  $("#email-input").val(r.email);
  $("#major-input").val(r.major);
  $("#path-input").val(r.path);
  $("#org-input").val(r.org);
  $("#city-input").val(r.city);
  $("#state-input").val(r.state);
  $("#country-input").val(r.country);
  const cityQuery = r.processed
    ? [r.city, r.state, r.country].join(", ")
    : r.rawCityState;
  $("#city-map")
    .data("search")
    .query(cityQuery);
  const onResults = response => {
    if (response.features) {
      const [longitude, latitude] = response.features[0].center;
      $("#org-map")
        .data("search")
        .setProximity({ latitude, longitude });
    }
    $("#org-map")
      .data("search")
      .query(r.org || r.rawOrg);
  };
  const prevOnResults = $("#city-map").data("onResults");
  if (prevOnResults) {
    $("#city-map")
      .data("search")
      .off("results", prevOnResults);
  }
  $("#city-map")
    .data("search")
    .on("results", onResults);
}

async function main() {
  let responses = await getData();
  responses = fillDefaults(responses);
  $("body").data("responses", responses);
  $("body").data("idx", getDefaultIndex(responses));
  initPage();
  populateForm();
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
