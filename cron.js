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

con.connect((err) => {
    if (err)
        throw err;
    console.log("DB connected.");

    con.query("SELECT * FROM CREDENTIALS WHERE deletedAt IS NULL AND HOUR(nextBackup) = HOUR(NOW())", async (err, result) => {
        if (err)
            throw err;
        console.log("creating", result.length, "backups");

        for ({ spaceId, managementToken, region, accessKeyId, secretAccessKey, bucket, id, frequency } of result) {
            await exportBackup(spaceId, managementToken, region, accessKeyId, secretAccessKey, bucket, id, con)
                .then(() => {
                    con.query(`UPDATE CREDENTIALS SET nextBackup = '${calculateNextBackup(frequency)}' WHERE id = ${id}`, (err) => {
                        if (err)
                            throw err;
                    })
                })
                .catch((err) => console.error("Error in cron job\n", err));
        }

        con.end();
    })
});
