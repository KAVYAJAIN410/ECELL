const mongoose = require('mongoose');

// Define the Question model
const QuestionSchema = new mongoose.Schema({
  ID:{type: Number,required: true},
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  answer: [{ type: Number, required: true }] // Allow multiple correct answers
});

const Question = mongoose.model('QUESTIONS', QuestionSchema);

// Connect to MongoDB
mongoose.connect('mongodb+srv://kavyajain1916:K12345678@cluster0.vmxlebi.mongodb.net/QUIZ', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Define the questions
const questions = [
  { 
    ID : 1,
    question: "What is the main goal of an entrepreneur?",
    options: [
      "Maximize profit",
      "Minimize risk",
      "Maximize employee satisfaction",
      "Create social impact"
    ],
    answer: [0, 3] // Multiple correct answers
  },
  { 
    ID : 2,
    question: "Which of the following is a characteristic of successful entrepreneurs?",
    options: [
      "Risk aversion",
      "Strong leadership skills",
      "Dependency on others",
      "Lack of vision"
    ],
    answer: [1]
  },
  { 
    ID : 3,
    question: "Which of these funding options is typically considered first by new entrepreneurs?",
    options: [
      "Angel investors",
      "Bank loans",
      "Personal savings",
      "Venture capital"
    ],
    answer: [2]
  },
  { 
    ID : 4,
    question: "What does MVP stand for in the context of entrepreneurship?",
    options: [
      "Most Valuable Player",
      "Minimum Viable Product",
      "Maximum Value Proposition",
      "Market Value Position"
    ],
    answer: [1]
  },
  { 
    ID : 5,
    question: "Which of the following is a common exit strategy for entrepreneurs?",
    options: [
      "Merger and acquisition",
      "Increasing staff",
      "Entering a new market",
      "Launching a new product"
    ],
    answer: [0]
  },
  { 
    ID : 6,
    question: "What is a business plan?",
    options: [
      "A document outlining a business's goals and strategies",
      "A plan for a business vacation",
      "A strategy for increasing prices",
      "A report on employee performance"
    ],
    answer: [0]
  },
  { 
    ID : 7,
    question: "Which of the following are sources of startup funding?",
    options: [
      "Bootstrapping",
      "Crowdfunding",
      "Friends and family",
      "All of the above"
    ],
    answer: [3] // "All of the above" as the correct answer
  },
  { 
    ID : 8,
    question: "Which skills are crucial for an entrepreneur?",
    options: [
      "Communication",
      "Technical",
      "Financial management",
      "All of the above"
    ],
    answer: [3] // "All of the above" as the correct answer
  },
  { 
    ID : 9,
    question: "What is a pitch deck?",
    options: [
      "A sales document",
      "A presentation to potential investors",
      "A detailed financial report",
      "A company's annual report"
    ],
    answer: [1]
  },
  { 
    ID : 10,
    question: "What is the purpose of market research?",
    options: [
      "To understand customer needs and market conditions",
      "To increase production speed",
      "To reduce the number of employees",
      "To expand product lines"
    ],
    answer: [0]
  }
];

// Insert the questions into the database
const addQuestions = async () => {
  try {
    await Question.insertMany(questions);
    console.log('Questions added successfully');
  } catch (err) {
    console.log(err);
  } finally {
    mongoose.connection.close();
  }
};

addQuestions();
