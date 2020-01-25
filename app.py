import json
import os
import threading
import urllib.parse

import flask
import flask_talisman
import requests
import requests.exceptions

import sheets

ADMIN_ENABLED = bool(os.environ.get("LAM_ADMIN_ENABLED"))
AUTOFETCH_ENABLED = bool(os.environ.get("LAM_AUTOFETCH_ENABLED"))

app = flask.Flask(__name__)
if not ADMIN_ENABLED:
    flask_talisman.Talisman(app, content_security_policy=None)


@app.route("/")
def get_index():
    return flask.send_file("dist/index.html")


@app.route("/admin")
def get_admin():
    if ADMIN_ENABLED:
        return flask.send_file("dist/admin.html")
    else:
        return "Admin dashboard not enabled", 403


@app.route("/<path>")
def get_static_file(path):
    if not path.endswith(".html"):
        return flask.send_from_directory("dist", path)
    flask.abort(404)


@app.route("/api/v1/admin/data")
def get_admin_data():
    if ADMIN_ENABLED:
        try:
            with open("data.json") as f:
                return flask.jsonify(json.load(f))
        except (OSError, json.JSONDecodeError):
            return "Data not available", 500
    else:
        return "Admin dashboard not enabled", 403


@app.route("/api/v1/admin/data", methods=["POST"])
def set_admin_data():
    if ADMIN_ENABLED:
        try:
            data = flask.request.get_json()
            with open("data.json.tmp", "w") as f:
                json.dump(data, f)
            os.rename("data.json.tmp", "data.json")
            return "Wrote data successfully", 200
        except OSError:
            return "Failed to write data", 500
    else:
        return "Admin dashboard not enabled", 403


PUBLIC_KEYS = {
    "city",
    "cityLat",
    "cityLong",
    "comments",
    "country",
    # "email",
    "major",
    "name",
    "org",
    "orgLat",
    "orgLong",
    "path",
    "state",
    "summerCity",
    "summerCityLat",
    "summerCityLong",
    "summerCountry",
    "summerOrg",
    "summerOrgLat",
    "summerOrgLong",
    "summerPlans",
    "summerState",
}


@app.route("/api/v1/data", methods=["POST"])
def get_data():
    try:
        token = flask.request.json["oauthToken"]
        if not isinstance(token, str):
            raise TypeError
    except (KeyError, TypeError, json.JSONDecodeError):
        return "Request did not include token", 400
    try:
        r = requests.get(
            "https://oauth2.googleapis.com/tokeninfo?id_token={}".format(
                urllib.parse.quote(token)
            ),
            timeout=5,
        )
        r.raise_for_status()
        auth = r.json()
        if (
            auth["aud"]
            != "548868103597-3th6ihbnejkscon1950m9mm31misvhk9.apps.googleusercontent.com"
        ):
            raise ValueError
        if auth["hd"] != "g.hmc.edu":
            raise ValueError
    except (
        KeyError,
        TypeError,
        ValueError,
        json.JSONDecodeError,
        requests.exceptions.RequestException,
    ):
        return "Bad token", 401
    try:
        with open("data.json") as f:
            responses = json.load(f)
        return flask.jsonify(
            [
                {key: r.get(key, "") for key in PUBLIC_KEYS}
                for r in responses
                if r["processed"] == r["timestamp"]
            ]
        )
    except (OSError, json.JSONDecodeError):
        return "Data not available", 500


if AUTOFETCH_ENABLED:

    def start_autofetch():
        try:
            sheets.download_form_responses()
        finally:
            timer = threading.Timer(60, sheets.download_form_responses)
            timer.daemon = True
            timer.start()

    threading.Thread(target=start_autofetch, daemon=True).start()
