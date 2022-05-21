"use strict";

import React from "react";
import ReactMapboxGl from "react-mapbox-gl";
import type { FitBounds } from "react-mapbox-gl/lib/map";
import { Feature, Layer } from "react-mapbox-gl";
import { connect } from "react-redux";
import { useSelector, useDispatch } from "../hooks/redux";

import { mapboxAccessToken } from "../../shared";
import {
  searchBarOcclusion,
  sidebarWidthFraction,
  sidebarHeightFraction,
} from "../config";
import { store } from "../redux";
import { SidebarView, State } from "../lib/state";
import { Response } from "../lib/response";
import { ActionType } from "../lib/action";
import { allowResizingWindow } from "../util";
import { doSearch, getSearchIndex } from "./SearchBar";

const CIRCLE_RADIUS = 10;
const HIGHLIGHT_BBOX_RADIUS = 10;
const POINT_PADDING = searchBarOcclusion + 30;
const LEGEND_MARGIN = 45;

const MapGl = ReactMapboxGl({
  accessToken: mapboxAccessToken,
});

const summerColor = "#FDFFA8";
const longTermColor = "#EAAA00";

const initialBounds: FitBounds = [
  [-126, 24],
  [-66, 52],
];

/*
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
    this.lastSerial = this.serial;
  }

}

*/

