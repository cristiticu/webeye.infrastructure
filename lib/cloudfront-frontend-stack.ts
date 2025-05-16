import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface StackProps extends cdk.StackProps {
    regionName: string;
    environment: 'dev' | 'production';
    harCertificate: string;
}

export class CloudfrontFrontendStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const deploymentPrefix = props.environment === 'dev' ? 'stage' : 'production';

        const bucketsCors = {
            allowedMethods: [cdk.aws_s3.HttpMethods.GET, cdk.aws_s3.HttpMethods.HEAD, cdk.aws_s3.HttpMethods.POST, cdk.aws_s3.HttpMethods.PUT],
            allowedOrigins: ['*'],
            allowedHeaders: ['*'],
            maxAge: 60 * 30,
        };

        const harViewerBucket = new cdk.aws_s3.Bucket(this, `${deploymentPrefix}.webeye.bucket.har-viewer`, {
            bucketName: `${deploymentPrefix}.webeye.bucket.har-viewer`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
            accessControl: cdk.aws_s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
            cors: [bucketsCors],
        });

        const frontendBucket = new cdk.aws_s3.Bucket(this, `${deploymentPrefix}.webeye.bucket.frontend`, {
            bucketName: `${deploymentPrefix}.webeye.bucket.frontend`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
            accessControl: cdk.aws_s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
            cors: [bucketsCors],
        });

        const harViewerOac = new cdk.aws_cloudfront.S3OriginAccessControl(this, 'harViewerOac', {
            originAccessControlName: `${deploymentPrefix}.webeye.oac.har-viewer`,
        });

        const certificate = cdk.aws_certificatemanager.Certificate.fromCertificateArn(
            this,
            'WebeyeCert',
            `arn:aws:acm:us-east-1:${this.account}:certificate/${props.harCertificate}`
        );

        const harViewerCloudfront = new cdk.aws_cloudfront.Distribution(this, 'harViewerCloudfront', {
            defaultBehavior: {
                origin: cdk.aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(harViewerBucket, {
                    originAccessControl: harViewerOac,
                }),
                viewerProtocolPolicy: cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            domainNames: ['har.webeye.cristit.icu'],
            certificate,
            priceClass: cdk.aws_cloudfront.PriceClass.PRICE_CLASS_100,
        });

        harViewerBucket.addToResourcePolicy(
            new cdk.aws_iam.PolicyStatement({
                sid: 'AllowCloudFrontAccessOAC',
                effect: cdk.aws_iam.Effect.ALLOW,
                principals: [new cdk.aws_iam.ServicePrincipal('cloudfront.amazonaws.com')],
                actions: ['s3:GetObject'],
                resources: [`${harViewerBucket.bucketArn}/*`],
                conditions: {
                    StringEquals: {
                        'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${harViewerCloudfront.distributionId}`,
                    },
                },
            })
        );
    }
}
