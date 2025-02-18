var loaderUtils = require("loader-utils");
var lqip = require("./lqip");

module.exports = function(contentBuffer) {
  this.cacheable && this.cacheable();
  var callback = this.async();

  var content = contentBuffer.toString("utf8");
  // image file path
  var path = this.resourcePath;

  // user options
  var config = loaderUtils.getOptions(this) || {};

  config.base64 = "base64" in config ? config.base64 : true;
  config.palette = "palette" in config ? config.palette : false;

  var contentIsUrlExport = /^module.exports = "data:(.*)base64,(.*)/.test(
    content
  );
  var contentIsFileExport = /^module.exports = (.*)/.test(content);
  var source = "";

  if (contentIsUrlExport) {
    source = content.match(/^module.exports = (.*)/)[1];
  } else {
    if (!contentIsFileExport) {
      var fileLoader = require("file-loader");
      content = fileLoader.call(this, contentBuffer);
    }
    source = content.match(/^module.exports = (.*);/)[1];
  }

  // promise array in case users want both
  // base64 & color palettes generated
  // that means we have 2 promises to resolve
  var outputPromises = [];

  if (config.base64 === true) {
    outputPromises.push(lqip.base64(path));
  } else {
    // push null if the user did not wish to use Base64 to preserve the order
    outputPromises.push(null);
  }

  // color palette generation is set to false by default
  // since it is little bit slower than base64 generation
  // if users wants it, grab it!

  if (config.palette === true) {
    outputPromises.push(lqip.palette(path));
  } else {
    // push null if the user did not wish to use palette to preserve the order
    outputPromises.push(null);
  }

  // final step, resolving all the promises we got so far
  Promise.all(outputPromises)
    .then(data => {
      if (data) {
        var result = 'module.exports = { "src": ' + source;
        // either null or base64
        if (data[0]) {
          result += ', "preSrc": ' + JSON.stringify(data[0]);
        }
        // either null or palette
        if (data[1]) {
          result += ', "palette": ' + JSON.stringify(data[1]);
        }
        result += " };";
        // the output will be sent to webpack!
        callback(null, result);
      } else {
        callback(err, null);
      }
    })
    .catch(error => {
      console.error(error);
      callback(err, null);
    });
};

module.exports.raw = true;
