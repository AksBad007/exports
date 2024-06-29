const express = require("express");
const app = express();
const contentfulExport = require("contentful-export");
const port = 3000;

app.use(express.json());

app.post("/", async (req, res) => {
  const { spaceId, managementToken } = req.body;
  let result;

  await contentfulExport({ spaceId, managementToken })
    .then((res) => {
      console.log("Your space data:", res);
      result = res;
    })
    .catch((err) => {
      console.error("Oh no! Some errors occurred!", err);
      result = err;
    });

  res.send(result);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
