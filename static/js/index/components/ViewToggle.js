"use strict";

import React from "react";
import { connect } from "react-redux";
import Switch from "react-switch";

import { store } from "../redux";
import {GeotagView} from "../state";

class ViewToggle extends React.Component {
  constructor(props){
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(checked){
    store.dispatch({
      type: "UPDATE_GEOTAG_VIEW",
      geotagView: checked ? GeotagView.summer : GeotagView.standard,
    });
  }

  render() {
    return (
        <Switch onChange={this.handleChange} checked={this.props.checked} onColor="#d9c757"/>
    );
  }
}

export default connect((state) => {
  return {
    checked: state.geotagView === GeotagView.summer,
  };
})(ViewToggle);
