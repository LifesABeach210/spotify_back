/** @format */

// /** @format */
var express = require("express"); // Express web server framework
var request = require("request"); // "Request" library
var cors = require("cors");
var logger = require("morgan");

var querystring = require("query-string");
var cookieParser = require("cookie-parser");
require("dotenv").config();
var client_id = process.env.CLIENT_ID; // Your client id
var client_secret = process.env.CLIENT_SECRET; // Your secret
var redirect_uri = process.env.REDIRECT_URI + "/callback"; // Your redirect uri
const refresh_token = process.env.REFRESH_TOKEN;
const code = process.env.CODE;
/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = "spotify_auth_state";
var usersRouter = require("./routes/users");
var playlistRouter = require("./routes/playlist");
var app = express();

app.use(express.static(__dirname + "/public"));
const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions)).use(cors()).use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger("dev"));
app.use("/api/users", usersRouter);
app.use("/api/playlist", playlistRouter);
var { mongoConnect } = require("./mongo.js");
mongoConnect();
app.get("/api/login", function (req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope =
    " user-top-read user-read-private user-library-read playlist-modify-public user-read-private user-read-recently-played streaming playlist-modify-private user-library-modify user-read-playback-position user-read-currently-playing user-follow-read playlist-read-collaborative user-read-email user-follow-modify playlist-read-private user-modify-playback-state user-read-playback-state ";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

app.get("/api/callback", function (req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      },
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token || code,
          refresh_token = body.refresh_token || refresh_token;
        expires_in = body.expires_in || expires_in;
        var options = {
          url: "https://api.spotify.com/v1/me",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        // use the access token to access the Spotify Web API
        request.get(options, function (error, response, body) {
          console.log(body);
        });
        const queryParams = querystring.stringify({
          access_token,
          refresh_token,
          expires_in,
        });
        // res.status(200).json({
        //   access_token: access_token,
        //   refresh_token: refresh_token,
        // });
        // we can also pass the token to the browser to make requests from there
        res.redirect(
          `${process.env.FRONTEND_URI}/?${queryParams}` +
            querystring.stringify({
              access_token: access_token,
              refresh_token: refresh_token,
            })
        );
      } else {
        res.redirect(
          `/?` +
            querystring.stringify({
              error: "invalid_token",
            })
        );
      }
    });
  }
});

app.get("/api/refresh_token", function (req, res) {
  // requesting access token from refresh token
  var refresh_token = req.body.refresh_token;
  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },

    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var refresh_token = body.refresh_token;
      var access_token = body.access_token;
      console.log(refresh_token);
      console.log(access_token, "token");

      res.json({
        access_token: access_token,
        refresh_token: refresh_token,
      });
    }
  });
});

console.log("Listening on 8888");
app.listen(8888);
