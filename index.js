const fs = require("fs");
const express = require("express");
const contentfulExport = require("contentful-export");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");

const app = express();
const port = 3000;

app.use(express.json());

app.post("/", async (req, res, next) => {
  const {
    spaceId,
    managementToken,
    region,
    accessKeyId,
    secretAccessKey,
    Bucket,
  } = req.body;
  const filename = new Date().toISOString() + ".json";
  const filePath = path.join(__dirname, filename);

  await contentfulExport({ spaceId, managementToken, contentFile: filename })
    .then(async () => {
      const s3 = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });

      await s3.send(
        new PutObjectCommand({
          Bucket,
          Key: filename,
          Body: fs.readFileSync(filePath),
        })
      ).then(() => fs.unlinkSync(filePath));

      res.sendStatus(200);
    })
    .catch((err) => {
      console.error("Oh no! Some errors occurred!", err);
      res.sendStatus(400);
      next(err);
    });
});

app.listen(port, () => {
  console.info(`Example app listening on port ${port}`);
});
