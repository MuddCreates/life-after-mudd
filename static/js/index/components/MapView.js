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
import { store } from "../redux";
import { SidebarView } from "../state";
import { allowResizingWindow } from "../util";

const CIRCLE_RADIUS = 10;
const HIGHLIGHT_BBOX_RADIUS = 10;
const POINT_PADDING = searchBarOcclusion + 30;
const LEGEND_MARGIN = 45;

const MapGl = ReactMapboxGl({
  accessToken: mapboxAccessToken,
});

const summerColor = "#FDFFA8";
const longTermColor = "#EAAA00";

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
      [-66, 52],
    ];
    this.lastSerial = this.props.serial;
  }
  render = () => {
    let layer = null;
    this.longTermIds = new Map();
    this.summerIds = new Map();
    if (this.props.responses !== null) {
      let longTermId = 0;
      let summerId = 0;
      layer = (
        <>
          <Layer
            id="summer"
            type="circle"
            geoJSONSourceOptions={{ generateId: true }}
            paint={{
              // https://blog.mapbox.com/visualizing-election-data-a-guide-to-mapbox-gl-expressions-92cc469b8dfd
              // https://blog.mapbox.com/going-live-with-electoral-maps-a-guide-to-feature-state-b520e91a22d
              // https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/#case
              // https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/#types-boolean
              //
              // Be warned, the docs are really bad.
              "circle-color": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                "#000000",
                summerColor,
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
            {this.props.responses
              .map((resp) => {
                const latLong = resp.summerOrgLatLong || resp.summerCityLatLong;
                if (latLong) {
                  this.summerIds.set(summerId++, resp.idx);
                  return (
                    latLong && (
                      <Feature
                        coordinates={[latLong.lng, latLong.lat]}
                        properties={{
                          displayed:
                            this.props.displayedSummerIndices &&
                            this.props.displayedSummerIndices.has(resp.idx),
                          summer: true,
                        }}
                        key={resp.idx * 2}
                      />
                    )
                  );
                } else {
                  return null;
                }
              })
              .filter((x) => x)}
          </Layer>
          <Layer
            id="longTerm"
            type="circle"
            geoJSONSourceOptions={{ generateId: true }}
            paint={{
              // https://blog.mapbox.com/visualizing-election-data-a-guide-to-mapbox-gl-expressions-92cc469b8dfd
              // https://blog.mapbox.com/going-live-with-electoral-maps-a-guide-to-feature-state-b520e91a22d
              // https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/#case
              // https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/#types-boolean
              //
              // Be warned, the docs are really bad.
              "circle-color": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                "#000000",
                longTermColor,
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
            {this.props.responses
              .map((resp) => {
                const latLong = resp.orgLatLong || resp.cityLatLong;
                if (latLong) {
                  this.longTermIds.set(longTermId++, resp.idx);
                  return (
                    latLong && (
                      <Feature
                        coordinates={[latLong.lng, latLong.lat]}
                        properties={{
                          displayed:
                            this.props.displayedLongTermIndices &&
                            this.props.displayedLongTermIndices.has(resp.idx),
                          summer: false,
                        }}
                        key={resp.idx * 2 + 1}
                      />
                    )
                  );
                } else {
                  return null;
                }
              })
              .filter((x) => x)}
          </Layer>
        </>
      );
    }
    if (!allowResizingWindow()) {
      // Don't even ask. (Fixes a bug where the map stops rendering
      // with the correct size after you rotate the viewport multiple
      // times on Android.)
      setTimeout(() => this.map && this.map.resize(), 0);
    }
    // Legend:
    // <https://docs.mapbox.com/help/tutorials/choropleth-studio-gl-pt-2/>
    return (
      <div
        id="mapContainerContainer"
        onClick={this.onMouseEvent}
        onMouseDown={this.onMouseEvent}
        onMouseMove={this.onMouseEvent}
        onMouseUp={this.onMouseEvent}
      >
        <MapGl
          style="mapbox://styles/raxod502/ck6nxepcj03jv1jqe6a7p8om4"
          fitBounds={this.initialBounds}
          fitBoundsOptions={{ duration: 0 }}
          onStyleLoad={(map) => {
            // Need to extract the actual Mapbox map so we can use it
            // from componentDidUpdate.
            this.map = map;
            // Yes I know. It was the easy solution, not the right
            // one.
            window.map = map;
          }}
          containerStyle={{
            position: "absolute",
            left: "0px",
            top: "0px",
            width: allowResizingWindow()
              ? "100vw"
              : this.props.cachedWindowWidth + "px",
            height: allowResizingWindow()
              ? "100vh"
              : this.props.cachedWindowHeight + "px",
          }}
        >
          {layer}
        </MapGl>
        <div
          style={{
            position: "absolute",
            right: "0",
            background: "rgba(255, 255, 255, 0.9)",
            marginRight: "20px",
            fontFamily: "Arial, sans-serif",
            overflow: "auto",
            borderRadius: "3px",
            padding: "15px",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
            lineHeight: "23px",
            marginBottom: `${LEGEND_MARGIN}px`,
            ...(allowResizingWindow()
              ? { bottom: "0" }
              : {
                  top: this.props.cachedWindowHeight + "px",
                  transform: `translateY(calc(-100% - ${LEGEND_MARGIN}px))`,
                }),
          }}
        >
          {[
            ["Long-term", longTermColor],
            ["Summer", summerColor],
          ].map(([name, color], idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  backgroundColor: color,
                  display: "inline-block",
                  borderRadius: "20%",
                  width: "15px",
                  height: "15px",
                  marginRight: "8px",
                  borderWidth: "1px",
                  borderColor: "black",
                  borderStyle: "solid",
                }}
              ></span>
              <span>{name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  componentDidUpdate() {
    if (!this.map) {
      // Shouldn't happen but who knows :/
      return;
    }
    if (this.props.serial === this.lastSerial) {
      return;
    }
    this.lastSerial = this.props.serial;
    if (
      this.props.displayedLongTermIndices.size === 0 &&
      this.props.displayedSummerIndices.size === 0
    ) {
      return;
    }
    // OK. This long sequence of geometry code is basically
    // impossible to read. I know and am sorry. I'm not happy about
    // it either.
    let mapLeft = Infinity;
    let mapRight = -Infinity;
    let mapTop = -Infinity;
    let mapBottom = Infinity;
    const allGeotags = [].concat.apply(
      [],
      this.props.displayedResponses.map((resp) => {
        const geotags = [];
        if (!resp.hasOwnProperty("showLongTerm") || resp["showLongTerm"]) {
          const geotag = resp.orgLatLong || resp.cityLatLong;
          if (geotag) {
            geotags.push(geotag);
          }
        }
        if (!resp.hasOwnProperty("showSummer") || resp["showSummer"]) {
          const geotag = resp.summerOrgLatLong || resp.summerCityLatLong;
          if (geotag) {
            geotags.push(geotag);
          }
        }
        return geotags;
      }),
    );
    allGeotags.forEach((geotag) => {
      mapLeft = Math.min(mapLeft, geotag.lng);
      mapRight = Math.max(mapRight, geotag.lng);
      mapBottom = Math.min(mapBottom, geotag.lat);
      mapTop = Math.max(mapTop, geotag.lat);
    });
    const zoomLimit = 0.1;
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
    let viewportRight = this.props.cachedWindowWidth;
    let viewportTop = 0;
    let viewportBottom = this.props.cachedWindowHeight;
    if (this.props.sidebarVertical) {
      viewportRight -= sidebarWidthFraction * this.props.cachedWindowWidth;
    } else {
      viewportBottom -= sidebarHeightFraction * this.props.cachedWindowHeight;
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
        (this.props.cachedWindowWidth - scaledRight);
    const revisedScreenTop =
      screenTop -
      ((screenBottom - screenTop) / (scaledBottom - scaledTop)) *
        (scaledTop - 0);
    const revisedScreenBottom =
      screenBottom +
      ((screenBottom - screenTop) / (scaledBottom - scaledTop)) *
        (this.props.cachedWindowHeight - scaledBottom);
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
    const longTerm = new Set();
    for (const feature of map.queryRenderedFeatures(bbox, {
      layers: ["longTerm"],
    })) {
      longTerm.add(feature.id);
    }
    const summer = new Set();
    for (const feature of map.queryRenderedFeatures(bbox, {
      layers: ["summer"],
    })) {
      summer.add(feature.id);
    }
    return [longTerm, summer];
  };
  onMouseEvent = (e) => {
    if (
      !this.map ||
      !this.map.getLayer("longTerm") ||
      !this.map.getLayer("summer")
    ) {
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
    const [nearbyLongTerm, nearbySummer] = this.getNearbyPoints(this.map, {
      x: e.clientX,
      y: e.clientY,
    });
    const pointsSelected = nearbyLongTerm.size > 0 || nearbySummer.size > 0;
    // This follows the conventions set by Google Maps.
    if (this.mouseState === "drag") {
      this.map.getCanvas().style.cursor = "move";
    } else if (pointsSelected) {
      this.map.getCanvas().style.cursor = "pointer";
    } else {
      this.map.getCanvas().style.cursor = "default";
    }
    for (const id of this.longTermIds.keys()) {
      this.map.setFeatureState(
        { source: "longTerm", id },
        { hover: e.type !== "click" && nearbyLongTerm.has(id) },
      );
    }
    for (const id of this.summerIds.keys()) {
      this.map.setFeatureState(
        { source: "summer", id },
        { hover: e.type !== "click" && nearbySummer.has(id) },
      );
    }
    if (e.type === "click") {
      if (pointsSelected) {
        const longTermIndices = new Set();
        for (const id of nearbyLongTerm) {
          longTermIndices.add(this.longTermIds.get(id));
        }
        const summerIndices = new Set();
        for (const id of nearbySummer) {
          summerIndices.add(this.summerIds.get(id));
        }
        const responses = this.props.responses
          .map((resp) => ({
            ...resp,
            showLongTerm: longTermIndices.has(resp.idx),
            showSummer: summerIndices.has(resp.idx),
          }))
          .filter((resp) => resp.showLongTerm || resp.showSummer);
        store.dispatch({
          type: "SHOW_DETAILS",
          responses,
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
  responses: state.responses,
  displayedLongTermIndices:
    state.displayedResponses &&
    new Set(
      state.displayedResponses
        .filter(
          (resp) => !resp.hasOwnProperty("showLongTerm") || resp.showLongTerm,
        )
        .map((resp) => resp.idx),
    ),
  displayedSummerIndices:
    state.displayedResponses &&
    new Set(
      state.displayedResponses
        .filter((resp) => !resp.hasOwnProperty("showSummer") || resp.showSummer)
        .map((resp) => resp.idx),
    ),
  displayedResponses: state.displayedResponses,
  serial: state.mapViewSerial,
  sidebarVertical: state.landscape,
  cachedWindowWidth: state.cachedWindowWidth,
  cachedWindowHeight: state.cachedWindowHeight,
}))(MapView);
