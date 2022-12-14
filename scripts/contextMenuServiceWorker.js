// Function to get + decode API key
const getKey = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['openai-key'], (result) => {
          if (result['openai-key']) {
            const decodedKey = atob(result['openai-key']);
            resolve(decodedKey);
          }
        });
      });
};

const sendMessage = (content) => {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const activeTab = tabs[0].id;

		chrome.tabs.sendMessage(
			activeTab,
			{ message: "inject", content },
			(response) => {
				if (response.status === "failed") {
					console.log("injection failed.");
				}
			}
		);
	});
};


const generate = async (prompt) => {
    // Get your API key from storage
    const key = await getKey();
    const url = 'https://api.openai.com/v1/completions';
      
    // Call completions endpoint
    const completionResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'text-davinci-003',
        prompt: prompt,
        max_tokens: 1250,
        temperature: 0.7,
      }),
    });
      
    // Select the top choice and send back
    const completion = await completionResponse.json();
    return completion.choices.pop();
};

//everytime generateCompletionAction is called, our listener passed over an info object
const generateCompletionAction = async (info) => {
    try {
        sendMessage('generating...');

        const { selectionText } = info;
        const basePromptPrefix = `
            Write me a linkedin post about the content below. Use industry jargon. Explain why it's interesting. It should be no more than 700 characters. Include the article link.
        
            Subject:
            `;
        // Call GPT-3
        const baseCompletion = await generate(`${basePromptPrefix}${selectionText}`);
        console.log(baseCompletion);

        //send the output
        sendMessage(baseCompletion.text);

        // Second Prompt
        const secondPrompt = `
        Create a catchphrase to start the linkedin post below.        
        Linkedin Post: ${baseCompletion.text}
        
        Catchphrase:
        `;

        // Call your second prompt
        const secondPromptCompletion = await generate(secondPrompt);
        console.log(secondPromptCompletion);


        // Send the output when we're all done
        sendMessage(secondPromptCompletion.text);

        

    } catch (error) {
    console.log(error);
    sendMessage(error.toString());
    }
};

// listening for when the extension is installed and add the option on the contextual menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'context-run',
      title: 'Generate linkedin article',
      contexts: ['selection'],
    });
});
  
// Add listener
chrome.contextMenus.onClicked.addListener(generateCompletionAction);


