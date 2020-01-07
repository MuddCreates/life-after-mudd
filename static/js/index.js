// https://github.com/parcel-bundler/parcel/issues/871#issuecomment-367899522
import "babel-polyfill";

import { initMapbox } from "./shared.js";

initMapbox();

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v9",
});

map.on("load", function() {
  map.addLayer({
    id: "points",
    type: "symbol",
    source: {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [0, 0],
            },
          },
        ],
      },
    },
    layout: {
      "icon-image": "circle-15",
    },
  });
});
