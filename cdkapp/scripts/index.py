import json
import boto3
import os
import sys

# Initialize AWS clients
s3 = boto3.client('s3')

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb',region_name='us-east-2')
# Initialize Boto3 EC2 client
ec2 = boto3.client('ec2',region_name='us-east-2')

# Function to read data from DynamoDB
def read_record(table_name, record_id):    
    # Select the table
    table = dynamodb.Table(table_name)
    
    try:
        # Get the item based on the ID
        response = table.get_item(
            Key={
                'id': record_id
            }
        )
        # Check if the item exists
        if 'Item' in response:
            return response['Item']
        else:
            print("Item not found")
            return None
    except Exception as e:
        print("Error:", e)
        return None

# Function to read file contents from S3 and write to output file
def process_file(bucket_name, file_key,input_text):
    try:
        # Download the file from S3
        response = s3.get_object(Bucket=bucket_name, Key=file_key)
        file_contents = response['Body'].read().decode('utf-8')
        # Write file contents to output file
        with open('/tmp/output.file', 'w') as output_file:
            output_file.write(file_contents)
            output_file.write(str(len(file_contents)))
            output_file.write(' : '+input_text)

        return True
    except Exception as e:
        print("Error:", e)
        return False

# Function to upload file to S3
def upload_to_s3(bucket_name, file_key):
    try:
        # Upload the output file to S3
        s3.upload_file('/tmp/output.file', bucket_name, file_key)
        return f'{bucket_name}/{file_key}'
    except Exception as e:
        print("Error:", e)
        return False
# Function which insert output File record in the dynamodb

def update_to_dynamodb(record_id,output_file_path,table_name):    
    try:
        # Select the table
        table = dynamodb.Table(table_name)
        # Update the item in the DynamoDB table
        response = table.update_item(
            Key={
                'id': record_id
            },
            UpdateExpression='SET output_file_path = :val',
            ExpressionAttributeValues={
                ':val': output_file_path
            }
        )
        print("Record updated successfully.")
        return True
    except Exception as e:
        print("Error:", e)
        return False

def terminate_instance(instance_id):
    if not instance_id:
        print("Instance ID is required.")
        return False
    # Terminate the instance
    print("Terminating the instance with the ID:", instance_id)
    ec2.terminate_instances(InstanceIds=[instance_id])

    print("Instance terminated successfully.")   

def main(*args):
    record_id,table_name,instance_id = args
    try:
        print("Record ID:", record_id)
        # TODO implement
        dynamodb_data = read_record(table_name,record_id)
        print("dynamodb_data",dynamodb_data)
        
        # Extract filePath from DynamoDB data
        filePath  = dynamodb_data['filePath']
        inputText = dynamodb_data['text'] 
        bucket_name, filekey=filePath.split('/')
        # Process file
        process_file(bucket_name,filekey, inputText )

        # Upload output file to S3
        output_file_path = upload_to_s3(bucket_name,'outputFile.txt')
        
        # update the dynamodb record 
        update_to_dynamodb(record_id,output_file_path,table_name)
        # terminate instance
        terminate_instance(instance_id)
    except Exception as e:
        print("Error:", e)
        with open('/tmp/output.file', 'w') as output_file:
            output_file.write('Error:', e)
        return False
if __name__ == "__main__":
    main(*sys.argv[1:])