# Lovus Project Readme Documentation
## Dependencies

  for this project i have used the following aws services:-
  ```
  1. Iam
  2. S3 buckets
  3. DynamoDB
  4. DynamoDB Streams 
  5. Lambda
  6. Cloud Watch
  7. Ec2
  ```
## PreRequisites
aws-cdk installed version latest
node js installed version latest
aws-sdk installed 
docker installed

make sure docker is running when you are working with cdk app

## How To Get Started With This Project

  ### cdk 
  step 1: cd cdkapp
  step 2: npm install
  step 3: cdk diff
  step 4: cdk deploy
  step 5: copy api url 
  step 6: create .env file in ~frontned/ [use reference .env.bak]
  step 7: paste inside the .env file for variable REACT_APP_API_URL

  ### Front End
  Dependencies:-
  i.  nodejs
  ii. npm
  Run  :- ```npm install```
  build: ```npm run buid```
  start server:- npm start

  Must use Backend APi URL:-  'you backend api endpoint'
  you can generate you backend url once you run cdk deploy

## Backend 
```I have used aws sevices which are scallable and efficient and solve uses serverles machanisi```
### Dependencies:-
  1. aws sdk v3
  2. nano id
  3. boto3
### folder structure
## Lambdas

1. getsigned-url
    
    this script consists of getting the signed url using s3 client which lets frontend to send/upload file to the server automatically

2. dataentry

    this script consist of a module dependency nanoid you must upload the zip to the lambda service when asked for upload file in create lambda service. this script is responsible for creating an record in the dynamodb with 
    
    ``` {_id:nanoid,text:input_text,filePath:filePath}
     
    ```

3. dynamoDbTrigger
    
    this script is resonsible for trigger which happens which the record is inserted which then creats an vm in ec2 and privide the startup script to it which handles the post logic after insertion of the record 
      which is :-

      1.create vm in ec2

      2.add user data  defined in code

4. vmscript

      this sript is resonsible for running the business logic post creating vm
      
      1.which is reading the record with id from dynamodb 

      2.reading the file from s3

      3.creating new file in /tmp/output.txt and append input_text 

      3.creating new file in s3 with name outputFile.txt

      4.updating record in dynamodb

      5.terminating the instance in ec2

## security groups and roles

### MyEC2Role	
    AWS Service: ec2
    this role must have access to :-
    ```
    permissions:-

    s3 read write
    dynamoDB read and write
    ec2 terminate instance
    ```


