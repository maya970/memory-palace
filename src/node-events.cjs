function EventEmitter() {}

EventEmitter.prototype.on = function on() {
  return this;
};
EventEmitter.prototype.addListener = EventEmitter.prototype.on;
EventEmitter.prototype.once = function once() {
  return this;
};
EventEmitter.prototype.emit = function emit() {
  return false;
};
EventEmitter.prototype.removeListener = function removeListener() {
  return this;
};
EventEmitter.prototype.removeAllListeners = function removeAllListeners() {
  return this;
};
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};
EventEmitter.prototype.listeners = function listeners() {
  return [];
};

module.exports = EventEmitter;
module.exports.EventEmitter = EventEmitter;
