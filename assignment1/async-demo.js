const fs = require("fs");
const path = require("path");

// Write a sample file for demonstration
const dirFile = path.join(__dirname, "sample-files");
const testFile = path.join(dirFile, "sample.txt");
const fileContent = "Hello, async world!";
//check directory exists
if (!fs.existsSync(dirFile)) {
  fs.mkdirSync(dirFile);
}

// create file in directory
fs.writeFileSync(testFile, fileContent);

// 1. Callback style
fs.readFile(testFile, "utf-8", (err, data) => {
  console.log("Callback read:", data.toLowerCase());
});

// Callback hell example (test and leave it in comments):
// fs.readFile(testFile, "utf-8", (err, data) => {
//   fs.readFile(testFile, "utf-8", (err, data1) => {
//     fs.readFile(testFile, "utf-8", (err, data2) => {
//       console.log("Callback read:", data2.toLowerCase());
//     });
//   });
// });

// 2. Promise style
fs.promises
  .readFile(testFile, "utf-8")
  .then((data) => console.log("promise read:", data.toLowerCase()));

// 3. Async/Await style
async function readAsync(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, "utf-8");
    console.log("async await read:", data.toLowerCase());
  } catch (err) {}
}

readAsync(testFile);
