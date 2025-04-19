#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LambdaSpeedCheckerStack } from '../lib/lambda-speed-checker-stack';
import { exit } from 'process';
import { DynamodbStack } from '../lib/dynamodb-stack';
import { LambdaCheckerManagerStack } from '../lib/lambda-checker-manager-stack';

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
        imageTag: 'webeye.speed-checker_latest19Apr2025-4',
    });
}

new DynamodbStack(app, `Webeye-DynamoDbStack-eu-central-1`, {
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
    imageTag: 'webeye.checker-manager_latest14Apr2025',
});
