"use strict";

import { oauthLoginAction } from "../oauth";
import React from "react";
import Modal from "react-bootstrap/Modal";
import { connect } from "react-redux";

import { store } from "../redux";

class LoginModal extends React.Component {
  render() {
    let body;
    if (!this.props.modalShown) {
      body = <p>Login successful.</p>;
    } else if (!this.props.modalWaiting) {
      body = (
        <center>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => store.dispatch(oauthLoginAction)}
          >
            Sign in with your HMC Google Account
          </button>
        </center>
      );
    } else {
      body = (
        <>
          <p>
            Waiting for you to log in with Google. If you close the login
            window,{" "}
            <a
              href="#"
              onClick={event => {
                store.dispatch(oauthLoginAction);
                event.preventDefault();
              }}
            >
              click here
            </a>{" "}
            to open another one.
          </p>
        </>
      );
    }
    return (
      <Modal show={this.props.modalShown} onHide={() => {}}>
        <Modal.Header>
          <Modal.Title>Login required</Modal.Title>
        </Modal.Header>
        <Modal.Body>{body}</Modal.Body>
      </Modal>
    );
  }
}

export default connect(state => ({
  modalShown: state.showingModal,
  modalWaiting: state.modalWaiting,
}))(LoginModal);