const getNearbyPoints = (
  map: mapboxgl.Map,
  point: { x: number; y: number },
) => {
  // https://docs.mapbox.com/mapbox-gl-js/example/queryrenderedfeatures-around-point/
  const bbox: FitBounds = [
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

export const MapView = React.forwardRef((_props, ref) => {
  const responses = useSelector((state) =>
    state.classYear === null || state.responses === null
      ? null
      : state.responses[state.classYear],
  );

  const index = responses && getSearchIndex(responses);

  const displayedLongTermIndices = useSelector(
    (state) =>
      state.displayedResponses &&
      new Set(
        state.displayedResponses
          .filter(
            (resp) => !resp.hasOwnProperty("showLongTerm") || resp.showLongTerm,
          )
          .map((resp) => resp.idx),
      ),
  );
  const displayedSummerIndices = useSelector(
    (state) =>
      state.displayedResponses &&
      new Set(
        state.displayedResponses
          .filter(
            (resp) => !resp.hasOwnProperty("showSummer") || resp.showSummer,
          )
          .map((resp) => resp.idx),
      ),
  );

  const displayedResponses = useSelector((state) => state.displayedResponses);
  const serial = useSelector((state) => state.mapViewSerial);
  const sidebarVertical = useSelector((state) => state.landscape);

  const cachedWindowWidth = useSelector((state) => state.cachedWindowWidth);

  const cachedWindowHeight = useSelector((state) => state.cachedWindowHeight);

  const mapRef = React.useRef<mapboxgl.Map>();
  const mouseState = React.useRef<"up" | "down" | "drag">("up");

  React.useEffect(() => {
    if (!mapRef.current)
      // Shouldn't happen but who knows :/
      return;

    if (!displayedLongTermIndices?.size && !displayedSummerIndices?.size)
      return;

    // OK. This long sequence of geometry code is basically
    // impossible to read. I know and am sorry. I'm not happy about
    // it either.
    let mapLeft = Infinity;
    let mapRight = -Infinity;
    let mapTop = -Infinity;
    let mapBottom = Infinity;
    const allGeotags = displayedResponses.flatMap((resp) => {
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
    });
    if (allGeotags.length === 0) {
      return;
    }
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
    let { x: screenLeft, y: screenBottom } = mapRef.current.project([
      mapLeft,
      mapBottom,
    ]);
    let { x: screenRight, y: screenTop } = mapRef.current.project([
      mapRight,
      mapTop,
    ]);
    const screenWidth = screenRight - screenLeft;
    const screenHeight = screenBottom - screenTop;
    let viewportLeft = 0;
    let viewportRight = cachedWindowWidth;
    let viewportTop = 0;
    let viewportBottom = cachedWindowHeight;
    if (sidebarVertical) {
      viewportRight -= sidebarWidthFraction * cachedWindowWidth;
    } else {
      viewportBottom -= sidebarHeightFraction * cachedWindowHeight;
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
        (cachedWindowWidth - scaledRight);
    const revisedScreenTop =
      screenTop -
      ((screenBottom - screenTop) / (scaledBottom - scaledTop)) *
        (scaledTop - 0);
    const revisedScreenBottom =
      screenBottom +
      ((screenBottom - screenTop) / (scaledBottom - scaledTop)) *
        (cachedWindowHeight - scaledBottom);
    ({ lng: mapLeft, lat: mapBottom } = mapRef.current.unproject([
      revisedScreenLeft,
      revisedScreenBottom,
    ]));
    ({ lng: mapRight, lat: mapTop } = mapRef.current.unproject([
      revisedScreenRight,
      revisedScreenTop,
    ]));
    mapRef.current.fitBounds(
      [
        [mapLeft, mapBottom],
        [mapRight, mapTop],
      ],
      { duration: 3000 },
    );
  }, [serial]);

  const onMouseEvent: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (
      !mapRef.current ||
      !mapRef.current.getLayer("longTerm") ||
      !mapRef.current.getLayer("summer")
    )
      // Map not fully loaded yet, refrain from messing with it to
      // avoid errors.
      return;

    if (e.type === "mousedown") mouseState.current = "down";
    else if (e.type === "mouseup") mouseState.current = "up";
    else if (e.type === "mousemove" && mouseState.current !== "up")
      mouseState.current = "drag";

    const [nearbyLongTerm, nearbySummer] = getNearbyPoints(mapRef.current, {
      x: e.clientX,
      y: e.clientY,
    });

    const pointsSelected = nearbyLongTerm.size > 0 || nearbySummer.size > 0;
    // This follows the conventions set by Google Maps.
    if (mouseState.current === "drag") {
      mapRef.current.getCanvas().style.cursor = "move";
    } else if (pointsSelected) {
      mapRef.current.getCanvas().style.cursor = "pointer";
    } else {
      mapRef.current.getCanvas().style.cursor = "default";
    }
    for (const id of longTermIds.keys()) {
      mapRef.current.setFeatureState(
        { source: "longTerm", id },
        { hover: e.type !== "click" && nearbyLongTerm.has(id) },
      );
    }
    for (const id of summerIds.keys()) {
      mapRef.current.setFeatureState(
        { source: "summer", id },
        { hover: e.type !== "click" && nearbySummer.has(id) },
      );
    }
    if (e.type === "click") {
      if (pointsSelected) {
        const longTermIndices = new Set();
        for (const id of nearbyLongTerm) {
          longTermIndices.add(longTermIds.get(id));
        }
        const summerIndices = new Set();
        for (const id of nearbySummer) {
          summerIndices.add(summerIds.get(id));
        }
        const newResponses = responses
          .map((resp) => ({
            ...resp,
            showLongTerm: longTermIndices.has(resp.idx),
            showSummer: summerIndices.has(resp.idx),
          }))
          .filter((resp) => resp.showLongTerm || resp.showSummer);
        store.dispatch({
          type: ActionType.showDetails,
          responses: newResponses,
          sidebarView: SidebarView.summaryView,
        });
      } else {
        store.dispatch({
          type: ActionType.hideDetails,
        });
      }
    }
  };

  let layer = null;
  const longTermIds = new Map();
  const summerIds = new Map();
  if (responses !== null) {
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
          {responses
            .map((resp) => {
              const latLong = resp.summerOrgLatLong || resp.summerCityLatLong;
              if (latLong) {
                summerIds.set(summerId++, resp.idx);
                return (
                  <Feature
                    coordinates={[latLong.lng, latLong.lat]}
                    properties={{
                      displayed:
                        displayedSummerIndices &&
                        displayedSummerIndices.has(resp.idx),
                      summer: true,
                    }}
                    key={resp.idx * 2}
                  />
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
          {responses
            .map((resp) => {
              const latLong = resp.orgLatLong || resp.cityLatLong;
              if (latLong) {
                longTermIds.set(longTermId++, resp.idx);
                return (
                  <Feature
                    coordinates={[latLong.lng, latLong.lat]}
                    properties={{
                      displayed:
                        displayedLongTermIndices &&
                        displayedLongTermIndices.has(resp.idx),
                      summer: false,
                    }}
                    key={resp.idx * 2 + 1}
                  />
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
    setTimeout(() => {
      if (mapRef.current !== undefined) mapRef.current.resize();
    }, 0);
  }
  // Legend:
  // <https://docs.mapbox.com/help/tutorials/choropleth-studio-gl-pt-2/>
  return (
    <div
      id="mapContainerContainer"
      onClick={onMouseEvent}
      onMouseDown={onMouseEvent}
      onMouseMove={onMouseEvent}
      onMouseUp={onMouseEvent}
    >
      <MapGl
        style="mapbox://styles/raxod502/ck6nxepcj03jv1jqe6a7p8om4"
        fitBounds={initialBounds}
        fitBoundsOptions={{ duration: 0 }}
        onStyleLoad={(map) => {
          mapRef.current = map;
          if (typeof ref === "function") ref(map);
          else if (ref) ref.current = map;
        }}
        containerStyle={{
          position: "absolute",
          left: "0px",
          top: "0px",
          width: allowResizingWindow() ? "100vw" : cachedWindowWidth + "px",
          height: allowResizingWindow() ? "100vh" : cachedWindowHeight + "px",
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
                top: cachedWindowHeight + "px",
                transform: `translateY(calc(-100% - ${LEGEND_MARGIN}px))`,
              }),
        }}
      >
        {[
          ["Long-term", longTermColor, "Show all long-term"],
          ["Summer", summerColor, "Show all summer"],
        ].map(([name, color, query], idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              doSearch(query, index);
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
});

export default MapView;
