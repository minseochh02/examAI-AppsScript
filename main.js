/* 
1. Initiate
show a modal saying:
"Your project has been initiated! Proceed with [2. Set Up ] to set answers for your exam"
if failure, alert user

2. Set Up
check if the file has a parent folder named "채점기"
if not: create a folder named "채점기" and share it with "minseochh02@gmail.com"
        copy a spreadsheet from template sheet ID
        create a slides named "Exam"
        send all of the above IDs to server via post
convert the current slide to pdf
send pdf to Gemini and get correct answers 
insert correct answer to a spreadsheet
show sidebar('Sidebar')
if failure, alert user

3. Publish
get current user's selected page(s)
show a modal asking
"You have currently selected [] page(s). Would you like to publish what you selected?"
and two options of:
"yes, publish [] page(s)" | "No, publish all pages of this slide" 
adjust selected slides accordingly to the answer
delete all the pages in a slide named "Exam"
copy the selected pages to a slide named "Exam"
send folder ID to a server via post
wait and create a modal showing the personalized url server sent back
if failure, alert user
*/
// Triggered when the add-on is installed
function onInstall(e) {
  onOpen(e);
}

// Triggered when the Google Slides file is opened
function onOpen() {
  var ui = SlidesApp.getUi();
  ui.createMenu("Exam Tool")
    .addItem("1. Initiate", "initiateProject")
    .addItem("2. Set Up", "setUpProject")
    .addItem("3. Set Answers", "setAnswersGemini")
    .addItem("4. Publish", "publishProject")
    .addToUi();
}

var serverUrl = "https://script.google.com/macros/s/AKfycbxVP1Fz6mMHOSR2glUxWi9dQKnLooCbhU2k204lEer_V09zrRGJqHye526T0ba583OkOw/exec";
var templateSheetID = "1EuC-o-nJTEwniJS-NklMDWiEbW6Mfbj2jFSBTFhiIGc";

// Function for "1. Initiate"
function initiateProject() {
  try {
    var ui = SlidesApp.getUi();
    ui.alert("Your project has been initiated! \n\n Proceed with \n[2. Set Up] \nto set answers for your exam");
  } catch (error) {
    SlidesApp.getUi().alert("Failed to initiate the project: " + error.message);
  }
}

function setUpProject() {
  var createdFilesAndFolders = []; // Array to track created files and folders for cleanup
  var presentationFile; // Track the current presentation file separately
  var originalParentFolder; // Track the original parent folder
  var newParentFolder; // Store the new parent folder created  
  var examSlidesFile; // Track the exam slides file

  try {
    var presentation = SlidesApp.getActivePresentation();
    presentationFile = DriveApp.getFileById(presentation.getId());
    originalParentFolder = presentationFile.getParents().next(); // Save the original parent folder

    // Check if parent folder is named "채점기"
    if (originalParentFolder.getDescription() !== "DO NOT EDIT __EXAM FOLDER__") {
      // Create a new parent folder and add editor
      newParentFolder = DriveApp.createFolder("EXAM");
      createdFilesAndFolders.push(newParentFolder); // Track the created folder

      newParentFolder.addEditor("minseochh02@gmail.com").setDescription("DO NOT EDIT __EXAM FOLDER__");

      // Create a new Slides named "Exam"
      var examSlides = SlidesApp.create("Exam");
      var examSlidesID = examSlides.getId();
      examSlidesFile = DriveApp.getFileById(examSlidesID);
      createdFilesAndFolders.push(examSlidesFile); // Track the created slides

      examSlidesFile
        .setDescription("DO NOT EDIT __EXAM__")
        .setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)
        .moveTo(newParentFolder);

      // Move current slide to the new folder
      presentationFile.moveTo(newParentFolder);

      // Send IDs to the server
      try {
        var response = UrlFetchApp.fetch(serverUrl, {
          method: 'post',
          payload: JSON.stringify({
            userEmail: Session.getActiveUser().getEmail(),
            folderID: newParentFolder.getId(),
            slideID: examSlidesID,
          }),
          contentType: 'application/json',
          
        });

        // Check if the response status code is 200
        if (response.getResponseCode() !== 200) {
          throw new Error('Server responded with an error: ' + response.getResponseCode());
        }

        var serverResponse = JSON.parse(response.getContentText());
        console.log(serverResponse);
        presentationFile.setDescription(serverResponse.url);
        console.log(presentationFile.getDescription());

      } catch (serverError) {
        console.error("Server communication error:", serverError);
        throw new Error("Failed to communicate with the server. " + serverError.message);
      }
    }
  } catch (error) {
    console.error("Setup error:", error);
    performCleanup(presentationFile, originalParentFolder, createdFilesAndFolders);
    SlidesApp.getUi().alert("Failed to set up the project: " + error.message);
    return; // Exit the function after cleanup
  }
}

function performCleanup(presentationFile, originalParentFolder, createdFilesAndFolders) {
  try {
    // Move the presentation back to the original parent folder if it was moved
    if (presentationFile && originalParentFolder) {
      presentationFile.moveTo(originalParentFolder);
    }

    // Trash all created files and folders
    createdFilesAndFolders.forEach(function(item) {
      item.setTrashed(true);
    });
  } catch (cleanupError) {
    console.error("Error during cleanup:", cleanupError);
  }
}

