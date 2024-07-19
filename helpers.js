const contentfulExport = require("contentful-export");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const calculateNextBackup = (frequency, precise = true) => {
    let currentDate = new Date();

    currentDate.setHours(currentDate.getHours() + frequency);

    if (precise) {
        currentDate.setMinutes(0);
        currentDate.setSeconds(0);
    }

    let year = currentDate.getFullYear();
    let month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
    let day = ('0' + currentDate.getDate()).slice(-2);
    let hours = ('0' + currentDate.getHours()).slice(-2);
    let minutes = ('0' + currentDate.getMinutes()).slice(-2);
    let seconds = ('0' + currentDate.getSeconds()).slice(-2);

    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
}

const exportBackup = async (spaceId, managementToken,  region, accessKeyId, secretAccessKey, bucket, credentialId, con) => {
    await contentfulExport({ spaceId, managementToken, saveFile: false })
        .then(async (data) => {
            const s3 = new S3Client({
                region,
                credentials: { accessKeyId, secretAccessKey },
            });
            const fileName = calculateNextBackup(0, false) + ".json"

            await s3.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: fileName,
                    Body: JSON.stringify(data),
                })
            );

            const sql = `INSERT INTO LOGS (fileName, credentialId) VALUES ('${fileName}', '${credentialId}')`;
            con.query(sql, (err) => {
                if (err) 
                    throw err;
            })
        })
}

module.exports = {
    calculateNextBackup,
    exportBackup,
}
