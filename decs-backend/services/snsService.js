const {
    SNSClient,
    PublishCommand,
} = require("@aws-sdk/client-sns");

const sns = new SNSClient({
    region: process.env.AWS_REGION,
});

const publishNotification = async (subject, message) => {

    await sns.send(
        new PublishCommand({
            TopicArn: process.env.SNS_TOPIC_ARN,
            Subject: subject,
            Message: message,
        })
    );

};

module.exports = {
    publishNotification,
};