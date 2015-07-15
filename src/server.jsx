import { Client, Server } from 'nexus-flux';
const { Link } = Server;
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import createError from 'http-errors';
const __DEV__ = process.env.NODE_ENV === 'development';

class VolatileRESTLink extends Link {
  constructor({ req, res, salt }) {
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
    const { path, body } = req;
    const { [salt]: params } = body;
    setImmediate(() => {
      const ev = new (Client.Event.Action)({ path, params });
      this.receiveFromClient(ev);
      res.status(200).end();
      this.lifespan.release();
    });
  }
}

class RESTServer extends Server {
  salt = null;

  constructor({ salt, port = null, headers = {}, expressUse = [] }) {
    super();
    this.salt = salt;
    const app = express()
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
    .post('*', (req, res) => this.acceptLink(new VolatileRESTLink({ req, res, salt })))
    .listen(port);
    this.lifespan.onRelease(() => app.close());
  }

  serveStore({ path }) {
    return Promise.try(() => {
      if(__DEV__) {
        path.should.be.a.String;
      }
      throw createError(404, 'Virtual method invocation, you have to define serveStore function');
    });
  }
}

export default RESTServer;
