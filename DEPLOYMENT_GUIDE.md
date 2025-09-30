# AWS App Runner Deployment Guide for Employee Catalog PWA

This guide provides a comprehensive walkthrough for deploying the Employee Catalog PWA to AWS App Runner. It covers the initial one-time setup for required AWS permissions and the repeatable steps for deploying and updating the application.

## Table of Contents

1.  [Prerequisites](#1-prerequisites)
2.  [First-Time Deployment Setup (IAM Roles)](#2-first-time-deployment-setup-iam-roles)
3.  [Local Project Preparation](#3-local-project-preparation)
4.  [Build and Push Docker Image to ECR](#4-build-and-push-docker-image-to-ecr)
5.  [Deploying the Service to AWS App Runner](#5-deploying-the-service-to-aws-app-runner)
6.  [Updating the Application](#6-updating-the-application)

-----

### 1\. Prerequisites

Before you begin, ensure you have the following installed and configured:

  * **AWS Account**: An active AWS account with administrative privileges.
  * **AWS CLI**: The AWS Command Line Interface, configured with your credentials (`aws configure`).
  * **Docker Desktop**: Installed and running on your local machine.
  * **Git**: For version control.
  * **A DynamoDB Table**: A table created in DynamoDB with `id` (String) as the partition key.

-----

### 2\. First-Time Deployment Setup (IAM Roles)

These steps only need to be performed once per AWS account. You will create two essential IAM (Identity and Access Management) roles that allow App Runner to securely access other AWS services on your behalf.

#### Step 2.1: Create the DynamoDB Access Policy

First, create a fine-grained policy that grants only the necessary permissions to interact with your `employees` DynamoDB table. This follows the principle of least privilege.

1.  Navigate to the **IAM** service in the AWS Console.

2.  Go to **Policies** in the left-hand menu and click **Create policy**.

3.  Switch to the **JSON** tab and paste the following policy. **Remember to replace `YOUR_AWS_REGION`, `YOUR_ACCOUNT_ID`, and `employees` with your specific values.**

    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "dynamodb:Scan",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:GetItem"
                ],
                "Resource": "arn:aws:dynamodb:YOUR_AWS_REGION:YOUR_ACCOUNT_ID:table/employees"
            }
        ]
    }
    ```

4.  Click **Next: Tags**, then **Next: Review**.

5.  Give the policy a name, like `AppRunnerDynamoDBEmployeeTableAccess`, and a description.

6.  Click **Create policy**.

#### Step 2.2: Create the App Runner Instance Role

This role is assumed by your running application container, giving it the permissions defined in the policy you just created.

1.  In the IAM console, go to **Roles** and click **Create role**.

2.  For **Trusted entity type**, select **Custom trust policy**.

3.  Paste the following JSON into the trust policy editor. This allows the App Runner service to assume this role.

    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "tasks.apprunner.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }
    ```

4.  Click **Next**.

5.  On the **Add permissions** page, search for and select the `AppRunnerDynamoDBEmployeeTableAccess` policy you created in the previous step.

6.  Click **Next**.

7.  Give the role a name, such as `AppRunnerServiceRoleForDynamoDB`, and a description.

8.  Click **Create role**.

You now have the necessary permissions in place for a secure deployment.

#### Step 2.3: Create the App Runner Access Role (for ECR Access)

This role is used by the App Runner service to pull your container image from ECR. Note: Often, the App Runner console can create a default role for you, but creating your own provides more control.

1. In the IAM console, go to **Roles** and click **Create role**.

2. For **Trusted entity type**, select **Custom trust policy** and paste the following:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

3. Click **Next**.

4. On the **Add permissions** page, search for and attach the AWS managed policy named `AWSAppRunnerServicePolicyForECRAccess`. This policy contains the exact permissions you listed (`ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, etc.).

5. Click **Next**.

6. Give the role a name, such as `AppRunnerECRAccessRole`.

7. Click **Create role**. You will use this role in the "Access role" field during App Runner setup.

-----

### 3\. Local Project Preparation

Before you can deploy, you need to containerize the application using Docker.

#### Step 3.1: Create a `Dockerfile`

Create a file named `Dockerfile` (no extension) in the root of your project directory. This file contains the instructions to build your application into a Docker image.

```dockerfile
# Use an official Node.js runtime as a parent image
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application's code
COPY . .

# Your app runs on a port defined by an environment variable. 
# App Runner will set this variable. We expose it here.
EXPOSE 8080

# Define the command to run your app
CMD ["node", "server.js"]
```

#### Step 3.2: Create a `.dockerignore` file

Create a file named `.dockerignore` in your project root. This prevents unnecessary files from being copied into your Docker image, keeping it small and secure.

```
node_modules
npm-debug.log
.env
.gitignore
Dockerfile
.dockerignore
```

-----

### 4\. Build and Push Docker Image to ECR

Amazon Elastic Container Registry (ECR) is where you will store your Docker images.

1.  **Create an ECR Repository**:
    Run the following command in your terminal, replacing `employee-pwa` with your desired repository name and `us-east-1` with your AWS region.

    ```bash
    aws ecr create-repository --repository-name employee-pwa --region us-east-1
    ```

2.  **Authenticate Docker with ECR**:
    This command gets a temporary login token and logs your Docker client into your private ECR registry. *(Replace `YOUR_ACCOUNT_ID` and `us-east-1` with your specific values)*.

    ```bash
    aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
    ```

3.  **Build the Docker Image**:
    From your project's root directory, build the image.

    ```bash
    docker build -t employee-pwa .
    ```

4.  **Tag the Image for ECR**:
    Tag your newly built image with the ECR repository URI. *(Replace `YOUR_ACCOUNT_ID` and `us-east-1`)*.

    ```bash
    docker tag employee-pwa:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/employee-pwa:latest
    ```

5.  **Push the Image to ECR**:
    Finally, push the tagged image to your repository. *(Replace `YOUR_ACCOUNT_ID` and `us-east-1`)*.

    ```bash
    docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/employee-pwa:latest
    ```

-----

### 5\. Deploying the Service to AWS App Runner

1.  Navigate to the **AWS App Runner** service in the AWS Console.

2.  Click **Create an App Runner service**.

      * **Source and deployment**

          * **Source**: Choose `Container registry`.
          * **Container image URI**: Click **Browse** and select your `employee-pwa` repository and the `latest` tag.
          * **Deployment settings**: Choose `Automatic`. This enables CI/CD; App Runner will automatically redeploy when you push a new image to ECR.

      * **Configure service**

          * **Service name**: Enter a name, e.g., `employee-catalog-service`.
          * **Environment variables**: App Runner automatically injects a `PORT` variable. You only need to add your application-specific variables.
              * Key: `DYNAMODB_TABLE_NAME`
              * Value: `employees`

      * **Security**

          * **Instance role**: This is the key step for permissions. Click the dropdown and select the `AppRunnerServiceRoleForDynamoDB` role you created earlier.

      * **Networking, Observability**: You can leave these with their default settings for now.

3.  Click **Next**, review all your settings, and click **Create & deploy**.

The deployment will take a few minutes. You can monitor the progress in the service logs. Once complete, App Runner will provide a **Default domain** URL where you can access your live application.

-----

### 6\. Updating the Application

Because you selected automatic deployments, updating is incredibly simple:

1.  Make your code changes locally.
2.  Build a new Docker image: `docker build -t employee-pwa .`
3.  Tag the new image with the same ECR URI: `docker tag employee-pwa:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/employee-pwa:latest`
4.  Push the new image to ECR: `docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/employee-pwa:latest`

App Runner will detect the new image digest in your ECR repository and automatically trigger a new deployment with zero downtime.