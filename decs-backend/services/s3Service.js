const {
    PutObjectCommand,
    DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const fs = require("fs");
const path = require("path");
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
    deleteFile,
};