// Function for "3. Publish"
function publishProject() {
  try {
    var ui = SlidesApp.getUi();
    var editorPresentation = SlidesApp.getActivePresentation();
    var selectedSlides = editorPresentation.getSelection().getPageRange();
    var allSlides = editorPresentation.getSlides();
    var slidesToPublish;
    var publishAll = false;

    if (selectedSlides && selectedSlides.getLength() > 0) {
      var response = ui.alert(
        `You have currently selected ${selectedSlides.getLength()} page(s). Would you like to publish what you selected?`,
        ui.ButtonSet.YES_NO
      );
      if (response === ui.Button.YES) {
        slidesToPublish = selectedSlides;
      } else {
        publishAll = true;
      }
    } else {
      var response = ui.alert(
        'You have not selected any pages. Would you like to publish all pages?',
        ui.ButtonSet.YES_NO
      );
      if (response === ui.Button.YES) {
        publishAll = true;
      } else {
        return; // Exit the function if the user doesn't want to publish anything
      }
    }

    if (publishAll) {
      slidesToPublish = allSlides;
    }

    publishSelectedPages(slidesToPublish, !publishAll);

    var publishedUrl = DriveApp.getFileById(editorPresentation.getId()).getDescription();
    // You might want to do something with publishedUrl here, like displaying it to the user
    SlidesApp.getUi().alert("Here is the link to your exam: " + publishedUrl);

  } catch (error) {
    SlidesApp.getUi().alert("Failed to publish the project: " + error.message);
  }
}

// Function to publish selected pages
function publishSelectedPages(pages, selectedOnly) {
  try {
    var presentation = SlidesApp.getActivePresentation();
    var examSlides = getExamSlides(presentation);

    // Remove all pages in "Exam" slide
    examSlides.getSlides().forEach(function(page) {
      page.remove();
    });

    // Copy selected pages to "Exam" slide
    pages.forEach(function(page) {
      examSlides.appendSlide(page);
    });

  } catch (error) {
    SlidesApp.getUi().alert("Failed to publish selected pages: " + error.message);
  }
}

// Helper function to get "Exam" slides
function getExamSlides(presentation) {
  var currentSlide = DriveApp.getFileById(presentation.getId());
  var parentFolder = currentSlide.getParents().next();

  if (parentFolder) {
    var files = parentFolder.getFilesByType(MimeType.GOOGLE_SLIDES);
    while (files.hasNext()) {
      var file = files.next();
      if (file.getDescription() === "DO NOT EDIT __EXAM__") {
        presentation = SlidesApp.openById(file.getId());
      }
    }
  }
  return presentation;
}

function showCopyLinkDialog(link) {
  const htmlTemplate = HtmlService.createTemplateFromFile('CopyLinkDialog');
  htmlTemplate.link = link;
  const htmlOutput = htmlTemplate.evaluate()
      .setWidth(500)
      .setHeight(300)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SlidesApp.getUi().showModalDialog(htmlOutput, '링크 복사');
}

function setAnswersGemini() {
  // Get the active presentation as a PDF blob
  var presentation = DriveApp.getFileById(SlidesApp.getActivePresentation().getId());
  var pdfBlob = presentation.getAs('application/pdf'); // create a PDF version
  var file = DriveApp.createFile(pdfBlob).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var fileID = file.getId();
  console.log(fileID);
  // URL to send the PDF to
  var url = "https://m8chaa-gemini-endpoints.hf.space/upload-pdf";

  // Options for the HTTP POST request
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      file_id: fileID
    }),
    muteHttpExceptions: true // Will allow you to get the response even if it's an error
  };
  
  try {
    // Send the PDF file to the server
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    
    // Check if the response is successful (status code 200)
    if (responseCode === 200) {
      var responseText = response.getContentText();
      var parsedResponse = JSON.parse(responseText);
      
      var geminiResponse = JSON.parse(parsedResponse.gemini_response);

      // Transform Gemini response into setAnswers format
      var questionNOs = [];
      var answers = [];
      var scores = []; 
      
      // Function to convert letter answers to circled numbers
      function letterToCircledNumber(letter) {
        const letterMap = {
          'A': '①',
          'B': '②',
          'C': '③',
          'D': '④',
          'E': '⑤'
        };
        return letterMap[letter] || letter; // Return the original if not A-E
      }
      
      geminiResponse.answer_sheet.forEach(item => {
        questionNOs.push(item.question_number);
        answers.push(letterToCircledNumber(item.correct_answer));
        scores.push(1); // Default score of 1 for each question
      });
      
      var answerMETA = [questionNOs, answers, scores];
      console.log(answerMETA);

      setAnswers(answerMETA, "");

    } else {
      console.log("Failed to send PDF. Response code: " + responseCode);
      console.log("Response: " + response.getContentText());
      //
    }
  } catch (error) {
    console.log("Error during HTTP request: " + error.toString());
  }
  
  // Show sidebar
  var html = HtmlService.createTemplateFromFile("Sidebar")
    .evaluate()
    .setTitle("OMR");
  SlidesApp.getUi().showSidebar(html);
}
