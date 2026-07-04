const {
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} = require("@aws-sdk/client-s3");

const fs = require("fs");
const path = require("path");
const os = require("os");
const s3 = require("../config/aws");

const uploadFile = async (file, caseId) => {
    const fileStream = fs.createReadStream(file.path);
    const safeName = file.originalname.replace(/\s+/g, "_");

    const key = `evidence/${caseId}/${Date.now()}-${safeName}`;

    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: fileStream,
            ContentType: file.mimetype,
        })
    );

    return {
        key,
        url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    };
};

const downloadFile = async (key) => {
    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
    });

    const response = await s3.send(command);

    const tempPath = path.join(
        os.tmpdir(),
        `${Date.now()}-${path.basename(key)}`
    );

    const writeStream = fs.createWriteStream(tempPath);

    await new Promise((resolve, reject) => {
        response.Body.pipe(writeStream);
        response.Body.on("error", reject);
        writeStream.on("finish", resolve);
    });

    return tempPath;
};

const deleteFile = async (key) => {
    await s3.send(
        new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
        })
    );
};

module.exports = {
    uploadFile,
    downloadFile,
    deleteFile,
};