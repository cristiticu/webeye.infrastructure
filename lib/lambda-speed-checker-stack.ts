import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface StackProps extends cdk.StackProps {
    regionName: string;
    environment: 'dev' | 'production';
    repositoryName: string;
    imageTag: string;
}

export class LambdaSpeedCheckerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const deploymentPrefix = props.environment === 'dev' ? 'stage' : 'production';

        const repo = cdk.aws_ecr.Repository.fromRepositoryAttributes(this, 'Repo', {
            repositoryName: props.repositoryName,
            repositoryArn: `arn:aws:ecr:${props.regionName}:${this.account}:repository/${props.repositoryName}`,
        });

        const lambdaFunctionRole = new cdk.aws_iam.Role(this, `webeye.role.stage.speed-checker.${this.region}`, {
            roleName: `webeye.role.stage.speed-checker.${this.region}`,
            assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
        });

        lambdaFunctionRole.addManagedPolicy(
            cdk.aws_iam.ManagedPolicy.fromManagedPolicyName(this, 'DynamoDB Policy for lambda', `webeye.policy.dynamodb.${deploymentPrefix}.all_tables`)
        );

        lambdaFunctionRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

        lambdaFunctionRole.addManagedPolicy(
            cdk.aws_iam.ManagedPolicy.fromManagedPolicyName(this, 'S3 Policy for lambda', `webeye.policy.s3.${deploymentPrefix}.allow_checker_buckets`)
        );

        const lambdaFunction = new cdk.aws_lambda.DockerImageFunction(this, `${deploymentPrefix}_webeye-speed-checker-${this.region}`, {
            functionName: `${deploymentPrefix}_webeye-speed-checker-${this.region}`,
            code: cdk.aws_lambda.DockerImageCode.fromEcr(repo, {
                tagOrDigest: `${deploymentPrefix}.${props.imageTag}`,
            }),
            environment: {
                ENVIRONMENT: 'dev',
                PLAYWRIGHT_BROWSERS_PATH: '/ms-playwright',
                HOME: '/tmp',
                EVENT_BASE_RETENTION_DAYS: '1',
            },
            timeout: cdk.Duration.seconds(150),
            memorySize: 764,
            role: lambdaFunctionRole,
        });
    }
}
