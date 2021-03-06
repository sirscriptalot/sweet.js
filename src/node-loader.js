// @flow
import SweetLoader, { phaseInModulePathRegexp } from './sweet-loader';
import { readFileSync } from 'fs';
import { dirname } from 'path';
import resolve from 'resolve';
import vm from 'vm';
import Store from './store';

export default class NodeLoader extends SweetLoader {
  extensions: ?string[];

  constructor(baseDir: string, extensions?: string[]) {
    super(baseDir);
    this.extensions = extensions;
  }

  normalize(name: string, refererName?: string, refererAddress?: string) {
    let normName = super.normalize(name, refererName, refererAddress);
    let match = normName.match(phaseInModulePathRegexp);
    if (match && match.length >= 3) {
      let resolvedName = resolve.sync(match[1], {
        basedir: refererName ? dirname(refererName) : this.baseDir,
        extensions: this.extensions ? this.extensions : [ '.js' ]
      });
      return `${resolvedName}:${match[2]}`;
    }
    throw new Error(`Module ${name} is missing phase information`);
  }

  fetch({name, address, metadata}: {name: string, address: {path: string, phase: number}, metadata: {}}) {
    let src = this.sourceCache.get(address.path);
    if (src != null) {
      return src;
    } else {
      src = readFileSync(address.path, 'utf8');
      this.sourceCache.set(address.path, src);
      return src;
    }
  }

  freshStore() {
    let sandbox = {
      process: global.process,
      console: global.console
    };
    return new Store(vm.createContext(sandbox));
  }

  eval(source: string, store: Store) {
    return vm.runInContext(source, store.getBackingObject());
  }
}
