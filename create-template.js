const XLSX = require('xlsx');

// Create sample quiz data
const quizData = [
    {
        Question: "What is the capital of France?",
        Option1: "London",
        Option2: "Berlin",
        Option3: "Paris",
        Option4: "Madrid",
        CorrectAnswer: 3,
        Points: 10,
        TimeLimit: 30
    },
    {
        Question: "Which planet is known as the Red Planet?",
        Option1: "Venus",
        Option2: "Mars",
        Option3: "Jupiter",
        Option4: "Saturn",
        CorrectAnswer: 2,
        Points: 10,
        TimeLimit: 30
    },
    {
        Question: "What is 2 + 2?",
        Option1: "3",
        Option2: "4",
        Option3: "5",
        Option4: "6",
        CorrectAnswer: 2,
        Points: 5,
        TimeLimit: 20
    },
    {
        Question: "Who painted the Mona Lisa?",
        Option1: "Vincent van Gogh",
        Option2: "Pablo Picasso",
        Option3: "Leonardo da Vinci",
        Option4: "Michelangelo",
        CorrectAnswer: 3,
        Points: 15,
        TimeLimit: 40
    },
    {
        Question: "What is the largest ocean on Earth?",
        Option1: "Atlantic Ocean",
        Option2: "Indian Ocean",
        Option3: "Arctic Ocean",
        Option4: "Pacific Ocean",
        CorrectAnswer: 4,
        Points: 10,
        TimeLimit: 30
    },
    {
        Question: "In which year did World War II end?",
        Option1: "1943",
        Option2: "1944",
        Option3: "1945",
        Option4: "1946",
        CorrectAnswer: 3,
        Points: 12,
        TimeLimit: 35
    },
    {
        Question: "What is the chemical symbol for gold?",
        Option1: "Go",
        Option2: "Au",
        Option3: "Gd",
        Option4: "Ag",
        CorrectAnswer: 2,
        Points: 10,
        TimeLimit: 25
    },
    {
        Question: "Which programming language is known as the 'language of the web'?",
        Option1: "Python",
        Option2: "Java",
        Option3: "JavaScript",
        Option4: "C++",
        CorrectAnswer: 3,
        Points: 8,
        TimeLimit: 30
    },
    {
        Question: "What is the square root of 144?",
        Option1: "10",
        Option2: "11",
        Option3: "12",
        Option4: "13",
        CorrectAnswer: 3,
        Points: 5,
        TimeLimit: 20
    },
    {
        Question: "Which country is home to the kangaroo?",
        Option1: "New Zealand",
        Option2: "Australia",
        Option3: "South Africa",
        Option4: "Brazil",
        CorrectAnswer: 2,
        Points: 10,
        TimeLimit: 25
    }
];

// Create a new workbook
const wb = XLSX.utils.book_new();

// Convert data to worksheet
const ws = XLSX.utils.json_to_sheet(quizData);

// Set column widths for better readability
ws['!cols'] = [
    { wch: 50 },  // Question
    { wch: 20 },  // Option1
    { wch: 20 },  // Option2
    { wch: 20 },  // Option3
    { wch: 20 },  // Option4
    { wch: 15 },  // CorrectAnswer
    { wch: 10 },  // Points
    { wch: 12 }   // TimeLimit
];

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, "Quiz Questions");

// Write to file
XLSX.writeFile(wb, './Frontend/public/quiz-template.xlsx');

console.log('✅ Excel template created successfully: Frontend/public/quiz-template.xlsx');
console.log('📊 Template contains 10 sample questions');
