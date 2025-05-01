import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface StackProps extends cdk.StackProps {
    regionName: string;
    environment: 'dev' | 'production';
    function: cdk.aws_lambda.DockerImageFunction;
}

export class EventBridgeMinuteSchedulerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const deploymentPrefix = props.environment === 'dev' ? 'stage' : 'production';

        const scheduler = new cdk.aws_events.Rule(this, 'Webeye-EventBridge-Minute-Scheduler-eu-central-1', {
            ruleName: 'Webeye-EventBridge-Minute-Scheduler-eu-central-1',
            schedule: cdk.aws_events.Schedule.rate(cdk.Duration.minutes(1)),
        });

        scheduler.addTarget(new cdk.aws_events_targets.LambdaFunction(props.function));
    }
}
