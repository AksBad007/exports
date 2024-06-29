const express = require("express");
const contentfulExport = require("contentful-export");
const contentfulImport = require("contentful-import");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const path = require("path");

const port = 3000;

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.post("/export", async (req, res, next) => {
  const {
    spaceId,
    managementToken,
    region,
    accessKeyId,
    secretAccessKey,
    Bucket,
  } = req.body;

  await contentfulExport({ spaceId, managementToken, saveFile: false })
    .then(async (data) => {
      const s3 = new S3Client({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });

      await s3.send(
        new PutObjectCommand({
          Bucket,
          Key: new Date().toISOString() + ".json",
          Body: JSON.stringify(data),
        })
      );

      res.sendStatus(200);
    })
    .catch((err) => {
      console.error("Oh no! Some errors occurred!", err);
      res.sendStatus(400);
      next(err);
    });
});

app.post("/import", async (req, res, next) => {
  const {
    spaceId,
    managementToken,
    region,
    accessKeyId,
    secretAccessKey,
    Bucket,
    fileName,
  } = req.body;

  const s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const { Body } = await s3.send(
    new GetObjectCommand({
      Bucket,
      Key: fileName,
    })
  );

  const content = JSON.parse(await Body.transformToString());

  await contentfulImport({ spaceId, managementToken, content })
    .then(() => {
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
