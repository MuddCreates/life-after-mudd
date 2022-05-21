import { oauthLoginAction } from "../oauth";
import Modal from "react-bootstrap/Modal";
import { useSelector, useDispatch } from "$/hooks/redux";

export const LoginModal = () => {
  const modalShown = useSelector((s) => s.showingModal);
  const modalWaiting = useSelector((s) => s.modalWaiting);

  const dispatch = useDispatch();

  let body;
  if (!modalShown) {
    body = <p>Login successful.</p>;
  } else if (!modalWaiting) {
    // TODO center div
    body = (
      <div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => dispatch(oauthLoginAction)}
        >
          Sign in with your HMC Google Account
        </button>
      </div>
    );
  } else {
    body = (
      <>
        <p>
          Waiting for Google to report your login. If something went wrong,{" "}
          <a
            href="#"
            onClick={(event) => {
              dispatch(oauthLoginAction);
              event.preventDefault();
            }}
          >
            click here
          </a>{" "}
          to try again.
        </p>
      </>
    );
  }
  return (
    <Modal show={modalShown} onHide={() => {}}>
      <Modal.Header>
        <Modal.Title>Login required</Modal.Title>
      </Modal.Header>
      <Modal.Body>{body}</Modal.Body>
    </Modal>
  );
};

export default LoginModal;
