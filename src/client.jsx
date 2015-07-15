import { Client, Remutable } from 'nexus-flux';
import { Requester } from 'immutable-request';
import _ from 'lodash';
const __DEV__ = process.env.NODE_ENV === 'development';

class RESTClient extends Client {
  url = null;
  salt = null;
  reqOpts = null;
  requester = null;

  constructor({ url, salt, reqOpts = {} }) {
    if(__DEV__) {
      url.should.be.a.String;
      salt.should.be.a.String;
      reqOpts.should.be.an.Object;
    }
    super();
    Object.assign(this, {
      url,
      salt,
      reqOpts,
      requester: new Requester(url, reqOpts),
    });
    this.lifespan.onRelease(() => {
      this.requester.cancelAll(new Error('Client lifespan released'));
      this.requester.reset();
      this.requester = null;
    });
  }

  fetch(path, hash = null) {
    if(__DEV__) {
      path.should.be.a.String;
      (hash === null || _.isNumber(hash)).should.be.true;
    }
    if(hash !== null) {
      path = path + ((path.indexOf('?') === -1) ? '?' : '&') + 'h=' + hash;
    }
    return this.requester.GET(path) // eslint-disable-line new-cap, babel/new-cap
    .then((js) => {
      if(__DEV__) {
        js.should.be.an.Object;
      }
      return Remutable.fromJS(js);
    });
  }

  sendToServer(ev) {
    if(__DEV__) {
      ev.should.be.an.instanceOf(Client.Event);
    }
    // ignore all events except Action
    if(ev instanceof Client.Event.Action) {
      const { path, params } = ev;
      this.requester.POST(path, { [this.salt]: params }); // eslint-disable-line new-cap, babel/new-cap
    }
  }
}

export default RESTClient;
