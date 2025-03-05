//Import statements for all the different chat models and their embeddings
import { OpenAIEmbeddings, ChatOpenAI, AzureChatOpenAI, AzureOpenAIEmbeddings } from "@langchain/openai";
import { ChatXAI } from "@langchain/xai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatFireworks } from "@langchain/community/chat_models/fireworks";
import { TogetherAI } from "@langchain/community/llms/togetherai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatCohere, CohereEmbeddings } from "@langchain/cohere";
import { ChatGroq } from "@langchain/groq";
import { MistralAI } from "@langchain/mistralai";
import { textGeneration } from "@huggingface/inference";

import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { fetchRepoContentsFromUrl } from "./utils";

// Variable to store the context data
var pulledData;

/**
 * Method to generate the reposnse based on the context and user query
 * @returns returns the result of the query based on the context
 */
async function generateResponse() {
    const apiKey = document.getElementById('apiKey').value;
    const chosenService = document.getElementById("aiModel").value;
    let llm;
    let embeddings;
    let needOtherAPIKey = false;
    let huggingface = false;

    switch(chosenService){
        case "OpenAI":
            //Need OpenAI Api Key
            llm = new ChatOpenAI({
                model: "gpt-4o-mini",
                temperature: 0,
                apiKey: apiKey
            });
            embeddings = new OpenAIEmbeddings({
                model: "text-embedding-3-small",
                apiKey: apiKey
            });
            break;
        case "Anthropic":
            llm = new ChatAnthropic({
                model: "claude-3-5-sonnet-20240620",
                apiKey: apiKey
            });
            //Need another API key for embedding
            needOtherAPIKey = true;
            break;
        case "Azure":
            llm = new AzureChatOpenAI({
                model: "gpt-4o",
                temperature: 0,
                azureOpenAIApiKey: apiKey
            });
            embeddings = new AzureOpenAIEmbeddings({
                azureOpenAIApiEmbeddingsDeploymentName: "text-embedding-ada-002"
            });
            break;
        case "Google":
            llm = new ChatGoogleGenerativeAI({
                model: "gemini-1.5-pro",
                temperature: 0,
                apiKey: apiKey
            });
            //Need another API key for embedding
            needOtherAPIKey = true;
            break;
        case "Cohere":
            llm = new ChatCohere({
                model: "command-r-plus",
                temperature: 0,
                apiKey: apiKey
            });
            embeddings = new CohereEmbeddings({
                model: "embed-english-v3.0"
            });
            break;
        case "FireworksAI":
            llm = new ChatFireworks({
                model: "accounts/fireworks/models/llama-v3p1-70b-instruct",
                temperature: 0,
                apiKey: apiKey
            });
            //Need another API key for embedding
            needOtherAPIKey = true;
            break;
        case "Groq":
            llm = new ChatGroq({
                model:"mixtral-8x7b-32768",
                temperature: 0,
                apiKey: apiKey
            });
            //Need another API key for embedding
            needOtherAPIKey = true;
            break;
        case "MistralAI":
            llm = new MistralAI({
                model: "codestral-latest",
                temperature: 0,
                apiKey: apiKey
            });
            //Need another API key for embedding
            needOtherAPIKey = true;
            break;
        //This is a langchian community LLM
        case "TogetherAI":
            llm = new TogetherAI({
                model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
                maxTokens: 256,
                apiKey: apiKey
            });
            needOtherAPIKey = true;
            break;
        case "HuggingFace":
            needOtherAPIKey = true;
            huggingface = true;
            break;
        default:
            console.log("Invalid LLM model selected");
    }

    //Instantiate the OpenAI embedding model if the LLM requires a different API key
    if(needOtherAPIKey){
        const otherAPIKey = document.getElementById('otherApiKey').value;
        embeddings = new OpenAIEmbeddings({
            model: "text-embedding-3-small",
            apiKey: otherAPIKey
        });
    }

    const vectorStore = new MemoryVectorStore(embeddings);

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize:1000,
        chunkOverlap:100
    });

    const allSplits = await splitter.splitDocuments(pulledData);
    console.log("Splitted Documents:", allSplits);
    // Add documents to vector store directly without separate embedding step
    await vectorStore.addDocuments(allSplits);

    const query = document.getElementById('userQuery').value;

    const topMatches = await vectorStore.similaritySearch(query, 3);
    console.log("Top matches:", topMatches);
    const context = topMatches.map((doc, i) => `Source ${i + 1}: ${doc.metadata.source}\n${doc.pageContent}`).join("\n\n");
    console.log("Context:", context);
    console.log("Query:", query);
    const prompt = `
            You are an expert assistant answering questions related to the data pulled from a GitHub repository.
            Use the following context to answer the query:
    
            Context:
            {context}
    
            Query:
            {query}
    
            Provide a detailed, accurate response based on the context provided.
            If you're unsure about something, please say so.
            If the question is unrelated to the context, please say that the question is unrelated or something
            along the lines of that
            
            Answer:
        `;
    

    let answer = "";
    if(!huggingface){
        const promptTemplate = ChatPromptTemplate.fromTemplate(prompt);
    
        const chain = RunnableSequence.from([
            promptTemplate,
            llm,
        ]);
    
        const response = await chain.invoke({
            context,
            query,
        });
        answer = response.content;
    } else{
        //Huggingface API call
        try {
            const modifiedPrompt = prompt.replace("{context}", context).replace("{query}", query);
            const response = await textGeneration({
                accessToken: document.getElementById('apiKey').value,
                model: document.getElementById('huggingFaceModel').value,  // Replace with a valid model name
                inputs: modifiedPrompt,
                parameters: { max_new_tokens: 50 }
            });
            answer = response.generated_text;
        } catch (error) {
            console.error("Error:", error);
        }
    }
    document.getElementById('response').innerText = answer;
    return answer;
}


