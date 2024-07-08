import { EC2Client, RunInstancesCommand, RunInstancesCommandInput } from '@aws-sdk/client-ec2';
import { Context } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
const region = process.env.AWS_REGION; // The Lambda runtime sets this automatically

const ec2Client = new EC2Client({ region });

export const handler = async (event: any, context: Context) => {
  const bucketName = process.env.BUCKET_NAME || '';
  const tableName = process.env.TABLE_NAME;
  const EC2_ROLE_ARN = process.env.EC2_ROLE_ARN; // Retrieve the ARN of the EC2 role


  const record = event.Records[0];
  if (record.eventName !== 'INSERT') {
    return { statusCode: 200, body: 'Only INSERT events are processed.' };
  }

  const newImage = unmarshall(record.dynamodb.NewImage);
  const recordId = newImage.id
  console.log('New image data:', newImage)

  const userData = `#!/bin/bash
  # Install Python3 and pip (if not already installed)
  sudo yum update -y
  sudo yum install -y python3 pip
  sudo pip3 install --upgrade pip
  pip install boto3
  # Install ec2-metadata
  sudo yum install -y ec2-metadata
  # Download Python script from S3
  echo ${EC2_ROLE_ARN} > /tmp/role.txt
  aws s3 cp s3://${bucketName}/index.py /tmp/script.py
  # Get the instance ID using ec2-metadata
  INSTANCE_ID=\$(ec2-metadata -i | awk '{print $2}')
  # Associate the Elastic IP with the instance
  # Execute Python script with parameters
  python3 /tmp/script.py ${recordId} ${tableName} \${INSTANCE_ID}
  `;
  const instanceParams: RunInstancesCommandInput = {
    ImageId: 'ami-0900fe555666598a2', // Replace with your desired AMI ID
    InstanceType: 't2.micro', // Specify the instance type as a string
    MaxCount: 1,
    MinCount: 1,
    Monitoring: {
      Enabled: false
    },
    IamInstanceProfile: {
      Arn: EC2_ROLE_ARN,
    },
    UserData: Buffer.from(userData).toString('base64'),
  };

  try {
    const data = await ec2Client.send(new RunInstancesCommand(instanceParams));
    if (!data.Instances) {
      throw new Error('No instances created');
    }
    return { statusCode: 200, body: 'EC2 instance created successfully!' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Error creating EC2 instance' };
  }
};
