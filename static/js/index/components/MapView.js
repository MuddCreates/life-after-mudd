"use strict";

import $ from "jquery";
import React from "react";
import ReactMapboxGl from "react-mapbox-gl";
import { Feature, Layer } from "react-mapbox-gl";
import { connect } from "react-redux";

import { mapboxAccessToken } from "../../shared";
import { store } from "../redux";
import { GeotagView } from "../state";

const CIRCLE_RADIUS = 10;
const HIGHLIGHT_BBOX_RADIUS = 10;

const Map = ReactMapboxGl({
  accessToken: mapboxAccessToken,
});

function geotagResponses(responses, geotagView) {
  const filtered = [];
  for (const response of responses) {
    let latLong;
    switch (geotagView) {
      case GeotagView.standard:
        latLong =
          response.orgLatLong ||
          response.cityLatLong ||
          response.summerOrgLatLong ||
          response.summerCityLatLong;
        break;
      default:
        failHard(new Error(`Unknown geotag view: ${geotagView}`));
        return [];
    }
    if (latLong === null) {
      continue;
    }
    filtered.push({ ...response, geotag: latLong });
  }
  return filtered;
}

class MapView extends React.Component {
  constructor(props) {
    super(props);
    // https://github.com/alex3165/react-mapbox-gl/issues/557
    this.initialBounds = [
      [-126, 24],
      [-66, 50],
    ];
    // Keep track of this behind React's back, as it's used to mess
    // with state that React doesn't know how to deal with.
    this.mouseState = "up";
  }
  render() {
    let layer = null;
    if (this.props.responses !== null) {
      layer = (
        <Layer
          id="people"
          type="circle"
          geoJSONSourceOptions={{ generateId: true }}
          paint={{
            "circle-color": [
              "case",
              // nb this case statement makes no sense to me, I tried
              // every logic combination until I got the one I
              // wanted. See:
              //
              // https://blog.mapbox.com/going-live-with-electoral-maps-a-guide-to-feature-state-b520e91a22d
              ["boolean", ["feature-state", "hover"], false],
              "#eaaa00", // HMC yellow
              "#000000",
            ],
            "circle-radius": CIRCLE_RADIUS,
          }}
        >
          {this.props.responses.map((resp, idx) => (
            <Feature
              coordinates={[resp.geotag.lng, resp.geotag.lat]}
              key={idx}
            />
          ))}
        </Layer>
      );
    }
    return (
      <div>
        <Map
          style="mapbox://styles/raxod502/ck6nxepcj03jv1jqe6a7p8om4"
          fitBounds={this.initialBounds}
          fitBoundsOptions={{ duration: 0 }}
          onClick={this.onMouseEvent}
          onMouseDown={this.onMouseEvent}
          onMouseMove={this.onMouseEvent}
          onMouseUp={this.onMouseEvent}
          containerStyle={{ height: "100vh" }}
        >
          {layer}
        </Map>
      </div>
    );
  }
  getActiveIds = (map, point) => {
    // https://docs.mapbox.com/mapbox-gl-js/example/queryrenderedfeatures-around-point/
    const bbox = [
      [point.x - HIGHLIGHT_BBOX_RADIUS, point.y - HIGHLIGHT_BBOX_RADIUS],
      [point.x + HIGHLIGHT_BBOX_RADIUS, point.y + HIGHLIGHT_BBOX_RADIUS],
    ];
    const activeIds = {};
    for (const feature of map.queryRenderedFeatures(bbox, {
      layers: ["people"],
    })) {
      activeIds[feature.id] = true;
    }
    return activeIds;
  };
  onMouseEvent = (map, e) => {
    if (!map.getLayer("people")) {
      // Map not fully loaded yet, refrain from messing with it to
      // avoid errors.
      return;
    }
    if (e.type === "mousedown") {
      this.mouseState = "down";
    } else if (e.type === "mouseup") {
      this.mouseState = "up";
    } else if (e.type === "mousemove" && this.mouseState !== "up") {
      this.mouseState = "drag";
    }
    const activeIds = this.getActiveIds(map, e.point);
    // This follows the conventions set by Google Maps.
    if (!$.isEmptyObject(activeIds)) {
      map.getCanvas().style.cursor = "pointer";
    } else if (this.mouseState === "drag") {
      map.getCanvas().style.cursor = "move";
    } else {
      map.getCanvas().style.cursor = "default";
    }
    this.props.responses.forEach((_response, idx) => {
      map.setFeatureState(
        { source: "people", id: idx },
        { hover: activeIds[idx] || false },
      );
    });
    if (e.type === "click") {
      let selected = this.props.responses.filter(
        (_response, idx) => activeIds[idx],
      );
      // Compute center of all the selected points.
      if (selected.length !== 0) {
        store.dispatch({
          type: "SHOW_DETAILS",
          responses: selected,
        });
      } else {
        store.dispatch({
          type: "HIDE_DETAILS",
        });
      }
    }
  };
}

export default connect(state => ({
  responses:
    state.responses && geotagResponses(state.responses, state.geotagView),
}))(MapView);
