const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const reflect = require('promise-reflect');
const { merge } = require('lodash');

const app = express();
const port = 3001;

const appenders = [];

appenders.push({
  matches(req) {
    return req.route.methods.get && req.route.path === '/order/:id';
  },
  execute(req) {
    if (req.params.id === '1') {
      return Promise.resolve({
        name: 'first name'
      });
    }

    return Promise.resolve({
      name: 'other name'
    });
  }
});
appenders.push({
  matches(req) {
    return false;
  },
  execute(req) {
    return {
      made_of: 'poo',
    }
  }
});
appenders.push({
  matches(req) {
    return req.route.methods.get && req.route.path === '/order/:id';
  },
  execute(req) {
    return Promise.resolve({
      price: req.params.id * 100,
    });
  }
});

appenders.push({
  matches(req) {
    return req.route.methods.get && req.route.path === '/order/:id';
  },
  execute(req) {
    return Promise.reject({
      recomendations: {
        error: 'can not fetch recommendations'
      }
    });
  }
});

function intercept(req, res, next) {
  const tasks = appenders.filter(appender => appender.matches(req));
  if (tasks.length) {
    Promise.all(
      tasks.map(task => task.execute(req)).map(reflect)
    ).then(responses => res.send(
      merge(...responses.map(r => r.data || r.error))
    ));
  } else {
    next();
  }
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());

function logErrors(err, req, res, next) {
  console.error(err.stack);
  next(err);
}

function clientErrorHandler(err, req, res, next) {
  if (req.xhr) {
    res.status(500).send({ error: 'Something failed!' })
  } else {
    next(err)
  }
}

app.get('/order/:id', intercept);

app.use(logErrors);
app.use(clientErrorHandler);

app.use(function (req, res) {
  res.send(404);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
