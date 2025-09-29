import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

// AWS SDK v3 imports
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    ScanCommand, 
    PutCommand, 
    UpdateCommand, 
    DeleteCommand 
} from "@aws-sdk/lib-dynamodb";

// --- AWS Configuration ---
const client = new DynamoDBClient(); // e.g., 'us-west-2'
const docClient = DynamoDBDocumentClient.from(client);
const tableName = 'employees';

const app = express();
const PORT = 7070;
const HOST = '10.200.26.218';

app.use(cors());
app.use(bodyParser.json());

// --- API Endpoints ---

// GET all employees
app.get('/', async (req, res) => {
    try {
        res.sendFile('index.html', { root: '.' });
    } catch (error) {
        console.error("Error loading home page:", error);
        res.status(404).send(error);
    }
});

app.get('/api/employees', async (req, res) => {
    const command = new ScanCommand({ TableName: tableName });
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
        TableName: tableName,
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
        TableName: tableName,
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
        TableName: tableName,
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