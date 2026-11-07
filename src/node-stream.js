/** arbundles 在浏览器里用的 Node stream 垫片。 */
export class Transform {
  pipe(dest) {
    return dest;
  }

  on() {
    return this;
  }

  once() {
    return this;
  }

  write() {
    return true;
  }

  end() {
    return this;
  }

  read() {
    return null;
  }

  push() {
    return true;
  }
}

export class PassThrough extends Transform {}
