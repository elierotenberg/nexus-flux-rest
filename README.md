Nexus Flux REST
===============

Nexus Flux for REST backends. Stores are exposed by HTTP GET, and Actions are exposed by HTTP POST.

This package implements flux over the wire without the real-time websocket automatic updates.

If you want a more complex stack but automatic updates, you should check out [nexus-flux-socket.io](https://github.com/elierotenberg/nexus-flux-socket.io).

If you want to use Nexus Flux (including Nexus Flux REST) in a React app, you should also check out [react-nexus](https://github.com/elierotenberg/react-nexus).

Example
=======

Backend code (run by a Node server in our datacenter):

```js
import RESTServer from 'nexus-flux-rest/server';

// We define the behaviour of the server-side single source of truth
class MyServer extends RESTServer {
  constructor() {
    super({ port: 8080, salt: '--INSERT UNIQUE SALT--' });
    this.stores = {
      '/counters': new Remutable({
        visits: 0,
        clicks: 0,
        mouseenter: 0,
        mouseleave: 0,
      }),
    };
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
      if(path === '/increaseCounter') {
        const { target } = params;
        if(target === 'visits' ||
          target === 'clicks' ||
          target === 'mouseenter' ||
          target === 'mouseleave') {
          this.dispatchUpdate('/counters',
            this.stores['/counters']
              .set(target, this.stores['/counters'].get(target) + 1)
              .commit()
          );
        }
      }
    });
  }
}
```

Front-end code (run by either client browser or a Node server for server-side rendering):

```
import { root, component } from 'react-nexus';

// Root component
@root(({ data }) => ({
   remote: new RESTClient('https://mydomain.com:8080/'),
}))
class MyRoot extends React.Component { ... }

// Regular component
@component(({ target }) => ({
  counter: [`remote://counters`, { [target]: 0 }],
}))
@transform(({ counter, target }) => ({
  counter: counter.get(target)
}))
class Counter extends React.Component {
  static propTypes = {
    target: React.PropTypes.string.isRequired,
    counter: React.PropTypes.number.isRequired,
  };

  render() {
    const { props } = this;
    return <span>{target}: {counter}</span>;
  }
}

@component()
class Button extends React.Component {
  componentDidMount() {
    this.increaseCounter('visits')();
  }

  increaseCounter(target) {
    return (e) => {
      if(e) {
        e.preventDefault();
      }
      this.props.nexus.dispatchAction('/increaseCounter', { target: target });
    };
  }

  render() {
    return <button
      onClick={this.increaseCounter('clicks')}
      onMouseEnter={this.increaseCounter('mouseenter')}
      onMouseLeave={this.increaseCounter('mouseleave')}
    >Click me!</button>;
  }
}
```

#### License

MIT [Elie Rotenberg](http://elie.rotenberg.io) <[elie@rotenberg.io](mailto:elie@rotenberg.io)>
