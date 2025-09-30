import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Adjust path to look for .env in the parent directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });


// AWS SDK v3 imports
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    UpdateCommand,
    DeleteCommand
} from "@aws-sdk/lib-dynamodb";

// --- Configuration from Environment Variables ---
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 8080;
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

// --- AWS Configuration ---
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

const app = express();

// Helper to get the current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../client')));

// --- Configuration Endpoint for the Client ---
app.get('/api/config', (req, res) => {
    res.json({
        apiUrl: `/api/employees` // Use a relative URL
    });
});

// --- API Endpoints ---
app.get('/api/employees', async (req, res) => {
    const command = new ScanCommand({ TableName: DYNAMODB_TABLE_NAME });
    try {
        const data = await docClient.send(command);
        res.json(data.Items);
    } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).send(error);
    }
});

// CREATE a new employee
app.post('/api/employees', async (req, res) => {
    const { name, position } = req.body;
    const newEmployee = {
        id: Date.now().toString(),
        name,
        position
    };
    const command = new PutCommand({
        TableName: DYNAMODB_TABLE_NAME,
        Item: newEmployee
    });
    try {
        await docClient.send(command);
        res.status(201).json(newEmployee);
    } catch (error) {
        console.error("Error creating employee:", error);
        res.status(500).send(error);
    }
});

// UPDATE an employee
app.put('/api/employees/:id', async (req, res) => {
    const { id } = req.params;
    const { name, position } = req.body;
    const command = new UpdateCommand({
        TableName: DYNAMODB_TABLE_NAME,
        Key: { id },
        UpdateExpression: 'set #n = :n, #p = :p',
        ExpressionAttributeNames: { '#n': 'name', '#p': 'position' },
        ExpressionAttributeValues: { ':n': name, ':p': position },
        ReturnValues: 'ALL_NEW'
    });
    try {
        const { Attributes } = await docClient.send(command);
        res.json(Attributes);
    } catch (error) {
        console.error("Error updating employee:", error);
        res.status(500).send(error);
    }
});

// DELETE an employee
app.delete('/api/employees/:id', async (req, res) => {
    const { id } = req.params;
    const command = new DeleteCommand({
        TableName: DYNAMODB_TABLE_NAME,
        Key: { id }
    });
    try {
        await docClient.send(command);
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting employee:", error);
        res.status(500).send(error);
    }
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
