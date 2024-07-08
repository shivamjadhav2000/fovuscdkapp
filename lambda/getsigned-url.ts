import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const region = process.env.AWS_REGION; // The Lambda runtime sets this automatically
const bucketName = process.env.BUCKET_NAME || '';

const s3Client = new S3Client({ region });


export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === 'GET') {
    const filename = event.queryStringParameters?.filename || '';

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      ContentType: 'text/plain',
    });

    try {
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ url: signedUrl, filePath: `${bucketName}/${filename}` }),
      };
    } catch (err) {
      console.error('Error generating pre-signed URL:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to generate pre-signed URL' }),
      };
    }
  } else {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }
};
