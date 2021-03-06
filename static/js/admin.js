// https://github.com/parcel-bundler/parcel/issues/871#issuecomment-367899522
// https://babeljs.io/docs/en/next/babel-polyfill.html
import "regenerator-runtime/runtime";

import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "bootstrap";
import $ from "jquery";
import { UsaStates } from "usa-states";

import { mapboxAccessToken } from "./shared.js";

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
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    throw new Error(`HTTP status ${resp.status}`);
  }
}

function normalizeWhitespace(str) {
  let parts = str.split(/\s+/);
  parts = parts.filter((part) => part);
  return parts.join(" ");
}

// Taken from <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions>
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function containsWordCaseInsensitive(string, pattern) {
  return !!string.match(new RegExp("\\b" + escapeRegExp(pattern) + "\\b", "i"));
}

function reverseString(string) {
  return [...string].reverse().join("");
}

function deleteLastWordCaseInsensitive(string, pattern) {
  return reverseString(
    reverseString(string).replace(
      new RegExp("\\b" + escapeRegExp(reverseString(pattern)) + "\\b", "i"),
      "",
    ),
  );
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function parseCityStateCountry(cityState) {
  if (!cityState.trim()) {
    return { city: "", state: "", country: "" };
  }
  let normCityState = normalizeWhitespace(cityState.replace(/,/g, " "));
  for (const state of USA_STATES) {
    if (containsWordCaseInsensitive(normCityState, state.abbreviation)) {
      normCityState = deleteLastWordCaseInsensitive(
        normCityState,
        state.abbreviation,
      );
    } else if (containsWordCaseInsensitive(normCityState, state.name)) {
      normCityState = deleteLastWordCaseInsensitive(normCityState, state.name);
    } else {
      continue;
    }
    return {
      city: capitalize(normalizeWhitespace(normCityState)),
      state: state.abbreviation,
      country: "United States",
    };
  }
  return {
    city: capitalize(cityState.trim()),
    state: "",
    country: "United States",
  };
}

function clean(field) {
  field = field.trim();
  if (["N/A", "NA"].indexOf(field.toUpperCase()) != -1) {
    field = "";
  }
  return field;
}

function fillDefaults(responses) {
  return responses.map((r) => {
    r = { ...r };
    // Make it so form response updates are automatically queued for
    // reprocessing.
    if (r.processed === r.timestamp) {
      return r;
    } else {
      r.processed = "";
    }
    // Do this 'cause we read these fields directly to populate the
    // form.
    r.rawCityState = clean(r.rawCityState);
    r.rawSummerCityState = clean(r.rawSummerCityState);
    r.email = r.email || r.rawEmail.replace("g.hmc.edu", "hmc.edu");
    r.name = clean(r.name || r.rawName);
    if (!r.major) {
      r.major = r.rawMajor
        .split(", ")
        .map((x) => capitalize(clean(x)))
        .filter((x) => x)
        .join(" + ");
    }
    r.path = clean(r.path || r.rawPath);
    r.org = capitalize(clean(r.org || r.rawOrg));
    if (r.org.toUpperCase() == "FB") {
      r.org = "Facebook";
    }
    if (!(r.city || r.state || r.country)) {
      const csc = parseCityStateCountry(r.rawCityState);
      r.city = r.city || csc.city;
      r.state = r.state || csc.state;
      r.country = r.country || csc.country;
    }
    r.summerPlans = clean(r.summerPlans || r.rawSummerPlans);
    r.summerOrg = clean(r.summerOrg || r.rawSummerOrg);
    if (!(r.summerCity || r.summerState || r.summerCountry)) {
      const csc = parseCityStateCountry(r.rawSummerCityState);
      r.summerCity = r.summerCity || csc.city;
      r.summerState = r.summerState || csc.state;
      r.summerCountry = r.summerCountry || csc.country;
    }
    r.comments = clean(r.comments || r.rawComments);
    r.postGradEmail = clean(
      r.postGradEmail || r.rawPostGradEmail.replace("g.hmc.edu", "hmc.edu"),
    );
    r.phoneNumber = clean(r.phoneNumber || r.rawPhoneNumber);
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
  return 0;
}

function initMap(id) {
  const map = new mapboxgl.Map({
    container: id,
    style: "mapbox://styles/mapbox/streets-v9",
  });
  const search = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    trackProximity: false,
  });
  search.__onChange = search._onChange;
  search._onChange = function () {
    this._inputEl._focus = this._inputEl.focus;
    this._inputEl.focus = () => {};
    search.__onChange();
    this._inputEl.focus = this._inputEl._focus;
  };
  search.setFlyTo({ duration: 0 });
  map.addControl(search);
  $("#" + id)
    .data("map", map)
    .data("origBounds", map.getBounds())
    .data("search", search);
}

function saveFormData() {
  const responses = $("body").data("responses");
  const year = $("body").data("year");
  const idx = $("body").data("idx");
  const r = responses[year][idx];
  r.name = $("#name-input").val();
  r.email = $("#email-input").val();
  r.major = $("#major-input").val();
  r.path = $("#path-input").val();
  r.city = $("#city-input").val();
  r.state = $("#state-input").val();
  r.country = $("#country-input").val();
  if ($("#city-coords-input").val()) {
    [r.cityLat, r.cityLong] = $("#city-coords-input").val().split(", ");
  } else {
    r.cityLat = "";
    r.cityLong = "";
  }
  r.org = $("#org-input").val();
  if ($("#org-coords-input").val()) {
    [r.orgLat, r.orgLong] = $("#org-coords-input").val().split(", ");
  } else {
    r.orgLat = "";
    r.orgLong = "";
  }
  r.summerPlans = $("#summer-plans-input").val();
  r.summerCity = $("#summer-city-input").val();
  r.summerState = $("#summer-state-input").val();
  r.summerCountry = $("#summer-country-input").val();
  if ($("#summer-city-coords-input").val()) {
    [r.summerCityLat, r.summerCityLong] = $("#summer-city-coords-input")
      .val()
      .split(", ");
  } else {
    r.summerCityLat = "";
    r.summerCityLong = "";
  }
  r.summerOrg = $("#summer-org-input").val();
  if ($("#summer-org-coords-input").val()) {
    [r.summerOrgLat, r.summerOrgLong] = $("#summer-org-coords-input")
      .val()
      .split(", ");
  } else {
    r.summerOrgLat = "";
    r.summerOrgLong = "";
  }
  r.comments = $("#comments-input").val();
  r.postGradEmail = $("#post-grad-email-input").val();
  r.phoneNumber = $("#phone-number-input").val();
  r.facebookProfile = $("#facebook-profile-input").val();
  r.orgLink = $("#organization-link-input").val();
  r.summerOrgLink = $("#summer-organization-link-input").val();
  r.processed = r.timestamp;
}

function submitForm() {
  saveFormData();
  const responses = $("body").data("responses");
  setData(responses);
  const year = $("body").data("year");
  $("body").data("idx", getDefaultIndex(responses[year]));
  populateForm();
}

async function download() {
  try {
    const resp = await fetch("/api/v1/admin/download", {
      method: "post",
    });
    if (!resp.ok) {
      throw new Error(`HTTP status ${resp.status}`);
    }
  } catch (err) {
    alert(`Failed to download: ${err}`);
    return;
  }
  setup(await getData());
}

async function upload() {
  try {
    const resp = await fetch("/api/v1/admin/upload", {
      method: "post",
    });
    if (!resp.ok) {
      throw new Error(`HTTP status ${resp.status}`);
    }
  } catch (err) {
    alert(`Failed to upload: ${err}`);
    return;
  }
}

function locateCity({ processed, summer }) {
  const cityInput = summer ? $("#summer-city-input") : $("#city-input");
  const stateInput = summer ? $("#summer-state-input") : $("#state-input");
  const rawCityStateInput = summer
    ? $("#summer-city-state-raw-input")
    : $("#city-state-raw-input");
  const cityMap = summer ? $("#summer-city-map") : $("#city-map");
  cityMap.data("search")._clear();
  // Don't use country input because for some reason including
  // "United States" at the end of a search query sometimes causes
  // the Mapbox geocoder to malfunction weirdly??
  const query =
    processed && cityInput.val() && stateInput.val()
      ? [cityInput.val(), stateInput.val()].join(", ")
      : rawCityStateInput.val();
  if (query) {
    cityMap.data("search").query(query);
  } else {
    resetMap(cityMap);
    if (cityMap.data("onFirstResult")) {
      cityMap.data("onFirstResult")();
      cityMap.data("onFirstResult", null);
    }
  }
}

function locateOrg({ summer }) {
  const orgInput = summer ? $("#summer-org-input") : $("#org-input");
  const cityMap = summer ? $("#summer-city-map") : $("#city-map");
  const orgMap = summer ? $("#summer-org-map") : $("#org-map");
  orgMap.data("search")._clear();
  const proximity = cityMap.data("search").getProximity();
  if (proximity) {
    orgMap.data("search").setProximity(proximity);
  }
  const query = orgInput.val();
  if (query) {
    orgMap.data("search").query(query);
  } else {
    resetMap(orgMap);
    if (orgMap.data("onFirstResult")) {
      orgMap.data("onFirstResult")();
      orgMap.data("onFirstResult", null);
    }
  }
}

function resetMap(map) {
  map.data("search")._clear();
  map.data("search").setProximity(null);
  map.data("map").fitBounds(map.data("origBounds"), { duration: 0 });
}

let firstTime = true;

const populateResponses = () => {
  const responses = $("body").data("responses");
  const year = $("body").data("year");
  $("#response-dropdown").find("option").remove();
  responses[year].forEach((response, idx) => {
    $("#response-dropdown").append(
      $("<option>", {
        value: idx,
        text: response.name,
      }),
    );
  });
};

function initPage() {
  const responses = $("body").data("responses");
  const year = $("body").data("year");
  $("#year-dropdown").find("option").remove();
  Object.keys(responses).forEach((y) => {
    $("#year-dropdown").append(
      $("<option>", {
        value: y,
        text: y,
        selected: parseInt(y, 10) === year,
      }),
    );
  });
  populateResponses();

  if (!firstTime) {
    return;
  } else {
    firstTime = false;
  }
  $("#year-dropdown").on("change", () => {
    const year = parseInt($("#year-dropdown").val(), 10);
    $("body").data("year", year);
    $("body").data("idx", getDefaultIndex($("body").data("responses")[year]));
    populateResponses();
    populateForm();
  });
  $("#response-dropdown").on("change", () => {
    const idx = parseInt($("#response-dropdown").val());
    $("body").data("idx", idx);
    populateForm();
  });
  $("#next-button").on("click", submitForm);
  $("#response-form").on("submit", submitForm);
  $("#download-button").on("click", download);
  $("#upload-button").on("click", upload);
  $("#major-dropdown a").on("click", function () {
    const value = $(this).text();
    $("#major-input").val(value);
  });
  $("#path-dropdown a").on("click", function () {
    const value = $(this).text();
    $("#path-input").val(value);
  });
  $("#summer-path-dropdown a").on("click", function () {
    const value = $(this).text();
    $("#summer-path-input").val(value);
  });
  mapboxgl.accessToken = mapboxAccessToken;
  for (const { map, coordsInput, setButton } of [
    {
      map: $("#city-map"),
      coordsInput: $("#city-coords-input"),
      setButton: $("#set-city-button"),
    },
    {
      map: $("#org-map"),
      coordsInput: $("#org-coords-input"),
      setButton: $("#set-org-button"),
    },
    {
      map: $("#summer-city-map"),
      coordsInput: $("#summer-city-coords-input"),
      setButton: $("#set-summer-city-button"),
    },
    {
      map: $("#summer-org-map"),
      coordsInput: $("#summer-org-coords-input"),
      setButton: $("#set-summer-org-button"),
    },
  ]) {
    initMap(map.attr("id"));
    const setCoords = (coords) => {
      coords = coords || map.data("search").getProximity();
      if (coords) {
        const { latitude, longitude } = coords;
        coordsInput.val(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      } else {
        coordsInput.val("");
      }
    };
    setButton.on("click", () => setCoords());
    map.data("search").on("result", (response) => {
      const responses = $("body").data("responses");
      const year = $("body").data("year");
      const idx = $("body").data("idx");
      const [longitude, latitude] = response.result.center;
      map.data("search").setProximity({ latitude, longitude });
      if (!coordsInput.val() && !responses[year][idx].processed) {
        setCoords({ latitude, longitude });
      }
      if (map.data("onFirstResult")) {
        map.data("onFirstResult")();
        map.data("onFirstResult", null);
      }
    });
    map.data("search").on("results", (response) => {
      if (response.features.length === 0) {
        resetMap(map);
      }
    });
  }
  $("#locate-city-button").on("click", () =>
    locateCity({ processed: true, summer: false }),
  );
  $("#locate-summer-city-button").on("click", () =>
    locateCity({ processed: true, summer: true }),
  );
  $("#locate-org-button").on("click", () => locateOrg({ summer: false }));
  $("#locate-summer-org-button").on("click", () => locateOrg({ summer: true }));
}

function populateForm() {
  const responses = $("body").data("responses");
  const year = $("body").data("year");
  const idx = $("body").data("idx");
  $("#response-dropdown").val(idx);
  const r = responses[year][idx];
  {
    const btn = $("#next-button")[0];
    btn.classList.remove("btn-primary");
    btn.classList.remove("btn-warning");
    if (r?.processed) {
      btn.classList.add("btn-warning");
    } else {
      btn.classList.add("btn-primary");
    }
  }
  $("#name-raw-input").val(r?.rawName);
  $("#email-raw-input").val(r?.rawEmail);
  $("#major-raw-input").val(r?.rawMajor);
  $("#path-raw-input").val(r?.rawPath);
  $("#org-raw-input").val(r?.rawOrg);
  $("#city-state-raw-input").val(r?.rawCityState);
  $("#summer-plans-raw-input").val(r?.rawSummerPlans);
  $("#summer-org-raw-input").val(r?.rawSummerOrg);
  $("#summer-city-state-raw-input").val(r?.rawSummerCityState);
  $("#post-grad-email-raw-input").val(r?.rawPostGradEmail);
  $("#phone-number-raw-input").val(r?.rawPhoneNumber);
  $("#show-facebook-profile-raw-input").val(r?.rawShowFacebook);
  $("#name-input").val(r?.name);
  $("#email-input").val(r?.email);
  $("#major-input").val(r?.major);
  $("#path-input").val(r?.path);
  $("#org-input").val(r?.org);
  $("#city-input").val(r?.city);
  $("#state-input").val(r?.state);
  $("#country-input").val(r?.country);
  $("#summer-plans-input").val(r?.summerPlans);
  $("#summer-org-input").val(r?.summerOrg);
  $("#summer-city-input").val(r?.summerCity);
  $("#summer-state-input").val(r?.summerState);
  $("#summer-country-input").val(r?.summerCountry);
  $("#comments-raw-input").val(r?.rawComments);
  $("#comments-input").val(r?.comments);
  $("#post-grad-email-input").val(r?.postGradEmail);
  $("#phone-number-input").val(r?.phoneNumber);
  $("#facebook-profile-input").val(r?.facebookProfile);
  $("#organization-link-input").val(r?.orgLink);
  $("#summer-organization-link-input").val(r?.summerOrgLink);
  if (r?.cityLat && r?.cityLong) {
    $("#city-coords-input").val(`${r?.cityLat}, ${r?.cityLong}`);
  } else {
    $("#city-coords-input").val("");
  }
  if (r?.orgLat && r?.orgLong) {
    $("#org-coords-input").val(`${r?.orgLat}, ${r?.orgLong}`);
  } else {
    $("#org-coords-input").val("");
  }
  if (r?.summerCityLat && r?.summerCityLong) {
    $("#summer-city-coords-input").val(
      `${r?.summerCityLat}, ${r?.summerCityLong}`,
    );
  } else {
    $("#summer-city-coords-input").val("");
  }
  if (r?.summerOrgLat && r?.summerOrgLong) {
    $("#summer-org-coords-input").val(
      `${r?.summerOrgLat}, ${r?.summerOrgLong}`,
    );
  } else {
    $("#summer-org-coords-input").val("");
  }
  $("#city-map").data("onFirstResult", () => locateOrg({ summer: false }));
  $("#summer-city-map").data("onFirstResult", () =>
    locateOrg({ summer: true }),
  );
  locateCity({ processed: r?.processed === r?.timestamp, summer: false });
  locateCity({ processed: r?.processed === r?.timestamp, summer: true });
}

const getLatestYear = (responses) =>
  Math.max(...Object.keys(responses).map((year) => parseInt(year, 10)));

function setup(responses) {
  for (const year in responses) responses[year] = fillDefaults(responses[year]);
  const year = getLatestYear(responses);
  $("body").data("year", year);
  $("body").data("responses", responses);
  $("body").data("idx", getDefaultIndex(responses[year]));
  initPage();
  populateForm();
}

async function main() {
  setup(await getData());
}

main().catch(console.error);

// https://github.com/parcel-bundler/parcel/issues/2894#issuecomment-544607028
if (module.hot) {
  module.hot.accept(function () {
    setTimeout(function () {
      location.reload();
    }, 300);
  });
}
