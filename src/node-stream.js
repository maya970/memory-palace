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
