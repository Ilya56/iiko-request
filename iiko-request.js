/**
 *
 * name: iiko-card5
 * documentation: https://docs.google.com/document/d/1kuhs94UV_0oUkI2CI3uOsNo_dydmh9Q0MFoDWmhzwxc/edit#
 * author: pub42 (xziy, ...)
 *
 * (c) 2018
 * v 0.2
 */
const https = require('https'); // iiko biz support only SSL requests

let config;
let access_token;

function init(_config) {
  config = _config;
}

function call(method, params, modifier, data) {
  return new Promise(function (resolve, reject) {
    switch (method.type) {

      case 'GET':
        get(fetchUrl(method, params, modifier))
          .then(resolve)
          .catch(reject);
        break;

      case 'POST':
        post(fetchUrl(method, params, modifier), data)
          .then(resolve)
          .catch(reject);
        break;

      default:
        return reject('iiko-request > call: method is not defined');
    }
  });
}

function fetchUrl(method, data, modifier) {
  let url = method.path;
  if (modifier)
    url = modifier(url);
  url += '?';

  for (let param in method.params) {
    if (method.params.hasOwnProperty(param)) {
      if (!data.hasOwnProperty(param)) {
        console.error("iiko-request > fetchUrl: The expected " + param + " property is not found");
      }
      url = url + param + '=' + data[param] + '&';
    }
  }

  return url;
}

function get(url) {
  return new Promise(function (resolve, reject) {
    checkToken().then(token => {
      let path = url + '&access_token=' + token;
      // console.log(path);
      https.get({
          hostname: config.host,
          port: config.port,
          path: path,
          agent: false // create a new agent just for this one request
        },
        res => createAnswer(res).then(resolve).catch(reject)
      ).on('error', reject);
    })
      .catch(reject);
  });
}

function post(url, data) {
  return new Promise((resolve, reject) => {
    checkToken().then(token => {
      let path = url + '&access_token=' + token;
      // console.log(path);

      let req = https.request({
        hostname: config.host,
        port: config.port,
        path: path,
        agent: false,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }, res => {
        res.setEncoding('utf8');
        createAnswer(res)
          .then(resolve)
          .catch(reject);
      }).on('error', reject);

      req.write(JSON.stringify(data));
      req.end();
    })
      .catch(reject);
  });
}

function getToken() {
  return new Promise(function (resolve, reject) {
    const path = '/api/0/auth/access_token?user_id=' + config.login + '&user_secret=' + config.password;

    https.get({
      hostname: config.host,
      port: config.port,
      path: path,
      agent: false // create a new agent just for this one request
    }, res => {
      res.on('data', token => {
        try {
          const temp = JSON.parse(token);

          if (/[A-Za-z1-9_]*/.test(temp)) {
            access_token = temp;
            return resolve(temp);
          } else {
            getToken()
              .then(resolve)
              .catch(reject);
          }
        } catch (e) {
          return reject(e);
        }
      });
    }).on('error', reject);
  });
}

const message = "true";

function checkToken() {
  return new Promise((resolve, reject) => {
    const path = '/api/0/auth/echo?msg=' + message + '&access_token=' + access_token;
    //console.log(path);

    https.get({
      hostname: config.host,
      port: config.port,
      path: path,
      agent: false // create a new agent just for this one request
    }, res => {
      res.on('data', res => {
        if (res.toString() === '"Wrong access token"') {
          getToken()
            .then(res)
            .catch(reject);
        } else if (res.toString() === '"' + message + '"') {
          return resolve(access_token);
        } else {
          return reject('response undefined ' + res);
        }
      });
    }).on('error', reject);
  })
}

function createAnswer(res) {
  return new Promise((resolve, reject) => {
    let rawData = '';

    res.on('data', data => rawData += data);

    res.on('end', () => {
      try {
        const data = JSON.parse(rawData);
        return resolve(data);
      } catch (e) {
        console.log(rawData);
        console.log(e.message);
        return reject(rawData.replace(/(<([^>]+)>)/ig, " "));
      }
    });
  });
}

exports.init = init;
exports.call = call;
