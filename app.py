import flask
import json
import os

ADMIN_ENABLED = bool(os.environ.get("LAM_ADMIN_ENABLED"))

app = flask.Flask(__name__)


@app.route("/")
def get_index():
    return flask.send_file("dist/index.html")


@app.route("/admin")
def get_admin():
    return flask.send_file("dist/admin.html")


@app.route("/<path>")
def get_static_file(path):
    if not path.endswith(".html"):
        return flask.send_from_directory("dist", path)
    flask.abort(404)


@app.route("/api/v1/admin/data")
def get_admin_data():
    if ADMIN_ENABLED:
        try:
            with open("data-admin.json") as f:
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
    "summerPath",
    "summerState",
    "summerPlans",
}


@app.route("/api/v1/data")
def get_data():
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
