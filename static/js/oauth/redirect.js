"use strict";

import Cookies from "js-cookie";

const oauthToken = new URLSearchParams(
  decodeURIComponent(document.location.hash.slice(1)),
).get("id_token");

Cookies.set("oauthToken", oauthToken, { expires: 999999 });

window.location.replace("/");
