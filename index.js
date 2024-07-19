const express = require("express");
const contentfulImport = require("contentful-import");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const mysql = require("mysql");
const { calculateNextBackup, exportBackup } = require("./helpers");
require("dotenv").config();

const con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

const port = 3000;

const app = express();

app.use(express.json());

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.post("/save", (req, res, next) => {
  const {
    spaceId,
    managementToken,
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
    frequency,
    credentialId,
  } = req.body;

  const sql = credentialId ?
    `UPDATE CREDENTIALS SET spaceId = '${spaceId}', managementToken = '${managementToken}', region = '${region}', accessKeyId = '${accessKeyId}', secretAccessKey = '${secretAccessKey}', bucket = '${bucket}', frequency = '${frequency}', nextBackup = '${calculateNextBackup(frequency)}' WHERE id = ${credentialId}` :
    `INSERT INTO CREDENTIALS (spaceId, managementToken, region, accessKeyId, secretAccessKey, bucket, frequency, nextBackup) VALUES ('${spaceId}', '${managementToken}', '${region}', '${accessKeyId}', '${secretAccessKey}', '${bucket}', '${frequency}', '${calculateNextBackup(frequency)}')`;

  con.query(sql, (err, { insertId }) => {
    if (err) {
      console.error("Oh no! Some errors occurred!", err);
      res.sendStatus(400);
      next(err);
    }

    res.status(200).send({ id: insertId || credentialId });
  });
});

app.post("/export", async (req, res, next) => {
  const {
    spaceId,
    managementToken,
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
    credentialId,
  } = req.body;

  await exportBackup(spaceId, managementToken, region, accessKeyId, secretAccessKey, bucket, credentialId, con)
    .then(() => res.sendStatus(200))
    .catch((err) => {
      console.error('error in exporting backup.\n', err);
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
    bucket,
    fileName,
  } = req.body;

  const s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const { Body } = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: fileName,
    })
  );

  const content = JSON.parse(await Body.transformToString());

  await contentfulImport({ spaceId, managementToken, content })
    .then(() => res.sendStatus(200))
    .catch((err) => {
      console.error("Oh no! error occurred in importing!", err);
      res.sendStatus(400);
      next(err);
    });
});

app.listen(port, () => {
  console.info(`Example app listening on port ${port}`);

  con.connect((err) => {
    if (err)
      throw err;
    console.log("DB Connected.");
  });
});
