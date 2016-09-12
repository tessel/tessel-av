"use strict";

const av = require("../");
const ip = require("ip");
const os = require("os");
const http = require("http");
const port = 8888;

const camera = new av.Camera({
  fps: 30,
  // width: 1280,
  // height: 720,
  width: 800,
  height: 600,
});

const server = http.createServer((request, response) => {

  if (/frame/.test(request.url)) {
    console.log("asking for image...");

    response.writeHead(200, { "Content-Type": "image/jpeg" });
    camera.capture().pipe(response);
  } else {
    console.log("asking for web page...");
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(`
      <!doctype html>
      <html>
        <head>
          <title>${os.hostname()}</title>
        </head>
        <body>
          <img src="/frame">
        </body>
      </html>
    `);
  }
}).listen(port, () => {
  console.log(`http://${ip.address()}:${port}`);
  console.log(`<img src="${camera.url}">`);
});
