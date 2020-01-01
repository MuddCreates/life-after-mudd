import flask
import json

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


@app.route("/api/v1/responses")
def get_responses():
    try:
        with open("responses.json") as f:
            return flask.jsonify(json.load(f))
    except (OSError, json.JSONDecodeError):
        return "Data not available", 500
