import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface StackProps extends cdk.StackProps {
    regionName: string;
    environment: 'dev' | 'production';
    repositoryName: string;
    imageTag: string;
}

export class LambdaCheckerManagerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const deploymentPrefix = props.environment === 'dev' ? 'stage' : 'production';

        const repo = cdk.aws_ecr.Repository.fromRepositoryAttributes(this, 'Repo', {
            repositoryName: props.repositoryName,
            repositoryArn: `arn:aws:ecr:${props.regionName}:${this.account}:repository/${props.repositoryName}`,
        });

        const lambdaFunctionRole = new cdk.aws_iam.Role(this, `webeye.role.stage.checker-manager.${this.region}`, {
            roleName: `webeye.role.stage.checker-manager.${this.region}`,
            assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
        });

        lambdaFunctionRole.addManagedPolicy(
            cdk.aws_iam.ManagedPolicy.fromManagedPolicyName(this, 'Allow invoking of checkers', 'webeye.policy.lambda.stage.all_checkers')
        );

        lambdaFunctionRole.addManagedPolicy(
            cdk.aws_iam.ManagedPolicy.fromManagedPolicyName(this, 'DynamoDB Policy for lambda', 'webeye.policy.dynamodb.stage.all_tables')
        );

        lambdaFunctionRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

        const lambdaFunction = new cdk.aws_lambda.DockerImageFunction(this, `${deploymentPrefix}_webeye-checker-manager-${this.region}`, {
            functionName: `${deploymentPrefix}_webeye-checker-manager-${this.region}`,
            code: cdk.aws_lambda.DockerImageCode.fromEcr(repo, {
                tagOrDigest: `${deploymentPrefix}.${props.imageTag}`,
            }),
            environment: {
                ENVIRONMENT: 'dev',
            },
            role: lambdaFunctionRole,
            timeout: cdk.Duration.seconds(20),
        });
    }
}
