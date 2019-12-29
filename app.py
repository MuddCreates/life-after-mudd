import flask
import json

app = flask.Flask(__name__)


@app.route("/")
def get_index():
    return flask.send_file("dist/index.html")


@app.route("/<path>")
def get_static_file(path):
    return flask.send_from_directory("dist", path)


@app.route("/api/v1/responses")
def get_responses():
    try:
        with open("responses.json") as f:
            return flask.jsonify(json.load(f))
    except (OSError, json.JSONDecodeError):
        return "Data not available", 500
