const express = require('express');
const fileUpload = require('express-fileupload');
const pdfParse = require('pdf-parse');
const mongoose = require('mongoose');

const app = express();
app.use("/", express.static("public"));
app.use(fileUpload());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/pdfTextDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));

const pdfTextSchema = new mongoose.Schema({
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const PdfText = mongoose.model('PdfText', pdfTextSchema);

function compareStrings(str1, str2) {
  const shorterString = str1.length < str2.length ? str1 : str2;
  const longerString = str1.length >= str2.length ? str1 : str2;

  let matches = 0;
  for (let i = 0; i < shorterString.length; i++) {
    if (shorterString[i] === longerString[i]) {
      matches++;
    }
  }

  return (matches / shorterString.length) * 100;
}

app.post('/extract-text', (req, res) => {
  if (!req.files || !req.files.pdfFile) {
    return res.status(400).send('No file uploaded!');
  }

  pdfParse(req.files.pdfFile)
    .then(result => {
      const newText = result.text; 
      const newPdfText = new PdfText({ text: newText });

      return newPdfText.save()
        .then(() => PdfText.find()) // Fetch all after saving new one
        .then(storedTexts => {
          const similarityResults = storedTexts.map(storedText => ({
            storedText: storedText.text,
            similarityPercentage: compareStrings(newText, storedText.text).toFixed(2) + '%'
          }));
          res.send({ similarityResults }); 
        });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Error processing the PDF');
    });
});

app.listen(3300, () => console.log('Server on port 3300'));