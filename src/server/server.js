import express from 'express';
import dotenv from 'dotenv';
import webpack from 'webpack';
import helmet from 'helmet';
import boom from '@hapi/boom';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import axios from 'axios';

import { config } from './config';


import React from 'react';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { createStore, compose } from 'redux';
import { renderRoutes } from 'react-router-config';
import { StaticRouter } from 'react-router-dom';
import serverRoutes from '../frontend/routes/serverRoutes';
import reducer from '../frontend/reducers';

import getManifest from './getManifest';

dotenv.config();
const { ENV, PORT, API_URL } = process.env;

const app = express();

require('./utils/auth/strategies/basic');
if (ENV == 'development') {
  console.log('Development config');
  const webpackConfig = require('../../webpack.config');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const compiler = webpack(webpackConfig);
  const serverConfig = { port: PORT, hot: true, };
  app.use(webpackDevMiddleware(compiler, serverConfig));
  app.use(webpackHotMiddleware(compiler));
} else {
  app.use((req, res, next) => {
    if (!req.hashManifest) req.hashManifest = getManifest();
    next();
  })
  app.use(express.static(`${__dirname}/public`));
  app.use(helmet());
  app.use(helmet.permittedCrossDomainPolicies());
  app.disable('x-powered-by');
}

app.use(express.json());
app.use(cookieParser());

const setResponse = (html, preloadedState, manifest) => {
  const mainStyles = manifest ? manifest['main.css'] : 'assets/app.css';
  const mainBuild = manifest ? manifest['main.js'] : 'assets/app.js';
  const vendorBuild = manifest ? manifest['vendors.js'] : 'assets/vendor.js';

  return (`
        <!DOCTYPE html>
            <html>
            <head>
                <link href="${mainStyles}" rel="stylesheet" type"text/css">
                <title>Platzi Video</title>
            </head>
            <body>
                <div id="app">${html}</div>
                <script>
                    window.__PRELOADED_STATE__ = ${JSON.stringify(preloadedState).replace(/</g, '\\u003c')}
                </script>
                <script src="${mainBuild}" type="text/javascript"></script>
                <script src="${vendorBuild}" type="text/javascript"></script>
            </body>
            </html>
    `)
};

const renderApp = async (req, res, next) => {
  try {
    let initialState;
    try {
      const { token, email, name, id } = req.cookies;
      let movieList = await axios({
        url: `${API_URL}/api/movies`,
        headers: { Authorization: `Bearer ${token}` },
        method: 'get'
      });
      let userMovies = await axios({
        url: `${API_URL}/api/movies?userId=${id}`,
        headers: { Authorization: `Bearer ${token}` },
        method: 'get'
      });
      userMovies = userMovies.data.data;
      movieList = movieList.data.data;
      initialState = {
        user: {
          id,
          email,
          name,

        },
        playing: {},
        myList: userMovies,
        trends: movieList.filter(movie => movie.contentRating === 'PG' && movie.id),
        originals: movieList.filter(movie => movie.contentRating === 'G' && movie.id),
      };
    } catch (err) {
      initialState = {
        user: {},
        playing: {},
        myList: [],
        trends: [],
        originals: []
      }
      console.log(err);
    }

    const isLogged = (initialState.user.id);
    const store = createStore(reducer, initialState);
    const preloadedState = store.getState();
    const html = renderToString(
      <Provider store={store}>
        <StaticRouter location={req.url} context={{}}>
          {renderRoutes(serverRoutes(isLogged))}
        </StaticRouter>
      </Provider>
    );
    res.send(setResponse(html, preloadedState, req.hashManifest))
  } catch (err) {
    console.log(err);
  }

}
app.get('*', renderApp);

app.post("/auth/sign-in", async function (req, res, next) {

  passport.authenticate("basic", function (error, data) {
    try {
      if (error || !data) {
        next(boom.unauthorized());
      }
      req.login(data, { session: false }, async function (err) {
        if (err) {
          next(err);
        }

        const { token, ...user } = data;

        res.cookie("token", token, {
          httpOnly: !(ENV === 'development'),
          secure: !(ENV === 'development'),
          domain:'platzivideo.com',
        });

        res.status(200).json(user);
      })
    } catch (err) {
      next(err);
    }
  })(req, res, next);

});

app.post("/auth/sign-up", async function (req, res, next) {
  const { body: user } = req;
  try {
    const userCreated = await axios({
      url: `${process.env.API_URL}/api/auth/sign-up`,
      method: "post",
      data: user
    });
    res.status(201).json(
      userCreated.data.data
    );
  } catch (err) {
    next(err)
  }

});

app.get("/movies", async function (req, res, next) {

});

app.post("/user-movies", async function (req, res, next) {
  try {
    const { body: userMovie } = req;
    const { token } = req.cookies;
    const { data, status } = await axios({
      url: `${config.apiUrl}/api/user-movies`,
      headers: { Authorization: `Bearer ${token}` },
      method: 'post',
      data: userMovie
    });
    if (status !== 201) {
      return next(boom.badImplementation());
    }
    res.status(201).json(data);
  } catch (err) {
    next(err)
  }
});

app.delete("/user-movies/:userMovieId", async function (req, res, next) {
  try {
    const { userMoviedId } = req.params;
    const { token } = req.cookies;
    const { data, status } = await axios({
      url: `${config.apiUrl}/api/user-movies/${userMoviedId}`,
      headers: { Authorization: `Bearer ${token}` },
      method: 'post',
      data: userMovie
    });
    if (status !== 201) {
      return next(boom.badImplementation());
    }
    res.status(201).json(data);
  } catch (err) {
    next(err)
  }
});

app.listen(PORT, (err) => {
  if (err) console.log(err);
  else console.log(`Server Running on port ${PORT}`)
});
