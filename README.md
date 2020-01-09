# Life After Mudd

Small webapp that visualizes where Harvey Mudd's Class of 2020 will be
after graduation, using data from [this Google
Form](https://forms.gle/PqEHTjpBDGBXfH4W8).

Dependencies:

* [Python 3](https://www.python.org/)
* [Poetry](https://python-poetry.org/)
* [Yarn](https://yarnpkg.com/lang/en/)
* [Watchexec](https://github.com/watchexec/watchexec)

To run:

* Install dependencies, `make deps`.
* Obtain Google Drive API key from **@raxod502** and place it in
  `.oauth-private-key.json`.
* Download form data, `make down`.
* Build static site in development mode, `make dev`.
* Start the development server, `make app`.
