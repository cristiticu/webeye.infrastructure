#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LambdaSpeedCheckerStack } from '../lib/lambda-speed-checker-stack';
import { exit } from 'process';
import { DynamodbStack } from '../lib/dynamodb-stack';
import { LambdaCheckerManagerStack } from '../lib/lambda-checker-manager-stack';
import { LambdaSpeedCheckerDependsStack } from '../lib/lambda-speed-checker-depends-stack';
import { LambdaDowntimeAggregatorStack } from '../lib/lambda-downtime-aggregator-stack';
import { SqsStack } from '../lib/sqs-stack';
import { LambdaTaskExtractorStack } from '../lib/lambda-task-extractor-stack';
import { EventBridgeMinuteSchedulerStack } from '../lib/eventbridge-stack';
import { CloudfrontFrontendStack } from '../lib/cloudfront-frontend-stack';

const LAMBDA_SPEED_CHECKER_TAG = 'webeye.speed-checker_latest7May2025';
const LAMBDA_CHECKER_MANAGER_TAG = 'webeye.checker-manager_latest11May2025';
const LAMBDA_DOWNTIME_AGGREGATOR_TAG = 'webeye.downtime-aggregator_latest11May2025';
const LAMBDA_TASK_EXTRACTOR_TAG = 'webeye.task-extractor_latest1May2025';

const app = new cdk.App();
const account = app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;
const regions = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'ap-south-1',
    'ap-northeast-1',
    'ap-northeast-2',
    'ap-northeast-3',
    'ap-southeast-1',
    'ap-southeast-2',
    'ca-central-1',
    'eu-central-1',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'eu-north-1',
    'sa-east-1',
];

const environment = process.env.ENVIRONMENT_DEPLOY;

if (!environment) {
    console.error('No environment provided');
    exit(-1);
}

if (environment !== 'dev' && environment !== 'production') {
    console.error('Unsupported environment provided');
    exit(-1);
}

console.log(`Deploying for ${environment}`);

for (const region of regions) {
    new LambdaSpeedCheckerStack(app, `Webeye-LambdaSpeedCheckerStack-${region}`, {
        env: {
            account: account,
            region: region,
        },
        environment,
        regionName: region,
        repositoryName: 'webeye.checker.ecr',
        imageTag: LAMBDA_SPEED_CHECKER_TAG,
    });
}

new LambdaSpeedCheckerDependsStack(app, 'Webeye-LambdaSpeedCheckerDependsStack-eu-central-1', {
    env: {
        account: account,
        region: 'eu-central-1',
    },
    environment,
    regionName: 'eu-central-1',
});

new DynamodbStack(app, `Webeye-DynamoDbStack-eu-central-1`, {
    env: {
        account: account,
        region: 'eu-central-1',
    },
    environment,
    regionName: 'eu-central-1',
});

const sqsStack = new SqsStack(app, `Webeye-SQSStack-eu-central-1`, {
    env: {
        account: account,
        region: 'eu-central-1',
    },
    environment,
    regionName: 'eu-central-1',
});

new LambdaCheckerManagerStack(app, 'Webeye-LambdaCheckerManagerStack-eu-central-1', {
    env: {
        account: account,
        region: 'eu-central-1',
    },
    environment,
    regionName: 'eu-central-1',
    repositoryName: 'webeye.ecr',
    imageTag: LAMBDA_CHECKER_MANAGER_TAG,
    checkQueue: sqsStack.checkQueue,
});

new LambdaDowntimeAggregatorStack(app, 'Webeye-LambdaDowntimeAggregatorStack-eu-central-1', {
    env: {
        account: account,
        region: 'eu-central-1',
    },
    environment,
    regionName: 'eu-central-1',
    repositoryName: 'webeye.ecr',
    imageTag: LAMBDA_DOWNTIME_AGGREGATOR_TAG,
    aggregateQueue: sqsStack.aggregateQueue,
});

const taskExtractor = new LambdaTaskExtractorStack(app, 'Webeye-LambdaTaskExtractorStack-eu-central-1', {
    env: {
        account: account,
        region: 'eu-central-1',
    },
    environment,
    regionName: 'eu-central-1',
    repositoryName: 'webeye.ecr',
    imageTag: LAMBDA_TASK_EXTRACTOR_TAG,
    aggregateQueue: sqsStack.aggregateQueue,
    checkQueue: sqsStack.checkQueue,
});

new EventBridgeMinuteSchedulerStack(app, 'Webeye-EventBridgeMinuteScheduler-eu-central-1', {
    env: {
        account: account,
        region: 'eu-central-1',
    },
    environment,
    regionName: 'eu-central-1',
    function: taskExtractor.taskExtractorLambdaFunction,
});

new CloudfrontFrontendStack(app, 'Webeye-CloudFrontFrontend-eu-central-1', {
    env: {
        account: account,
        region: 'eu-central-1',
    },
    environment,
    regionName: 'eu-central-1',
    harCertificate: 'ef63e2d4-1dc3-4b50-9328-59013bbdc7f0',
});
