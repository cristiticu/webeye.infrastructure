import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface StackProps extends cdk.StackProps {
    regionName: string;
    environment: 'dev' | 'production';
    repositoryName: string;
    imageTag: string;
    checkQueue: cdk.aws_sqs.Queue;
    aggregateQueue: cdk.aws_sqs.Queue;
}

export class LambdaTaskExtractorStack extends cdk.Stack {
    public readonly taskExtractorLambdaFunction: cdk.aws_lambda.DockerImageFunction;

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const deploymentPrefix = props.environment === 'dev' ? 'stage' : 'production';

        const repo = cdk.aws_ecr.Repository.fromRepositoryAttributes(this, 'Repo', {
            repositoryName: props.repositoryName,
            repositoryArn: `arn:aws:ecr:${props.regionName}:${this.account}:repository/${props.repositoryName}`,
        });

        const lambdaFunctionRole = new cdk.aws_iam.Role(this, `webeye.role.stage.task-extractor.${this.region}`, {
            roleName: `webeye.role.stage.task-extractor.${this.region}`,
            assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
        });

        lambdaFunctionRole.addManagedPolicy(
            cdk.aws_iam.ManagedPolicy.fromManagedPolicyName(this, 'DynamoDB Policy for lambda', `webeye.policy.dynamodb.${deploymentPrefix}.all_tables`)
        );

        lambdaFunctionRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

        this.taskExtractorLambdaFunction = new cdk.aws_lambda.DockerImageFunction(this, `${deploymentPrefix}_webeye-task-extractor-${this.region}`, {
            functionName: `${deploymentPrefix}_webeye-task-extractor-${this.region}`,
            code: cdk.aws_lambda.DockerImageCode.fromEcr(repo, {
                tagOrDigest: `${deploymentPrefix}.${props.imageTag}`,
            }),
            environment: {
                ENVIRONMENT: 'dev',
            },
            timeout: cdk.Duration.seconds(60),
            role: lambdaFunctionRole,
        });

        props.checkQueue.grantSendMessages(this.taskExtractorLambdaFunction);
        props.aggregateQueue.grantSendMessages(this.taskExtractorLambdaFunction);
    }
}
