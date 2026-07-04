require("dotenv").config();

const { ListBucketsCommand } = require("@aws-sdk/client-s3");
const s3 = require("./config/aws");

async function test() {
    try {
        const data = await s3.send(new ListBucketsCommand({}));

        console.log("✅ Connected to AWS");
        console.log(data.Buckets);
    } catch (err) {
        console.error(err);
    }
}

test();