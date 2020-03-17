"use strict";

import React from "react";
import { connect } from "react-redux";

class Sidebar extends React.Component {
  render() {
    return (
      <div
        style={{
          position: "absolute",
          left: "70%",
          top: "0",
          width: "30%",
          height: "100%",
          background: "white",
        }}
      ></div>
    );
  }
}

export default connect(state => ({
  responses: state.displayedResponses,
}))(Sidebar);
