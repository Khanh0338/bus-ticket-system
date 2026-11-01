const express = require("express");
const a = express();
a.use((req, res) => res.json({ path: req.originalUrl, method: req.method, uid: req.headers["x-user-id"] || null, role: req.headers["x-user-role"] || null }));
a.listen(5101);
