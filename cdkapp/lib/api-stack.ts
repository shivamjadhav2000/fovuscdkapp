import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam'; // Import IAM module
import { Construct } from 'constructs';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    // S3 Bucket
    const bucket = new s3.Bucket(this, 'MyBucket', {
      removalPolicy: RemovalPolicy.DESTROY, // Remove this if you want to retain the bucket when the stack is deleted
      autoDeleteObjects: true, // Automatically delete objects when the bucket is deleted
      versioned: true, // Enable versioning
    });
    // Define the CORS configuration for the S3 bucket
    const allowedMethods: s3.HttpMethods[] = [
      s3.HttpMethods.GET,
      s3.HttpMethods.POST,
      s3.HttpMethods.PUT,
      s3.HttpMethods.HEAD
    ];
    const defaultFilePath = 'scripts';
    // Deploy the default file to the S3 bucket during creation
    new BucketDeployment(this, 'DeployDefaultFile', {
      sources: [Source.asset(defaultFilePath)],
      destinationBucket: bucket,
    });
    bucket.addCorsRule({
      allowedOrigins: ['http://localhost:3000'],
      allowedMethods: allowedMethods,
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
      exposedHeaders: [],
      maxAge: 3000,
    });

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'MyTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_IMAGE // Capture only new items
    });

    // Lambda Functions
    const getsignedLambda = new NodejsFunction(this, 'MyLambda', {
      entry: 'lambda/getsigned-url.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: table.tableName,
      },
    });

    const dataentry = new NodejsFunction(this, 'dataentry', {
      entry: 'lambda/dataentry.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    // Grant permissions
    bucket.grantReadWrite(getsignedLambda);
    table.grantReadWriteData(getsignedLambda);
    table.grantReadWriteData(dataentry);
    // Create an IAM role for the EC2 instance

    const ec2Role = new iam.Role(this, 'MyEC2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });
    ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
    ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'));

    // Add policy for EC2 termination
    ec2Role.addToPolicy(new iam.PolicyStatement({
      actions: ['ec2:TerminateInstances'],
      resources: ['*'],
    }));
    // Create instance profile and associate with IAM role
    const instanceProfile = new iam.CfnInstanceProfile(this, 'MyEC2InstanceProfile', {
      roles: [ec2Role.roleName],
    });
    // Define Lambda function
    const handler = new NodejsFunction(this, 'dynamodbTriggerLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler', // Adjust handler based on your file structure
      entry: 'lambda/dynamodbTrigger.ts',
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
        EC2_ROLE_ARN: instanceProfile.attrArn, // Pass the ARN of the EC2 role
      },
    });

    // Grant permissions to Lambda function to create EC2 instances and describe instances
    handler.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "ec2:RunInstances",
        "ec2:DescribeInstances", // Optional: If Lambda needs to describe instances
        "iam:PassRole" // Required to pass the role to the EC2 instance
      ],
      resources: ['*'], // Limit resource scope as per your security requirements
    }));

    // Create event source mapping to trigger Lambda on DynamoDB stream events
    handler.addEventSource(new lambdaEventSources.DynamoEventSource(table, {
      batchSize: 10,
      startingPosition: lambda.StartingPosition.LATEST,
      bisectBatchOnError: true,
      retryAttempts: 10 // Number of times to retry when the function returns an error
    }));

    table.grantReadWriteData(handler);
    bucket.grantReadWrite(handler);
    // API Gateway
    const api = new apigateway.RestApi(this, 'MyApi', {
      restApiName: 'MyService',
      description: 'This service serves my Lambda functions.',
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:3000'],
        allowMethods: ['GET', 'POST'],
        allowHeaders: ['Authorization', 'Content-Type', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
        statusCode: 200
      },
    });
    // Integrations
    const getIntegration = new apigateway.LambdaIntegration(getsignedLambda);
    api.root.addMethod('GET', getIntegration);

    const postIntegration = new apigateway.LambdaIntegration(dataentry);
    api.root.addMethod('POST', postIntegration);


  }
}
