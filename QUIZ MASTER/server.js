const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require("body-parser");
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const app = express();
const port = 3000;
const uri = 'mongodb+srv://kavyajain1916:K12345678@cluster0.vmxlebi.mongodb.net';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cookieParser());
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(session({
    secret: 'your-secret-key', // replace with your own secret
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 60 * 1000 } // 30 minutes
}));
let  questions;
function authenticateToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/login');
    }

    jwt.verify(token, 'your-secret-key', (err, user) => {
        if (err) {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
            return;
        }
        req.user = user;
        next();
    });
}
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(username);

    try {
        await client.connect();
        const database = client.db('QUIZ');
        const collection = database.collection('users');

        const user = await collection.findOne({ username });
        if (user && await bcrypt.compare(password, user.passwordHash)) {
            const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });
            res.cookie('token', token, { httpOnly: true });
            res.status(200).sendFile(path.join(__dirname, 'public', 'temp.html'));
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/responses', authenticateToken, async (req, res) => {
    const receivedResponses = req.body;

    try {
        await client.connect();
        const database = client.db('QUIZ');
        const responsesCollection = database.collection('responses');
        const questionsCollection = database.collection('questions');

        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, 'your-secret-key');
        const username = decoded.username;

        // Fetch all questions to get correct answers
        const questions = await questionsCollection.find({}).toArray();

        let score = 0;
        const totalQuestions = questions.length;
        const positiveMarking = 1; // Points for a correct answer
        const negativeMarking = 0.25; // Points deducted for an incorrect answer

        questions.forEach((question, index) => {
            const correctAnswers = question.answer.sort();
            const userAnswers = receivedResponses[index]?.sort() || [];

            if (JSON.stringify(correctAnswers) === JSON.stringify(userAnswers)) {
                score += positiveMarking;
            } else if (userAnswers.length > 0) {
                score -= negativeMarking;
            }
        });

        await responsesCollection.insertOne({ 
            username,
            responses: receivedResponses, 
            score, 
            timestamp: new Date() 
        });

        res.status(200).json({ message: 'Responses received successfully', score });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to save responses' });
    }
});


app.get('/questions', authenticateToken, async (req, res) => {
    try {
        await client.connect();
        const database = client.db('QUIZ');
        const collection = database.collection('questions');

        questions = await collection.find({}, { projection: { ID: 1, question: 1, options: 1 } }).toArray();
        res.json({ questions });

        const quizEndTime = new Date(Date.now() + 30 * 60 * 1000); // Set quiz end time to 30 minutes from now
        req.session.quizEndTime = quizEndTime;
        console.log(req.session);
        console.log('Quiz end time set:', quizEndTime);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/timer',  authenticateToken,(req, res) => {
    console.log(req.session)
    if (!req.session.cookie.expires) {
        return res.status(400).json({ message: 'Quiz end time not set' });
    }

    const remainingTime = Math.floor((req.session.cookie.expires - Date.now()) / 1000);
    res.json({ remainingTime });
});

app.post('/auto-submit', async (req, res) => {
    const receivedResponses = req.body;

    try {
        await client.connect();
        const database = client.db('QUIZ');
        const collection = database.collection('responses');

        if (Date.now() > req.session.quizEndTime) {
            await collection.insertOne({ responses: receivedResponses, timestamp: new Date(), autoSubmitted: true });
            res.status(200).json({ message: 'Quiz auto-submitted successfully' });
        } else {
            res.status(400).json({ message: 'Quiz end time has not been reached yet' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to auto-submit quiz' });
    }
});

app.get('/check-quiz-attempt', authenticateToken,async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, 'your-secret-key');
        const username = decoded.username;

        await client.connect();
        const database = client.db('QUIZ');
        const collection = database.collection('responses');

        const userQuizData = await collection.findOne({ 'username': username });

        if (userQuizData) {
            res.json({ quizAttempted: true });
        } else {
            res.json({ quizAttempted: false });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/start', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;

        await client.connect();
        const database = client.db('QUIZ');
        const responsesCollection = database.collection('responses');

        // Check if there is an active session for the user
        if (req.session && req.session.user) {
            // If there is an active session, retrieve the user's progress
            const userResponse = await responsesCollection.findOne({ username });

            if (userResponse) {
                // If user is found, execute view result functionality
                const questionsCollection = database.collection('questions');

                const questions = await questionsCollection.find({}).toArray();

                const results = questions.map((question, index) => {
                    const correctAnswers = question.answer.sort();
                    const userAnswers = userResponse.responses[index]?.sort() || [];
                    const isCorrect = JSON.stringify(correctAnswers) === JSON.stringify(userAnswers);

                    return {
                        question: question.question,
                        correctAnswers,
                        userAnswers,
                        isCorrect
                    };
                });

                // Send the user back to the quiz page with their progress intact
                return res.status(200).sendFile(path.join(__dirname, 'public', 'quiz.html'));
            }
        }

        // If user is not found or there is no active session, start a new quiz session
        await responsesCollection.insertOne({ 
            username, 
            responses: [], 
            score: 0, 
            timestamp: new Date() 
        });
        return res.sendFile(path.join(__dirname, 'public', 'quiz.html'));
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/view-result-data', authenticateToken, async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, 'your-secret-key');
        const username = decoded.username;

        await client.connect();
        const database = client.db('QUIZ');
        const responsesCollection = database.collection('responses');
        const questionsCollection = database.collection('questions');

        // Fetch the user's responses
        const userResponses = await responsesCollection.findOne({ username });

        if (!userResponses) {
            return res.status(404).json({ message: 'No responses found for this user' });
        }

        // Fetch all questions to get correct answers
        const questions = await questionsCollection.find({}).toArray();

        // Prepare data for graphical representation
        const results = questions.map((question, index) => {
            const correctAnswers = question.answer.sort();
            const userAnswers = userResponses.responses[index]?.sort() || [];
            const isCorrect = JSON.stringify(correctAnswers) === JSON.stringify(userAnswers);

            return {
                question: question.question,
                correctAnswers,
                userAnswers,
                isCorrect
            };
        });

        res.json({ results, score: userResponses.score });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}/`);
});