/**
 * Method to pull content from the repository and use it as context to answer the query
 */
async function pullFromRepo(){
    const githubToken = document.getElementById('githubToken').value;
    const repoUrl = document.getElementById('sourceUrl').value;

    try{
        const urlType = document.getElementById('sourceType').value;
        pulledData = await fetchRepoContentsFromUrl(repoUrl, urlType, githubToken);
        console.log("Contents:", pulledData);
    } catch(e){
        console.log("Error loading documents:", e);
    }
}

/**
 * Method to pull content from the API feed and use it as context to answer the query
 */
async function pullFromAPIFeed(){
    
}


document.addEventListener('DOMContentLoaded', () => {
    const submitButton = document.getElementById('submitButton');
    const loadDataButton = document.getElementById('loadData');
    const chosenService = document.getElementById('aiModel');
    const otherApiKeyField = document.getElementById('otherApiKeyContainer'); // Div or input container
    const sourceType = document.getElementById('sourceType');
    const contextBtn = document.getElementById('contextBtn');

    // Function to check if another API key is needed
    function checkOtherAPIKeyRequirement() {
        const service = chosenService.value;
        const needsOtherAPIKey = ["Anthropic", "Google", "FireworksAI", "Groq", "MistralAI", "TogetherAI", "HuggingFace"].includes(service);

        // Show or hide the other API key field accordingly
        if (needsOtherAPIKey) {
            otherApiKeyField.style.display = "block";
        } else {
            otherApiKeyField.style.display = "none";
        }
    }

    //Function primarily for debugging purposes
    function checkContext(){
        console.log(pulledData);
    }

    contextBtn.addEventListener('click', checkContext);

    // Listen for model selection change
    chosenService.addEventListener('change', checkOtherAPIKeyRequirement);

    // Execute function on page load in case the dropdown is preselected
    checkOtherAPIKeyRequirement();

    loadDataButton.addEventListener('click', async () => {
        loadDataButton.innerHTML = `<span class="animate-spin mr-2">⏳</span> Loading...`;
        loadDataButton.disabled = true; // Disable the button to prevent multiple clicks
    
        try {
            if (sourceType.value === 'feedAPI') {
                await pullFromAPIFeed();
            } else {
                await pullFromRepo();
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    
        loadDataButton.innerHTML = "Load the Data Source"; // Restore original text
        loadDataButton.disabled = false; // Re-enable the button
    });

    // Add event listener for the button
    submitButton.addEventListener('click', async () => {
        await generateResponse();
    });
});




// feedutils.js
const SPREADSHEET_ID = '1jQTlXWom-pXvyP9zuTcbdluyvpb43hu2h7anxhF5qlQ';  // Google Sheets ID
const RANGE = 'A2:J';  // Data range
const API_KEY = 'AIzaSyC211F_ub1nAGr2Xv-wJGeulMg4nPzG1yE';  // API key

// Get Google Sheets data
export function getGoogleSheetData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            populateDropdown(data.values);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Populate dropdown menu
export function populateDropdown(feedData) {
    const selectElement = document.getElementById('apiFeeds');
    selectElement.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = "none";
    defaultOption.textContent = "Select a feed.......";
    selectElement.appendChild(defaultOption);

    feedData.forEach(feed => {
        const option = document.createElement('option');
        option.value = feed[0]; // Feed name
        option.textContent = feed[0];
        selectElement.appendChild(option);
    });

    // Restore last selected feed from localStorage
    const savedFeed = localStorage.getItem('selectedFeed');
    if (savedFeed) {
        selectElement.value = savedFeed;
        updateFeed(savedFeed);  // Automatically load previously selected feed
    }
}

// Update feed
export function fetchWithCORS(url) {
    console.log('Making CORS request to:', url);  // Print requested URL
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';  // Use CORS proxy

    fetch(proxyUrl + url)
        .then(response => {
            console.log('CORS Response Status:', response.status);  // Print HTTP status
            return response.text();  // Use text() to get response content (for RSS)
        })
        .then(data => {
            console.log('CORS Response Data:', data);  // Print returned data

            // Check if it is RSS format (XML)
            if (data.startsWith("<?xml")) {
                console.log("Received XML data, parsing...");
                parseRSS(data);  // Call the parsing function for XML
            } else {
                try {
                    const jsonData = JSON.parse(data);  // If it is JSON data
                    displayData(jsonData);  // Display JSON data
                } catch (error) {
                    console.error("Error parsing JSON:", error);  // Error parsing JSON
                }
            }
        })
        .catch(error => {
            console.error('CORS request failed:', error);  // Print request error
        });
}

// Parse RSS (XML) data
export function parseRSS(xmlData) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlData, "text/xml");

    // Get all RSS items
    const items = xmlDoc.getElementsByTagName("item");
    const formattedItems = [];
    
    // Iterate through each item
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const link = item.querySelector("link") ? item.querySelector("link").textContent : "No link";
        const description = item.querySelector("description") ? item.querySelector("description").textContent : "No description";
        const pubDate = item.querySelector("pubDate") ? item.querySelector("pubDate").textContent : "No date";
        const guid = item.querySelector("guid") ? item.querySelector("guid").textContent : "No GUID";

        formattedItems.push({
            link,
            description,
            pubDate,
            guid
        });
    }

    // Print parsed items
    console.log("Parsed RSS Items:", formattedItems);
    displayData(formattedItems);  // Display RSS data
}

