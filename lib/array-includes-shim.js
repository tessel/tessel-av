if (!Array.prototype.includes) {
  Array.prototype.includes = function(entry) {
    return this.indexOf(entry) !== -1;
  };
}
