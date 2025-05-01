import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface StackProps extends cdk.StackProps {
    regionName: string;
    environment: 'dev' | 'production';
}

export class SqsStack extends cdk.Stack {
    public readonly checkQueue: cdk.aws_sqs.Queue;
    public readonly aggregateQueue: cdk.aws_sqs.Queue;

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const deploymentPrefix = props.environment === 'dev' ? 'stage' : 'production';

        this.checkQueue = new cdk.aws_sqs.Queue(this, `${deploymentPrefix}_webeye-check-queue`, {
            queueName: `${deploymentPrefix}_webeye-check-queue`,
            visibilityTimeout: cdk.Duration.seconds(60),
            retentionPeriod: cdk.Duration.minutes(5),
            receiveMessageWaitTime: cdk.Duration.seconds(20),
        });

        this.aggregateQueue = new cdk.aws_sqs.Queue(this, `${deploymentPrefix}_webeye-aggregate-queue`, {
            queueName: `${deploymentPrefix}_webeye-aggregate-queue`,
            visibilityTimeout: cdk.Duration.seconds(30),
            deliveryDelay: cdk.Duration.seconds(50),
            retentionPeriod: cdk.Duration.minutes(5),
            receiveMessageWaitTime: cdk.Duration.seconds(20),
        });
    }
}
