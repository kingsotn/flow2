function logResponse(responseDetails) {
  console.log(`URL: ${responseDetails.url}`);
  console.log(`Status Code: ${responseDetails.statusCode}`);
  console.log(`Method: ${responseDetails.method}`);
  console.log(`Initator: ${responseDetails.initiator}`);
  console.log(`IP: ${responseDetails.ip}`);
  console.log(`From Cache: ${responseDetails.fromCache}`);
  console.log(`Tab ID: ${responseDetails.tabId}`);
  console.log(`Time Stamp: ${responseDetails.timeStamp}`);
  console.log(`Type: ${responseDetails.type}`);
  console.log(`Document ID: ${responseDetails.documentId}`);
  console.log(`Document Lifecycle: ${responseDetails.documentLifecycle}`);
  console.log(`Frame ID: ${responseDetails.frameId}`);
  console.log(`Frame Type: ${responseDetails.frameType}`);
  console.log(`Parent Document ID: ${responseDetails.parentDocumentId}`);
  console.log(`Parent Frame ID: ${responseDetails.parentFrameId}`);
  console.log(`Request ID: ${responseDetails.requestId}`);
  console.log(`Response Headers: ${responseDetails.responseHeaders}`);
  console.log(`Status Line: ${responseDetails.statusLine}`);
}

chrome.webRequest.onCompleted.addListener(
  logResponse,
  {urls: ["https://chat.openai.com/backend-api/conversation/*"]},
  // ["blocking"]
  // ["asyncBlocking"]
);



function getFrameContent(tabId, frameId) {
  console.log(`Attempting to inject script into tab ${tabId}, frame ${frameId}`);

  chrome.scripting.executeScript({
    target: {tabId: tabId, frameIds: [frameId]},
    function: () => {
      // This function will be executed in the context of the target frame.
      // You can access DOM and other permissible APIs here.
      return document.documentElement.outerHTML; // For example, return the entire HTML source of the frame.
    },
  }, (injectionResults) => {
    if (chrome.runtime.lastError) {
      // Log any errors that occurred during the injection.
      console.error(`Error injecting script into frame ${frameId} of tab ${tabId}: ${chrome.runtime.lastError.message}`);
      return;
    }

    for (const frameResult of injectionResults) {
      if (frameResult.result) {
        console.log(`Content from frame ${frameId} of tab ${tabId}:`, frameResult.result);
      } else {
        console.log(`No content retrieved from frame ${frameId} of tab ${tabId}.`);
      }
    }
  });
}

let frameElement = document.querySelector("#intercom-frame")
if (frameElement) {
  chrome.runtime.sendMessage({
    message: 'get_frame_content',
    frameDetails: {
      url: frameElement.src,
      // Additional details as needed
    }
  });
}

// Continue in background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'get_frame_content') {
    // Assuming you want to act on the tab that sent the message
    const tabId = sender.tab.id;

    // Here you might need logic to determine the correct frameId based on the message details
    // This example just uses 0 assuming you're targeting the main frame
    let frameId = 0; // Example, adjust based on your logic

    getFrameContent(tabId, frameId);
  }
});
