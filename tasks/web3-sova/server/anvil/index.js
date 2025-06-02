const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const allowedMethods = new Set([
  "eth_chainId",
  "eth_call",
  "eth_getCode",
  "eth_getStorageAt",
]);

app.post("/", async (req, res) => {
  //console.log(req.body);
  if (!req.is('application/json')) {
    return res.status(415).json({ message: 'Only application/json is supported.' });
  }

  const requests = Array.isArray(req.body) ? req.body : [req.body];

  for (const rpc of requests) {
    if (!allowedMethods.has(rpc.method)) {
      return res.status(403).json({
        message: `Method "${rpc.method}" is not allowed.`
      });
    }
  }

  try {
    const response = await axios.post("http://anvil-backend:8546", req.body);
    res.send(response.data);
  } catch (err) {
    res.status(500).json({
      message: 'RPC error',
      error: err.message
    });
  }
});

app.listen(8545, () => console.log("Whitelist RPC proxy listening on 8545"));
