/*

OMR Card

*/
function initiateTest(testName) { // Accept String of "name"
  var currentOMR = SpreadsheetApp.openById(getDB()).getSheets()[0];
  return currentOMR.getLastColumn() < 4 ? [] : currentOMR.getRange(1, 5, 2, currentOMR.getLastColumn() - 4).getValues(); // Get answers and question no from the current OMR
}

function setAnswers(answerMETA, testName) {
  var currentDB = SpreadsheetApp.openById(getDB());
  var currentOMR = currentDB.getSheets()[0];

  var questionNo = answerMETA[0];
  var answers = answerMETA[1];
  var scores = answerMETA[2];

  var requiredColumns = 4 + answers.length; // Starting from column E (4th index)
  var currentColumns = currentOMR.getMaxColumns();

  // Adjust columns if necessary
  if (currentColumns < requiredColumns) {
    currentOMR.insertColumnsAfter(currentColumns, requiredColumns - currentColumns);
  } else if (currentColumns > requiredColumns) {
    currentOMR.deleteColumns(requiredColumns + 1, currentColumns - requiredColumns);
  }

  // Clear all data except the first 3 rows (headers)
  var lastRow = currentOMR.getLastRow();
  if (lastRow > 3) {
    currentOMR.getRange(4, 1, lastRow - 3, requiredColumns).clear();
  }

  // Set new header data
  currentOMR.getRange(1, 5, 3, answers.length).setValues([questionNo, answers, scores]);

  // Apply conditional formatting
  var conditionalRange = currentOMR.getRange(4, 5, 1, answers.length);
  var rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=INDIRECT("R" & ROW() & "C" & COLUMN(), FALSE) = INDIRECT("R2C" & COLUMN(), FALSE)')
    .setBackground("#4a86e8")
    .setRanges([conditionalRange])
    .build();
  currentOMR.setConditionalFormatRules([rule]);
}

function checkAnswers(answersO) { // Accept Array of [[questionNo, mode, selectedAnswer, score, correct]]
  var sheet = SpreadsheetApp.openById(getDB()).getSheets()[0];
  var correctAnswers = sheet.getRange(2, 4, 1, sheet.getLastColumn() - 3).getValues()[0];

  answersO.forEach((answerMETA, index) => {
    answerMETA[4] = (answerMETA[2] === correctAnswers[index]);
  });

  return answersO; // If you need to return the modified array
}



// Comm

function getDB() {
  var currentSlide = DriveApp.getFileById(SlidesApp.getActivePresentation().getId());
  var parentFolder = currentSlide.getParents().next();

  if (parentFolder) {
    var files = parentFolder.getFilesByType(MimeType.GOOGLE_SHEETS);
    return files.hasNext() ? files.next().getId() : createDB(parentFolder);
  }
}