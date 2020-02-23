"use strict";

import $ from "jquery";
import React from "react";
import ReactMapboxGl from "react-mapbox-gl";
import { Feature, Layer } from "react-mapbox-gl";
import { connect } from "react-redux";

import { mapboxAccessToken } from "../../shared";
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
    this.mouseDown = false;
  }
  render() {
    return (
      <Map
        style="mapbox://styles/raxod502/ck6nxepcj03jv1jqe6a7p8om4"
        center={[-97, 38]}
        zoom={[4.3]}
        onMouseDown={this.onMouseEvent}
        onMouseMove={this.onMouseEvent}
        onMouseUp={this.onMouseEvent}
        containerStyle={{
          position: "absolute",
          top: "0",
          left: "0",
          bottom: "0",
          right: "0",
        }}
      >
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
              coordinates={[resp.geotag.long, resp.geotag.lat]}
              key={idx}
            />
          ))}
        </Layer>
      </Map>
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
    if (e.type === "mousedown") {
      this.mouseDown = true;
    } else if (e.type === "mouseup") {
      this.mouseDown = false;
    }
    const activeIds = this.getActiveIds(map, e.point);
    if (this.mouseDown) {
      map.getCanvas().style.cursor = "grabbing";
    } else if ($.isEmptyObject(activeIds)) {
      map.getCanvas().style.cursor = "grab";
    } else {
      map.getCanvas().style.cursor = "pointer";
    }
    this.props.responses.forEach((_response, idx) => {
      map.setFeatureState(
        { source: "people", id: idx },
        { hover: activeIds[idx] || false },
      );
    });
  };
}

export default connect(state => ({
  responses: geotagResponses(state.responses, state.geotagView),
}))(MapView);
