import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface StackProps extends cdk.StackProps {
    regionName: string;
    environment: 'dev' | 'production';
    repositoryName: string;
    imageTag: string;
    backendCertificate: string;
}

export class LambdaBackendStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const deploymentPrefix = props.environment === 'dev' ? 'stage' : 'production';

        const repo = cdk.aws_ecr.Repository.fromRepositoryAttributes(this, 'Repo', {
            repositoryName: props.repositoryName,
            repositoryArn: `arn:aws:ecr:${props.regionName}:${this.account}:repository/${props.repositoryName}`,
        });

        const lambdaFunctionRole = new cdk.aws_iam.Role(this, `webeye.role.stage.backend.${this.region}`, {
            roleName: `webeye.role.stage.backend.${this.region}`,
            assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
        });

        lambdaFunctionRole.addManagedPolicy(
            cdk.aws_iam.ManagedPolicy.fromManagedPolicyName(this, 'DynamoDB Policy for lambda', `webeye.policy.dynamodb.${deploymentPrefix}.all_tables`)
        );

        lambdaFunctionRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

        const lambdaFunction = new cdk.aws_lambda.DockerImageFunction(this, `${deploymentPrefix}_webeye-backend-${this.region}`, {
            functionName: `${deploymentPrefix}_webeye-backend-${this.region}`,
            code: cdk.aws_lambda.DockerImageCode.fromEcr(repo, {
                tagOrDigest: `${deploymentPrefix}.${props.imageTag}`,
            }),
            environment: {
                ENVIRONMENT: 'dev',
            },
            role: lambdaFunctionRole,
            reservedConcurrentExecutions: 5,
            memorySize: 256,
            timeout: cdk.Duration.seconds(20),
        });

        const functionUrl = lambdaFunction.addFunctionUrl({
            authType: cdk.aws_lambda.FunctionUrlAuthType.NONE,
        });

        // const lambdaOac = new cdk.aws_cloudfront.FunctionUrlOriginAccessControl(this, 'lambdaFunctionOac', {
        //     originAccessControlName: `${deploymentPrefix}.webeye.oac.lambda-backend`,
        //     signing: cdk.aws_cloudfront.Signing.SIGV4_ALWAYS,
        // });

        // const backendCertificate = cdk.aws_certificatemanager.Certificate.fromCertificateArn(
        //     this,
        //     'WebeyeBackendCert',
        //     `arn:aws:acm:us-east-1:${this.account}:certificate/${props.backendCertificate}`
        // );

        // const lambdaResponseHeadersPolicy = new cdk.aws_cloudfront.ResponseHeadersPolicy(this, 'LambdaCORSResponsePolicy', {
        //     responseHeadersPolicyName: 'LambdaCORSPolicy',
        //     corsBehavior: {
        //         accessControlAllowCredentials: true,
        //         accessControlAllowOrigins: ['https://webeye.cristit.icu'],
        //         accessControlAllowMethods: ['GET', 'POST', 'OPTIONS', 'PATCH', 'DELETE'],
        //         accessControlAllowHeaders: ['Content-Type', 'Authorization'],
        //         accessControlExposeHeaders: ['Content-Length', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'],
        //         originOverride: false,
        //     },
        // });

        // const noCacheWithAuthHeaderPolicy = new cdk.aws_cloudfront.CachePolicy(this, 'NoCacheWithAuthHeader', {
        //     cachePolicyName: 'NoCacheWithAuthHeader',
        //     defaultTtl: cdk.Duration.seconds(60),
        //     maxTtl: cdk.Duration.seconds(60),
        //     minTtl: cdk.Duration.seconds(60),
        //     headerBehavior: cdk.aws_cloudfront.CacheHeaderBehavior.allowList('Authorization', 'Content-Type'),
        //     queryStringBehavior: cdk.aws_cloudfront.CacheQueryStringBehavior.all(),
        //     cookieBehavior: cdk.aws_cloudfront.CacheCookieBehavior.all(),
        // });

        // const lambdaCloudfront = new cdk.aws_cloudfront.Distribution(this, 'lambdaFunctionUrlCloudfront', {
        //     defaultBehavior: {
        //         origin: new cdk.aws_cloudfront_origins.FunctionUrlOrigin(functionUrl, {
        //             originAccessControlId: lambdaOac.originAccessControlId,
        //         }),

        //         allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_ALL,
        //         viewerProtocolPolicy: cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        //         originRequestPolicy: cdk.aws_cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        //         responseHeadersPolicy: lambdaResponseHeadersPolicy,
        //         cachePolicy: noCacheWithAuthHeaderPolicy,
        //     },

        //     domainNames: ['backend.webeye.cristit.icu'],
        //     certificate: backendCertificate,
        //     priceClass: cdk.aws_cloudfront.PriceClass.PRICE_CLASS_100,
        // });

        // lambdaFunction.addPermission('AllowCloudFrontServicePrincipal', {
        //     principal: new cdk.aws_iam.ServicePrincipal('cloudfront.amazonaws.com'),
        //     action: 'lambda:InvokeFunctionUrl',
        //     functionUrlAuthType: cdk.aws_lambda.FunctionUrlAuthType.AWS_IAM,
        //     sourceArn: `arn:aws:cloudfront::${this.account}:distribution/${lambdaCloudfront.distributionId}`,
        // });
    }
}