// Display data (either RSS or JSON)
export function displayData(data) {
    const resultJson = document.getElementById('resultJson');
    resultJson.innerHTML = JSON.stringify(data, null, 2);  // Display JSON data
}

// Update feed
export function updateFeed(feedValue) {
    console.log(`Selected feed: ${feedValue}`);

    // Clear previous data
    document.getElementById('resultJson').innerHTML = '';
    document.getElementById('resultFull').innerHTML = '';

    localStorage.setItem('selectedFeed', feedValue);  // Save current selection

    fetchFeedDetails(feedValue).then(feedDetails => {
        if (feedDetails) {
            const { url, cors } = feedDetails;
            console.log(`Feed URL: ${url}, CORS Needed: ${cors}`);
            if (cors === "TRUE") {
                console.log('CORS Needed');
                showCORSLink();  // Show CORS alert
                fetchWithCORS(url);  // Perform CORS request and print detailed information
            } else {
                console.log('No CORS Needed');
                hideCORSLink();  // Hide CORS alert
                fetchData(url);  // Directly fetch data
            }
        }
    }).catch(error => {
        console.error('Error fetching feed details:', error);
    });
}

// Show CORS alert
export function showCORSLink() {
    document.getElementById('corsLink').style.display = 'block';  // Show CORS alert
}

// Hide CORS alert
export function hideCORSLink() {
    document.getElementById('corsLink').style.display = 'none';  // Hide CORS alert
}

// Fetch feed details
export function fetchFeedDetails(feedValue) {
    return new Promise((resolve, reject) => {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                const feedRow = data.values.find(row => row[0] === feedValue);
                if (feedRow) {
                    resolve({
                        url: feedRow[9],  // Feed URL
                        cors: feedRow[8]  // CORS requirement
                    });
                } else {
                    reject('Feed not found');
                }
            })
            .catch(error => reject(error));
    });
}

// Request data (no CORS)
/**
 * Method also displays data
 * @param {*} url url to fetch data from
 */
export function fetchData(url) {
    console.log('CORS not needed URL:', url);
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log('Fetched data:', data);
            pulledData = data;
            displayData(data);  // Display data
        })
        .catch(error => {
            console.error('Data fetch failed:', error);
        });
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', function() {
    getGoogleSheetData();  // Fetch data from Google Sheet
});

// Listen for CORS refresh button click event
document.addEventListener('click', function(event) {
    if (event.target.id === 'corsLink' && event.target.tagName === 'A') {
        alert("CORS passthrough enabled. Please refresh the page.");
    }
});

