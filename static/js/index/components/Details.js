"use strict";

import React from "react";
import { connect } from "react-redux";

class Details extends React.Component {
  render() {
    return "Hello, world!";
  }
}

export default connect(state => ({
  responses: state.displayedResponses,
}))(Details);
