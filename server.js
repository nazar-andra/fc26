const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataDir = process.env.DATA_DIR || path.join(root, "data");
const basicAuthValue = `Basic ${Buffer.from(
  `${process.env.ADMIN_USER || "admin"}:${process.env.ADMIN_PASS || "123"}`,
).toString("base64")}`;

// Data files that can be read/written dynamically through the API.
// Each entry maps an API route to a JSON file inside DATA_DIR.
const dataFiles = {
  "/api/state": "bracket-data.json",
  "/api/schedule": "schedule-data.json",
  "/api/team-names": "team-names.json",
  "/api/futsal-state": "futsal-data.json",
  "/api/futsal-team-names": "futsal-team-names.json",
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readDataFile(res, fileName) {
  const filePath = path.join(dataDir, fileName);
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err && err.code === "ENOENT") {
      sendJson(res, 200, {});
      return;
    }

    if (err) {
      sendJson(res, 500, { error: `Could not read ${fileName}` });
      return;
    }

    try {
      sendJson(res, 200, JSON.parse(data));
    } catch {
      sendJson(res, 500, { error: `${fileName} is not valid JSON` });
    }
  });
}

function saveDataFile(req, res, fileName) {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) {
      req.destroy();
    }
  });

  req.on("end", () => {
    try {
      const state = JSON.parse(body);
      const filePath = path.join(dataDir, fileName);
      fs.writeFile(
        filePath,
        `${JSON.stringify(state, null, 2)}\n`,
        "utf8",
        (err) => {
          if (err) {
            sendJson(res, 500, { error: `Could not save ${fileName}` });
            return;
          }

          sendJson(res, 200, { ok: true });
        },
      );
    } catch {
      sendJson(res, 400, { error: "Request body is not valid JSON" });
    }
  });
}

function isAuthorized(req) {
  return req.headers.authorization === basicAuthValue;
}

function sendUnauthorized(res) {
  res.writeHead(401, {
    "Content-Type": "text/plain; charset=utf-8",
    "WWW-Authenticate": 'Basic realm="Bracket Editor", charset="UTF-8"',
    "Cache-Control": "no-store",
  });
  res.end("Authentication required");
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(
    req.url,
    `http://${req.headers.host || "127.0.0.1"}`,
  );
  const urlPath = decodeURIComponent(requestUrl.pathname || "/");
  const isViewOnly = requestUrl.searchParams.get("view") === "1";
  const protectedRoute =
    urlPath === "/" ||
    urlPath === "/index.html" ||
    urlPath === "/futsal" ||
    urlPath === "/futsal.html" ||
    Object.prototype.hasOwnProperty.call(dataFiles, urlPath);

  if (protectedRoute && !isViewOnly && !isAuthorized(req)) {
    sendUnauthorized(res);
    return;
  }

  // Dynamic data API (read/write JSON files in DATA_DIR).
  if (Object.prototype.hasOwnProperty.call(dataFiles, urlPath)) {
    if (req.method === "GET") {
      readDataFile(res, dataFiles[urlPath]);
      return;
    }
    if (req.method === "PUT") {
      saveDataFile(req, res, dataFiles[urlPath]);
      return;
    }
  }

  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const targetPath =
    safePath === "/"
      ? path.join(root, "index.html")
      : path.join(root, safePath);

  fs.stat(targetPath, (err, stat) => {
    if (!err && stat.isFile()) {
      sendFile(res, targetPath);
      return;
    }

    if (!path.extname(targetPath)) {
      const htmlPath = `${targetPath}.html`;
      fs.stat(htmlPath, (htmlErr, htmlStat) => {
        if (!htmlErr && htmlStat.isFile()) {
          sendFile(res, htmlPath);
          return;
        }
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });
});

const port = process.env.PORT || 3004;
const host = process.env.HOST || "0.0.0.0";

server.listen(port, host, () => {
  console.log(`Bracket app running at http://${host}:${port}`);
  console.log(`Data directory: ${dataDir}`);
}); 
