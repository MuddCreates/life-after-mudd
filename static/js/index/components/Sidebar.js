"use strict";

import React from "react";
import { Fragment } from "react";
import { connect } from "react-redux";

import { sidebarWidthFraction } from "../config";
import { store } from "../redux";
import { SidebarView } from "../state";
import { tag, tagAll } from "../tag";

function groupPlansConfigurable(responses, getFirstGroupKey, getSecondGroupKey) {
  const index = {};
  for (const resp of responses) {
    const firstGroupKey = getFirstGroupKey(resp);
    const secondGroupKey = getSecondGroupKey(resp);

    if (!index[firstGroupKey]) {
      index[firstGroupKey] = [];
    }
    if (!index[firstGroupKey][secondGroupKey]) {
      index[firstGroupKey][secondGroupKey] = [];
    }
    index[firstGroupKey][secondGroupKey].push(resp);
  }
  return Object.keys(index)
    .sort()
    .map((firstKey) => ({
      firstKey,
      secondKeys: Object.keys(index[firstKey])
        .sort()
        .map((secondKey) => ({ secondKey, responses: index[firstKey][secondKey] })),
    }));
}

function createTwoLevelViewJSX(taggedData, firstKeyView, secondKeyView, firstGroupBy, secondGroupBy){
  const groupedData = groupPlansConfigurable(
    taggedData, firstGroupBy, secondGroupBy,
  );
  const firstKeyAction = (secondKeys) => {
    store.dispatch({
      type: "SHOW_DETAILS",
      responses: secondKeys.flatMap(item => item.responses.map(resp => resp.idx)),
      sidebarView: firstKeyView,
    });
    store.dispatch({
      type: "UPDATE_MAP_VIEW_ZOOM",
    });
  };

  const secondKeyAction = (responses) => {
    store.dispatch({
      type: "SHOW_DETAILS",
      responses: responses.map(resp => resp.idx),
      sidebarView: secondKeyView,
    });
    store.dispatch({
      type: "UPDATE_MAP_VIEW_ZOOM",
    });
  };
  return (
        <div
          style={{
            position: "absolute",
            left: `${(1 - sidebarWidthFraction) * 100}%`,
            top: "0",
            width: `${sidebarWidthFraction * 100}%`,
            height: "100%",
            padding: "10px",
            background: "white",
            zIndex: "3",
          }}
        >
          {groupedData.map(({ firstKey, secondKeys}, idx) => (
            <Fragment key={idx}>
              <h5 onClick={() => firstKeyAction(secondKeys)}>
                <b>{firstKey}</b>
              </h5>
              {secondKeys.map(({ secondKey, responses }, idx) => (
                <Fragment key={idx}>
                  <b onClick={()=>secondKeyAction(responses)}>{secondKey}</b>
                  {responses.map((resp, idx) => (
                      <div
                    key={idx}
                    onClick={
                      () => {
                        store.dispatch({
                        type: "SHOW_DETAILS",
                        responses: [resp.idx],
                          sidebarView: SidebarView.detailView,
                        });
                      }
                    }>{resp.name || "Anonymous"}</div>
                  ))}
                </Fragment>
              ))}
            </Fragment>
          ))}
        </div>
  );
}

function describeSubject(taggedSubject){
  let fields = [];
  if(taggedSubject.tag.desc && taggedSubject.tag.loc){
    fields.push(<div>{taggedSubject.tag.desc} in {taggedSubject.tag.loc}</div>);
  }
  if (taggedSubject.major) {
    fields.push(<div>Majored in {taggedSubject.major}</div>);
  }
  if (taggedSubject.comments){
    fields.push(<div>Note: {taggedSubject.comments}</div>);
  }
  // TODO: Figure out how to cleanly add keys to fields elements
  return (
      <div>
      <h5><b> {taggedSubject.name}</b></h5>
      {fields}
    </div>
  );
}

class Sidebar extends React.Component {
  render() {
    let sidebarContent = null;
    const taggedData = tagAll(this.props.responses, this.props.geotagView);
    let groupedData = groupPlansConfigurable(
      tagAll(this.props.responses, this.props.geotagView), resp => resp.tag.loc, resp => resp.tag.desc,
    );

    if (this.props.sidebarView === SidebarView.detailView){
      const subject = tag(this.props.responses[0], this.props.geotagView);
      return (
          <div
        style={{
          position: "absolute",
          left: `${(1 - sidebarWidthFraction) * 100}%`,
          top: "0",
          width: `${sidebarWidthFraction * 100}%`,
          height: "100%",
          padding: "10px",
          background: "white",
          zIndex: "3",
        }}
          >
          {describeSubject(subject)}
        </div>
      );
    } else {
      // for all view made with createTwoLevelViewJSX
      switch (this.props.sidebarView){
      case SidebarView.summaryView:
        return createTwoLevelViewJSX(taggedData, SidebarView.summaryView, SidebarView.organizationView, resp => resp.tag.loc, resp => resp.tag.desc);

      case SidebarView.organizationView:
        return createTwoLevelViewJSX(taggedData, SidebarView.organizationView, SidebarView.summaryView, resp => resp.tag.desc, resp => resp.tag.loc);
      }
    }
  };

}

export default connect((state) => {
  const displayedResponses = new Set(state.displayedResponses);
  return {
    responses: state.responses.filter((resp) =>
      displayedResponses.has(resp.idx),
    ),
    geotagView: state.geotagView,
    sidebarView: state.sidebarView,
  };
})(Sidebar);
