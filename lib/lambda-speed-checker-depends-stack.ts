import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface StackProps extends cdk.StackProps {
    regionName: string;
    environment: 'dev' | 'production';
}

export class LambdaSpeedCheckerDependsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const deploymentPrefix = props.environment === 'dev' ? 'stage' : 'production';

        const bucketsCors = {
            allowedMethods: [cdk.aws_s3.HttpMethods.GET, cdk.aws_s3.HttpMethods.HEAD, cdk.aws_s3.HttpMethods.POST, cdk.aws_s3.HttpMethods.PUT],
            allowedOrigins: ['*'],
            allowedHeaders: ['*'],
            maxAge: 60 * 30,
        };

        const screenshotsBucket = new cdk.aws_s3.Bucket(this, `${deploymentPrefix}.webeye.bucket.screenshot`, {
            bucketName: `${deploymentPrefix}.webeye.bucket.screenshot`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
            accessControl: cdk.aws_s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
            cors: [bucketsCors],
        });

        const harFilesBucket = new cdk.aws_s3.Bucket(this, `${deploymentPrefix}.webeye.bucket.har`, {
            bucketName: `${deploymentPrefix}.webeye.bucket.har`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
            accessControl: cdk.aws_s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
            cors: [bucketsCors],
        });

        const screenshotsOac = new cdk.aws_cloudfront.S3OriginAccessControl(this, 'screenshotsOac', {
            originAccessControlName: `${deploymentPrefix}.webeye.oac.screenshots`,
        });

        const screenshotsCloudfront = new cdk.aws_cloudfront.Distribution(this, 'screenshotsCloudfront', {
            defaultBehavior: {
                origin: cdk.aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(screenshotsBucket, {
                    originAccessControl: screenshotsOac,
                }),
                viewerProtocolPolicy: cdk.aws_cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
            },
        });

        screenshotsBucket.addToResourcePolicy(
            new cdk.aws_iam.PolicyStatement({
                sid: 'AllowCloudFrontAccessOAC',
                effect: cdk.aws_iam.Effect.ALLOW,
                principals: [new cdk.aws_iam.ServicePrincipal('cloudfront.amazonaws.com')],
                actions: ['s3:GetObject', 's3:PutObject'],
                resources: [`${screenshotsBucket.bucketArn}/*`],
                conditions: {
                    StringEquals: {
                        'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${screenshotsCloudfront.distributionId}`,
                    },
                },
            })
        );

        const harFilesOac = new cdk.aws_cloudfront.S3OriginAccessControl(this, 'harFilesOac', {
            originAccessControlName: `${deploymentPrefix}.webeye.oac.har`,
        });

        const harFilesCloudfront = new cdk.aws_cloudfront.Distribution(this, 'harFilesCloudfront', {
            defaultBehavior: {
                origin: cdk.aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(harFilesBucket, {
                    originAccessControl: harFilesOac,
                }),
                viewerProtocolPolicy: cdk.aws_cloudfront.ViewerProtocolPolicy.ALLOW_ALL,
            },
        });

        harFilesBucket.addToResourcePolicy(
            new cdk.aws_iam.PolicyStatement({
                sid: 'AllowCloudFrontAccessOAC',
                effect: cdk.aws_iam.Effect.ALLOW,
                principals: [new cdk.aws_iam.ServicePrincipal('cloudfront.amazonaws.com')],
                actions: ['s3:GetObject', 's3:PutObject'],
                resources: [`${harFilesBucket.bucketArn}/*`],
                conditions: {
                    StringEquals: {
                        'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${harFilesCloudfront.distributionId}`,
                    },
                },
            })
        );
    }
}
