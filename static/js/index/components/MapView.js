"use strict";

import React from "react";
import ReactMapboxGl from "react-mapbox-gl";
import { Feature, Layer } from "react-mapbox-gl";
import { connect } from "react-redux";

import { mapboxAccessToken } from "../../shared";
import {
  searchBarOcclusion,
  sidebarWidthFraction,
  sidebarHeightFraction,
} from "../config";
import { tagAll } from "../tag";
import { store } from "../redux";
import { GeotagView, SidebarView } from "../state";
import {
  allowResizingWindow,
  originalWindowHeight,
  originalWindowWidth,
} from "../util";

const CIRCLE_RADIUS = 10;
const HIGHLIGHT_BBOX_RADIUS = 10;
const POINT_PADDING = searchBarOcclusion + 30;

const Map = ReactMapboxGl({
  accessToken: mapboxAccessToken,
});

class MapView extends React.Component {
  constructor(props) {
    super(props);
    // Keep track of this behind React's back, as it's used to mess
    // with state that React doesn't know how to deal with.
    this.mouseState = "up";
    // There seems to be no elegant way for one component to listen to
    // actions dispatched by another component. Sad. Anyway, this
    // yucky hack allows us to re-zoom the map on each search query,
    // while otherwise not messing with it.
    this.initialBounds = [
      [-126, 24],
      [-66, 50],
    ];
    this.lastSerial = this.props.serial;
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
              // https://blog.mapbox.com/visualizing-election-data-a-guide-to-mapbox-gl-expressions-92cc469b8dfd
              // https://blog.mapbox.com/going-live-with-electoral-maps-a-guide-to-feature-state-b520e91a22d
              ["boolean", ["feature-state", "hover"], false],
              "#000000",
              "#eaaa00", // HMC yellow
            ],
            "circle-radius": CIRCLE_RADIUS,
            "circle-stroke-color": "black",
            "circle-stroke-width": [
              "case",
              ["boolean", ["get", "displayed"], false],
              3,
              1,
            ],
          }}
        >
          {this.props.responses.map((resp) => (
            <Feature
              coordinates={[resp.tag.latLong.lng, resp.tag.latLong.lat]}
              key={resp.idx}
              properties={{
                displayed:
                  this.props.displayedResponses &&
                  this.props.displayedResponses.has(resp.idx),
              }}
            />
          ))}
        </Layer>
      );
    }
    return (
      <div
        id="mapContainerContainer"
        onClick={this.onMouseEvent}
        onMouseDown={this.onMouseEvent}
        onMouseMove={this.onMouseEvent}
        onMouseUp={this.onMouseEvent}
      >
        <Map
          style="mapbox://styles/raxod502/ck6nxepcj03jv1jqe6a7p8om4"
          fitBounds={this.initialBounds}
          fitBoundsOptions={{ duration: 0 }}
          onStyleLoad={(map) => {
            // Need to extract the actual Mapbox map so we can use it
            // from componentDidUpdate.
            this.map = map;
          }}
          containerStyle={{
            height: allowResizingWindow()
              ? "100vh"
              : originalWindowHeight + "px",
          }}
        >
          {layer}
        </Map>
      </div>
    );
  }
  componentDidUpdate() {
    if (!this.map) {
      // Shouldn't happen but who knows :/
      return;
    }
    if (this.props.serial === this.lastSerial) {
      return;
    }
    this.lastSerial = this.props.serial;
    if (this.props.displayedResponses.size === 0) {
      return;
    }
    // OK. This long sequence of geometry code is basically
    // impossible to read. I know and am sorry. I'm not happy about
    // it either.
    let mapLeft = Infinity;
    let mapRight = -Infinity;
    let mapTop = -Infinity;
    let mapBottom = Infinity;
    this.props.responses
      .filter((resp) => this.props.displayedResponses.has(resp.idx))
      .forEach((resp) => {
        mapLeft = Math.min(mapLeft, resp.tag.latLong.lng);
        mapRight = Math.max(mapRight, resp.tag.latLong.lng);
        mapBottom = Math.min(mapBottom, resp.tag.latLong.lat);
        mapTop = Math.max(mapTop, resp.tag.latLong.lat);
      });
    const zoomLimit = 0.2;
    if (mapRight - mapLeft < zoomLimit) {
      const offset = (zoomLimit - (mapRight - mapLeft)) / 2;
      mapLeft -= offset;
      mapRight += offset;
    }
    if (mapTop - mapBottom < zoomLimit) {
      const offset = (zoomLimit - (mapTop - mapBottom)) / 2;
      mapBottom -= offset;
      mapTop += offset;
    }
    let { x: screenLeft, y: screenBottom } = this.map.project([
      mapLeft,
      mapBottom,
    ]);
    let { x: screenRight, y: screenTop } = this.map.project([mapRight, mapTop]);
    const screenWidth = screenRight - screenLeft;
    const screenHeight = screenBottom - screenTop;
    let viewportLeft = 0;
    let viewportRight = originalWindowWidth;
    let viewportTop = 0;
    let viewportBottom = originalWindowHeight;
    if (this.props.sidebarVertical) {
      viewportRight -= sidebarWidthFraction * originalWindowWidth;
    } else {
      viewportBottom -= sidebarHeightFraction * originalWindowHeight;
    }
    viewportLeft += POINT_PADDING;
    viewportRight -= POINT_PADDING;
    viewportTop += POINT_PADDING;
    viewportBottom -= POINT_PADDING;
    const viewportWidth = viewportRight - viewportLeft;
    const viewportHeight = viewportBottom - viewportTop;
    const scale = Math.min(
      viewportWidth / screenWidth,
      viewportHeight / screenHeight,
    );
    const scaledWidth = scale * screenWidth;
    const scaledHeight = scale * screenHeight;
    const scaledWidthPadding = (viewportWidth - scaledWidth) / 2;
    const scaledHeightPadding = (viewportHeight - scaledHeight) / 2;
    const scaledLeft = viewportLeft + scaledWidthPadding;
    const scaledRight = viewportRight - scaledWidthPadding;
    const scaledBottom = viewportBottom - scaledHeightPadding;
    const scaledTop = viewportTop + scaledHeightPadding;
    const revisedScreenLeft =
      screenLeft -
      ((screenRight - screenLeft) / (scaledRight - scaledLeft)) *
        (scaledLeft - 0);
    const revisedScreenRight =
      screenRight +
      ((screenRight - screenLeft) / (scaledRight - scaledLeft)) *
        (originalWindowWidth - scaledRight);
    const revisedScreenTop =
      screenTop -
      ((screenBottom - screenTop) / (scaledBottom - scaledTop)) *
        (scaledTop - 0);
    const revisedScreenBottom =
      screenBottom +
      ((screenBottom - screenTop) / (scaledBottom - scaledTop)) *
        (originalWindowHeight - scaledBottom);
    ({ lng: mapLeft, lat: mapBottom } = this.map.unproject([
      revisedScreenLeft,
      revisedScreenBottom,
    ]));
    ({ lng: mapRight, lat: mapTop } = this.map.unproject([
      revisedScreenRight,
      revisedScreenTop,
    ]));
    this.map.fitBounds(
      [
        [mapLeft, mapBottom],
        [mapRight, mapTop],
      ],
      { duration: 3000 },
    );
  }
  getNearbyPoints = (map, point) => {
    // https://docs.mapbox.com/mapbox-gl-js/example/queryrenderedfeatures-around-point/
    const bbox = [
      [point.x - HIGHLIGHT_BBOX_RADIUS, point.y - HIGHLIGHT_BBOX_RADIUS],
      [point.x + HIGHLIGHT_BBOX_RADIUS, point.y + HIGHLIGHT_BBOX_RADIUS],
    ];
    const nearbyPoints = new Set();
    for (const feature of map.queryRenderedFeatures(bbox, {
      layers: ["people"],
    })) {
      nearbyPoints.add(feature.id);
    }
    return nearbyPoints;
  };
  onMouseEvent = (e) => {
    if (!this.map || !this.map.getLayer("people")) {
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
    const nearbyPoints = this.getNearbyPoints(this.map, {
      x: e.clientX,
      y: e.clientY,
    });
    // This follows the conventions set by Google Maps.
    if (this.mouseState === "drag") {
      this.map.getCanvas().style.cursor = "move";
    } else if (nearbyPoints.size > 0) {
      this.map.getCanvas().style.cursor = "pointer";
    } else {
      this.map.getCanvas().style.cursor = "default";
    }
    this.props.responses.forEach((resp) => {
      this.map.setFeatureState(
        { source: "people", id: resp.idx },
        { hover: nearbyPoints.has(resp.idx) },
      );
    });
    if (e.type === "click") {
      if (nearbyPoints.size > 0) {
        store.dispatch({
          type: "SHOW_DETAILS",
          responses: Array.from(nearbyPoints),
          sidebarView: SidebarView.summaryView,
        });
      } else {
        store.dispatch({
          type: "HIDE_DETAILS",
        });
      }
    }
  };
}

export default connect((state) => ({
  responses:
    state.responses &&
    tagAll(state.responses, state.geotagView).filter(
      (resp) => resp.tag.latLong,
    ),
  displayedResponses: new Set(state.displayedResponses),
  serial: state.mapViewSerial,
  sidebarVertical: state.landscape,
}))(MapView);
