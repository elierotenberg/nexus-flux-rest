const { describe, it, after, before } = global;
import Remutable from 'remutable';
import Client from '../client';
import Server from '../server';
import createError from 'http-errors';
import _ from 'lodash';
import Promise from 'bluebird';

class TestServer extends Server {
  constructor({ salt, port, stores }) {
    super({ salt, port });
    this.stores = stores;
  }

  serveStore({ path }) {
    return Promise.try(() => {
      if(!_.isString(path)) {
        throw createError(400, 'Path should be a string.');
      }
      if(this.stores[path] === void 0) {
        throw createError(404, 'No such store.');
      }
      return this.stores[path].toJSON();
    });
  }

  dispatchAction(path, params) {
    return Promise.try(() => {
      if(path === '/setFoo') {
        _.each(params, (val, key) => this.stores['/foo'].set(key, val));
        this.dispatchUpdate('/foo', this.stores['/foo'].commit());
      }
    });
  }
}

describe('Nexus Flux REST', function test() {
  describe('Construction', () => {
    const salt = 'construction';
    const port = 44000;
    let server = null;
    let client = null;
    it('should construct server', () => {
      server = new TestServer({ salt, port, stores: { '/foo': new Remutable({ 'hello': 'world' }) } });
    });

    it('should construct client', () => {
      client = new Client({ url: `http://127.0.0.1:${port}`, salt });
    });

    it('should destruct server', () => server.lifespan.release());

    it('should destruct client', () => client.lifespan.release());
  });

  describe('Fetching', () => {
    const salt = 'fetching';
    const port = 44001;
    let server = null;
    let client = null;
    before(() => {
      server = new TestServer({ salt, port, stores: { '/foo': new Remutable({ 'hello': 'world' }) } });
      client = new Client({ url: `http://127.0.0.1:${port}`, salt });
    });
    after(() => {
      server.lifespan.release();
      client.lifespan.release();
    });
    it('should fetch store', (done) => {
      client.fetch('/foo')
      .then((rem) => {
        JSON.stringify(rem.head.toJS()).should.be.exactly(JSON.stringify({ 'hello': 'world' }));
        done();
      });
    });
  });

  describe('Modifying and fetching', () => {
    const salt = 'modifying-and-fetching';
    const port = 44002;
    let server = null;
    let client = null;
    before(() => {
      server = new TestServer({ salt, port, stores: { '/foo': new Remutable({ 'hello': 'world' }) } });
      client = new Client({ url: `http://127.0.0.1:${port}`, salt });
    });
    after(() => {
      server.lifespan.release();
      client.lifespan.release();
    });
    it('should send action', () => {
      client.dispatchAction('/setFoo', { 'bar': 'baz' });
    });
    it('should fetch updated store', (done) => {
      client.fetch('/foo')
      .then((rem) => {
        JSON.stringify(rem.head.toJS()).should.be.exactly(JSON.stringify({ 'hello': 'world', 'bar': 'baz' }));
        done();
      });
    });
  });
});
