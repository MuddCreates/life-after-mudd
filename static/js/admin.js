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
    body: JSON.stringify(data),
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
    if (!(r.city || r.state || r.country)) {
      const csc = parseCityStateCountry(r.rawCityState);
      r.city = r.city || csc.city;
      r.state = r.state || csc.state;
      r.country = r.country || csc.country;
    }
    r.summerCityState = r.rawSummerCityState;
    if (r.rawSummerPath === "Same as above") {
      r.summerPath = r.path;
      r.summerOrg = r.summerOrg || r.org;
      r.summerCityState = r.summerCityState || r.rawCityState;
      if (!(r.summerCity || r.summerState || r.summerCountry)) {
        const csc = parseCityStateCountry(r.summerCityState);
        r.summerCity = r.summerCity || csc.city;
        r.summerState = r.summerState || csc.state;
        r.summerCountry = r.summerCountry || csc.country;
      }
    }
    r.comments = r.comments || r.rawComments;
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
    style: "mapbox://styles/mapbox/streets-v9",
  });
  const search = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
  });
  search.setFlyTo({ duration: 0 });
  map.addControl(search);
  $("#" + id)
    .data("map", map)
    .data("search", search);
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
  [r.cityLat, r.cityLong] = $("#city-lat-input")
    .val()
    .split(", ");
  [r.orgLat, r.orgLong] = $("#org-coords-input")
    .val()
    .split(", ");
  r.comments = $("#comments-input").val();
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
        text: response.name,
      }),
    );
  });
  $("#response-dropdown").on("change", () => {
    const idx = parseInt($("#response-dropdown").val());
    $("body").data("idx", idx);
    populateForm(idx);
  });
  $("#next-button").on("click", submitForm);
  $("#response-form").on("submit", submitForm);
  $("#major-dropdown a").on("click", function() {
    const value = $(this).text();
    $("#major-input").val(value);
  });
  $("#path-dropdown a").on("click", function() {
    const value = $(this).text();
    $("#path-input").val(value);
  });
  $("#summer-path-dropdown a").on("click", function() {
    const value = $(this).text();
    $("#summer-path-input").val(value);
  });
  initMapbox();
  for (const { cityMap, coordsInput, setButton } of [
    {
      cityMap: $("#city-map"),
      coordsInput: $("#city-coords-input"),
      setButton: $("#set-city-button"),
    },
    {
      cityMap: $("#org-map"),
      coordsInput: $("#org-coords-input"),
      setButton: $("#set-org-button"),
    },
    {
      cityMap: $("#summer-city-map"),
      coordsInput: $("#summer-city-coords-input"),
      setButton: $("#set-summer-city-button"),
    },
    {
      cityMap: $("#summer-org-map"),
      coordsInput: $("#summer-org-coords-input"),
      setButton: $("#set-summer-org-button"),
    },
  ]) {
    initMap(cityMap.attr("id"));
    const setCoords = coords => {
      const { latitude, longitude } =
        coords || cityMap.data("search").getProximity();
      coordsInput.val(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    };
    setButton.on("click", () => setCoords());
    cityMap.data("search").on("result", response => {
      const idx = $("body").data("idx");
      if (!coordsInput.val() && !responses[idx].processed) {
        const [longitude, latitude] = response.result.center;
        setCoords({ latitude, longitude });
      }
    });
  }
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
  $("#summer-path-raw-input").val(r.rawSummerPath);
  $("#summer-org-raw-input").val(r.rawSummerOrg);
  $("#summer-city-state-raw-input").val(r.rawSummerCityState);
  $("#name-input").val(r.name);
  $("#email-input").val(r.email);
  $("#major-input").val(r.major);
  $("#path-input").val(r.path);
  $("#org-input").val(r.org);
  $("#city-input").val(r.city);
  $("#state-input").val(r.state);
  $("#country-input").val(r.country);
  $("#summer-path-input").val(r.summerPath);
  $("#summer-org-input").val(r.summerOrg);
  $("#summer-city-input").val(r.summerCity);
  $("#summer-state-input").val(r.summerState);
  $("#summer-country-input").val(r.summerCountry);
  $("#comments-raw-input").val(r.rawComments);
  $("#comments-input").val(r.comments);
  for (const cfg of [
    {
      rawCityState: "rawCityState",
      city: "city",
      state: "state",
      country: "country",
      cityMap: "#city-map",
      orgMap: "#org-map",
    },
    {
      rawCityState: "summerCityState",
      city: "summerCity",
      state: "summerState",
      country: "summerCountry",
      cityMap: "#summer-city-map",
      orgMap: "#summer-org-map",
    },
  ]) {
    // hack around race condition using timeout
    setTimeout(() => {
      let cityQuery = r[cfg.rawCityState];
      if (r.processed) {
        cityQuery = [r[cfg.city], r[cfg.state], r[cfg.country]].join(", ");
      }
      $(cfg.cityMap)
        .data("search")
        .query(cityQuery);
      const onResults = response => {
        if (response.features) {
          const [longitude, latitude] = response.features[0].center;
          $(cfg.orgMap)
            .data("search")
            .setProximity({ latitude, longitude });
        }
        $(cfg.orgMap)
          .data("search")
          .query(r.org || r.rawOrg);
      };
      const prevOnResults = $(cfg.cityMap).data("onResults");
      if (prevOnResults) {
        $(cfg.cityMap)
          .data("search")
          .off("results", prevOnResults);
      }
      $(cfg.cityMap)
        .data("search")
        .on("results", onResults);
    }, 100);
  }
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
