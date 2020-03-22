# Life After Mudd

Small webapp that visualizes where Harvey Mudd's Class of 2020 will be
after graduation, using data from [this Google
Form](https://forms.gle/PqEHTjpBDGBXfH4W8).

First install [Docker](https://www.docker.com/). Then, to run:
* Set up project and dependencies inside a Docker container (with
  source synchronized with repo checkout), `make docker`.
* Start up tmux, `make tmux`. Recall that `ctrl+b c` opens a new
  window and `ctrl+b p/n` move between windows.
* Obtain Google Drive API key from **@raxod502** and place it in
  `.oauth-private-key.json`.
* Download form data, `make down`.
* Build static site in development mode, `make build-dev`.
* Start the development server, `make app-dev`.
* Head to <http://localhost:8080/admin> for the admin dashboard, and
  <http://localhost:8080> for the main webapp.

To deploy, install the [Heroku
CLI](https://devcenter.heroku.com/articles/heroku-cli) and run `make
deploy`. (But this happens automatically when a commmit is merged to
`master`, courtesy of CircleCI.)

## Build warnings

```
warning " > @mapbox/mapbox-gl-geocoder@4.5.1" has unmet peer dependency "mapbox-gl@>= 0.47.0 < 2.0.0".
```

Because we Parcel is incompatible with mapbox-gl for dumb reasons, we
need to include mapbox-gl via `<script>` tag. Hence it's not installed
through Yarn; that would just be misleading.
