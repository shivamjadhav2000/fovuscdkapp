import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { nanoid } from 'nanoid';

const region = process.env.AWS_REGION; // The Lambda runtime sets this automatically
const tableName = process.env.TABLE_NAME || '';
const dynamodbClient = new DynamoDBClient({ region });

export const handler = async (event: any) => {
  const { text, filePath } = event.queryStringParameters;

  // Generate unique ID using nanoid
  const id = nanoid();

  // Create DynamoDB item
  const params = {
    TableName: tableName,
    Item: {
      id: { S: id },
      text: { S: text },
      filePath: { S: filePath }
    }
  };

  try {
    // Put item into DynamoDB
    const data = await dynamodbClient.send(new PutItemCommand(params));
    console.log("Item inserted:", data);

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*', // Adjust CORS headers as needed
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: "Item inserted successfully", id: id })
    };
  } catch (err) {
    console.error("Error inserting item:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error inserting item" })
    };
  }
};
