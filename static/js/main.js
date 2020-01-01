mapboxgl.accessToken =
  "pk.eyJ1IjoicmF4b2Q1MDIiLCJhIjoiY2s0cmZmYW5kMnNodjNrbnZ0Y3E4emJxbiJ9.ejylhHRJ_dhT3uF3nQSJOA";

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v9"
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
              coordinates: [0, 0]
            }
          }
        ]
      }
    },
    layout: {
      "icon-image": "circle-15"
    }
  });
});
