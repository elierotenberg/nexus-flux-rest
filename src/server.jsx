import { Client, Server } from 'nexus-flux';
const { Link } = Server;
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import createError from 'http-errors';
import { DEFAULT_SALT } from './common';
const __DEV__ = process.env.NODE_ENV === 'development';

class VolatileRESTLink extends Link {
  constructor({ req, res, salt = DEFAULT_SALT }) {
    if(__DEV__) {
      req.should.be.an.Object
        .which.has.property('body')
          .which.is.an.Object
          .which.has.property(salt)
            .which.is.an.Object;
      res.should.be.an.Object
        .which.has.property('end')
          .which.is.a.Function;
      salt.should.be.a.String;
    }
    super();
    const ev = Client.Event.fromJS(req.body[salt]);
    if(__DEV__) {
      ev.should.be.an.instanceOf(Client.Event.Action);
    }
    this.receiveFromClient(ev);
    this.lifespan.release();
    res.status(200).end();
  }
}

class RESTServer extends Server {
  constructor({ salt = DEFAULT_SALT, port = null, headers = {}, expressUse = [] }) {
    super();
    this.salt = salt;
    express()
    .use(...expressUse.concat(cors()))
    .use(bodyParser.json())
    .get('*', (req, res) =>
      this.serveStore(req)
      .then((json) => res.set(headers).type('json').send(json))
      .catch((error) => {
        if(error.status !== void 0) {
          res.status(error.status).json(error);
        }
        else {
          res.status(500).json(error);
        }
      })
    )
    .post('*', (req, res) => new VolatileRESTLink({ req, res, salt }))
    .listen(port);
  }


}
