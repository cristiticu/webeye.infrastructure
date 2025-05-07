import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface StackProps extends cdk.StackProps {
    regionName: string;
    environment: 'dev' | 'production';
}

export class DynamodbStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const deploymentPrefix = props.environment === 'dev' ? 'stage' : 'production';

        const userAccounts = new cdk.aws_dynamodb.TableV2(this, `${deploymentPrefix}.webeye.user-accounts`, {
            tableName: `${deploymentPrefix}.webeye.user-accounts`,
            partitionKey: {
                name: 'guid',
                type: cdk.aws_dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 's_key',
                type: cdk.aws_dynamodb.AttributeType.STRING,
            },
            tableClass: cdk.aws_dynamodb.TableClass.STANDARD,
            billing: cdk.aws_dynamodb.Billing.onDemand(),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            globalSecondaryIndexes: [
                {
                    indexName: 'email-gsi',
                    partitionKey: {
                        name: 'email',
                        type: cdk.aws_dynamodb.AttributeType.STRING,
                    },
                    projectionType: cdk.aws_dynamodb.ProjectionType.INCLUDE,
                    nonKeyAttributes: ['guid', 'email', 'password', 'f_name', 'l_name', 'c_at'],
                    maxReadRequestUnits: 5,
                    maxWriteRequestUnits: 5,
                },
            ],
        });

        const monitoredWebpages = new cdk.aws_dynamodb.TableV2(this, `${deploymentPrefix}.webeye.monitored-webpages`, {
            tableName: `${deploymentPrefix}.webeye.monitored-webpages`,
            partitionKey: {
                name: 'u_guid',
                type: cdk.aws_dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'url',
                type: cdk.aws_dynamodb.AttributeType.STRING,
            },
            tableClass: cdk.aws_dynamodb.TableClass.STANDARD,
            billing: cdk.aws_dynamodb.Billing.onDemand(),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const scheduledTasks = new cdk.aws_dynamodb.TableV2(this, `${deploymentPrefix}.webeye.scheduled-tasks`, {
            tableName: `${deploymentPrefix}.webeye.scheduled-tasks`,
            partitionKey: {
                name: 'h_key',
                type: cdk.aws_dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 's_key',
                type: cdk.aws_dynamodb.AttributeType.STRING,
            },
            tableClass: cdk.aws_dynamodb.TableClass.STANDARD,
            billing: cdk.aws_dynamodb.Billing.onDemand(),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            globalSecondaryIndexes: [
                {
                    indexName: 'schedule-gsi',
                    partitionKey: {
                        name: 'schedule',
                        type: cdk.aws_dynamodb.AttributeType.STRING,
                    },
                    projectionType: cdk.aws_dynamodb.ProjectionType.ALL,
                    maxReadRequestUnits: 5,
                    maxWriteRequestUnits: 5,
                },
            ],
        });

        const monitoringEvents = new cdk.aws_dynamodb.TableV2(this, `${deploymentPrefix}.webeye.monitoring-events`, {
            tableName: `${deploymentPrefix}.webeye.monitoring-events`,
            partitionKey: {
                name: 'h_key',
                type: cdk.aws_dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 's_key',
                type: cdk.aws_dynamodb.AttributeType.STRING,
            },
            timeToLiveAttribute: 'ttl',
            tableClass: cdk.aws_dynamodb.TableClass.STANDARD,
            billing: cdk.aws_dynamodb.Billing.onDemand(),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
    }
}
