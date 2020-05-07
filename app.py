import json
import os
import threading
import urllib.parse

import flask
import flask_talisman
import google.auth.transport.requests
import google.oauth2.id_token

import sheets
import sessions

ADMIN_ENABLED = bool(os.environ.get("LAM_ADMIN_ENABLED"))
AUTOFETCH_ENABLED = bool(os.environ.get("LAM_AUTOFETCH_ENABLED"))
TLS_ENABLED = bool(os.environ.get("LAM_TLS_ENABLED"))

app = flask.Flask(__name__)
if TLS_ENABLED:
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


@app.route("/api/v1/admin/download", methods=["POST"])
def admin_download():
    if ADMIN_ENABLED:
        try:
            sheets.download_form_responses()
            return "Downloaded data successfully", 200
        except Exception as e:
            return f"Failed to download data: {e}", 500
    else:
        return "Admin dashboard not enabled", 403


@app.route("/api/v1/admin/upload", methods=["POST"])
def admin_upload():
    if ADMIN_ENABLED:
        try:
            sheets.upload_form_responses()
            return "Uploaded data successfully", 200
        except Exception as e:
            return f"Failed to upload data: {e}", 500
    else:
        return "Admin dashboard not enabled", 403


PUBLIC_KEYS = {
    "city",
    "cityLat",
    "cityLong",
    "comments",
    "country",
    "facebookProfile",
    "email",
    "major",
    "name",
    "org",
    "orgLat",
    "orgLink",
    "orgLong",
    "path",
    "phoneNumber",
    "state",
    "summerCity",
    "summerCityLat",
    "summerCityLong",
    "summerCountry",
    "summerOrg",
    "summerOrgLat",
    "summerOrgLink",
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
    email = sessions.check_token(token)
    if not email:
        try:
            # This API call takes about 125ms in my testing. Could be
            # optimized by doing our own JWT validation, probably. But
            # that would really suck so let's hold off on that for
            # now.
            #
            # https://developers.google.com/identity/sign-in/web/backend-auth
            idinfo = google.oauth2.id_token.verify_oauth2_token(
                token,
                google.auth.transport.requests.Request(),
                "548868103597-3th6ihbnejkscon1950m9mm31misvhk9.apps.googleusercontent.com",
            )
            if idinfo["iss"] not in (
                "accounts.google.com",
                "https://accounts.google.com",
            ):
                raise ValueError("Wrong issuer: {}".format(idinfo["iss"]))
            if idinfo["hd"] != "g.hmc.edu":
                raise ValueError("Wrong domain: {}".format(idinfo["hd"]))
            email = idinfo["email"]
            sessions.add_token(token, email)
        except ValueError as e:
            # Be careful changing. This is a magic string for the front end
            return "Bad token: {}".format(e), 401
    try:
        with open("data.json") as f:
            responses = json.load(f)
        return flask.jsonify(
            {
                "responses": [
                    {
                        "postGradEmail": r.get("postGradEmail", "")
                        or r.get("email", ""),
                        **{key: r.get(key, "") for key in PUBLIC_KEYS},
                    }
                    for r in responses
                    if r["processed"]
                ],
                "email": email.replace("g.hmc.edu", "hmc.edu")
                if not ADMIN_ENABLED
                else "*",
            }
        )
    except (OSError, json.JSONDecodeError):
        return "Data not available", 500


@app.errorhandler(404)
def page_not_found(e):
    return "Page not found", 404


@app.errorhandler(500)
def internal_server_error(e):
    return "Internal server error", 500


if AUTOFETCH_ENABLED:

    def start_autofetch():
        try:
            sheets.download_form_responses()
        finally:
            timer = threading.Timer(60, start_autofetch)
            timer.daemon = True
            timer.start()

    threading.Thread(target=start_autofetch, daemon=True).start()
