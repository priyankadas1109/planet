// ------------------------------------------------------------
// IMPORTS
// ------------------------------------------------------------

// API Integrations
import { 
    OpenAIEmbeddings, 
    ChatOpenAI, 
    AzureChatOpenAI, 
    AzureOpenAIEmbeddings 
  } from "@langchain/openai";
  import { ChatXAI } from "@langchain/xai";
  import { ChatAnthropic } from "@langchain/anthropic";
  import { ChatFireworks } from "@langchain/community/chat_models/fireworks";
  import { TogetherAI } from "@langchain/community/llms/togetherai";
  import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
  import { ChatCohere, CohereEmbeddings } from "@langchain/cohere";
  import { ChatGroq } from "@langchain/groq";
  import { MistralAI } from "@langchain/mistralai";
  import { textGeneration } from "@huggingface/inference";
  
  // LangChain Utilities
  import { MemoryVectorStore } from "langchain/vectorstores/memory";
  import { ChatPromptTemplate } from "@langchain/core/prompts";
  import { RunnableSequence } from "@langchain/core/runnables";
  import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
  import { fetchRepoContentsFromUrl } from "./utils";
  
  // ------------------------------------------------------------
  // CONSTANTS
  // ------------------------------------------------------------
  
  // Google Sheets API constants
  const SPREADSHEET_ID = '1jQTlXWom-pXvyP9zuTcbdluyvpb43hu2h7anxhF5qlQ';
  const RANGE = 'A2:J';
  const API_KEY = 'AIzaSyC211F_ub1nAGr2Xv-wJGeulMg4nPzG1yE';
  
  // RAG prompt template
  const RAG_PROMPT = `
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
  
  // ------------------------------------------------------------
  // GLOBAL STATE
  // ------------------------------------------------------------
  
  let pulledData;
  let tempData;
  
  // ------------------------------------------------------------
  // LLM INITIALIZATION
  // ------------------------------------------------------------
  
  /**
   * Initializes an LLM based on the user's selection
   * @returns {Object} Object containing the LLM and embeddings model
   */
  function initializeLLM() {
    const apiKey = document.getElementById('apiKey').value;
    const chosenService = document.getElementById("aiModel").value;
    let llm;
    let embeddings;
    let needOtherAPIKey = false;
    let huggingface = false;
  
    switch(chosenService) {
      case "OpenAI":
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
        needOtherAPIKey = true;
        break;
      case "Groq":
        llm = new ChatGroq({
          model:"mixtral-8x7b-32768",
          temperature: 0,
          apiKey: apiKey
        });
        needOtherAPIKey = true;
        break;
      case "MistralAI":
        llm = new MistralAI({
          model: "codestral-latest",
          temperature: 0,
          apiKey: apiKey
        });
        needOtherAPIKey = true;
        break;
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
  
    // Handle models requiring separate embedding API key
    if (needOtherAPIKey) {
      const otherAPIKey = document.getElementById('otherApiKey').value;
      embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
        apiKey: otherAPIKey
      });
    }
  
    return { llm, embeddings, huggingface };
  }
  
  // ------------------------------------------------------------
  // CORE FUNCTIONALITY
  // ------------------------------------------------------------
  
  /**
   * Main method to generate responses based on context and user query
   * @returns {Promise<string>} The generated response
   */
  async function generateResponse() {
    // Initialize LLM and embeddings
    const { llm, embeddings, huggingface } = initializeLLM();
    
    // Create vector store and split documents
    const vectorStore = new MemoryVectorStore(embeddings);
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100
    });
  
    // Process and store documents
    const allSplits = await splitter.splitDocuments(pulledData);
    console.log("Splitted Documents:", allSplits);
    await vectorStore.addDocuments(allSplits);
  
    // Get user query and find similar documents
    const query = document.getElementById('userQuery').value;
    const topMatches = await vectorStore.similaritySearch(query, 3);
    console.log("Top matches:", topMatches);
    
    // Format context from matches
    const context = topMatches.map((doc, i) => 
      `Source ${i + 1}: ${doc.metadata.source}\n${doc.pageContent}`
    ).join("\n\n");
    
    console.log("Context:", context);
    console.log("Query:", query);
    
    let answer = "";
    
    // Handle different model types
    if (!huggingface) {
      // Use LangChain for most models
      const promptTemplate = ChatPromptTemplate.fromTemplate(RAG_PROMPT);
      const chain = RunnableSequence.from([
        promptTemplate,
        llm,
      ]);
      
      const response = await chain.invoke({
        context,
        query,
      });
      answer = response.content;
    } else {
      // Use Huggingface API directly
      try {
        const modifiedPrompt = RAG_PROMPT.replace("{context}", context).replace("{query}", query);
        const response = await textGeneration({
          accessToken: document.getElementById('apiKey').value,
          model: document.getElementById('huggingFaceModel').value,
          inputs: modifiedPrompt,
          parameters: { max_new_tokens: 50 }
        });
        answer = response.generated_text;
      } catch (error) {
        console.error("Error:", error);
      }
    }
    
    // Display the answer
    document.getElementById('response').innerText = answer;
    return answer;
  }
  
  // ------------------------------------------------------------
  // DATA SOURCE METHODS
  // ------------------------------------------------------------
  
  /**
   * Pull content from a GitHub repository or other source
   */
  async function pullData() {
    const selectedSource = document.getElementById('sourceType').value;
    const githubToken = document.getElementById('githubToken').value;
    const repoUrl = document.getElementById('sourceUrl').value;
    
    if (selectedSource === 'feedAPI') {
      console.log("Pulling data from API feed...");
      pulledData = tempData;
      console.log("Contents:", pulledData);
    } else {
      try {
        pulledData = await fetchRepoContentsFromUrl(repoUrl, selectedSource, githubToken);
        console.log("Contents:", pulledData);
      } catch(e) {
        console.log("Error loading documents:", e);
      }
    }
  }
  
  // ------------------------------------------------------------
  // GOOGLE SHEETS API METHODS
  // ------------------------------------------------------------
  
  /**
   * Fetches data from Google Sheets API
   */
  function getGoogleSheetData() {
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
  
  /**
   * Populates dropdown with feed options
   * @param {Array} feedData Array of feed data from Google Sheets
   */
  function populateDropdown(feedData) {
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
  
  /**
   * Fetches feed details from Google Sheets
   * @param {string} feedValue Feed name to fetch details for
   * @returns {Promise<Object>} Promise resolving to feed details
   */
  function fetchFeedDetails(feedValue) {
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
  
  // ------------------------------------------------------------
  // CORS AND DATA FETCHING METHODS
  // ------------------------------------------------------------
  
  /**
   * Updates feed based on selection
   * @param {string} feedValue Selected feed value
   */
  function updateFeed(feedValue) {
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
          showCORSLink();
          fetchWithCORS(url);
        } else {
          console.log('No CORS Needed');
          hideCORSLink();
          fetchData(url);
        }
      }
    }).catch(error => {
      console.error('Error fetching feed details:', error);
    });
  }
  
  /**
   * Fetches data using CORS proxy
   * @param {string} url The URL to fetch data from
   */
  function fetchWithCORS(url) {
    console.log('Making CORS request to:', url);
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
  
    fetch(proxyUrl + url)
      .then(response => {
        console.log('CORS Response Status:', response.status);
        return response.text();
      })
      .then(data => {
        console.log('CORS Response Data:', data);
  
        // Check if it is RSS format (XML)
        if (data.startsWith("<?xml")) {
          console.log("Received XML data, parsing...");
          parseRSS(data);
        } else {
          try {
            const jsonData = JSON.parse(data);
            tempData = jsonData;
          } catch (error) {
            console.error("Error parsing JSON:", error);
          }
        }
      })
      .catch(error => {
        console.error('CORS request failed:', error);
      });
  }
  
  /**
   * Fetches data directly (no CORS)
   * @param {string} url URL to fetch data from
   */
  function fetchData(url) {
    console.log('CORS not needed URL:', url);
    
    fetch(url)
      .then(response => response.json())
      .then(data => {
        console.log('Fetched data:', data);
        tempData = data;
      })
      .catch(error => {
        console.error('Data fetch failed:', error);
      });
  }
  
  /**
   * Parses RSS/XML data
   * @param {string} xmlData XML data to parse
   */
  function parseRSS(xmlData) {
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
  
    console.log("Parsed RSS Items:", formattedItems);
    tempData = formattedItems;
  }
  
  /**
   * Displays data in the UI
   * @param {Object} data Data to display
   */
  function displayData(data) {
    const resultJson = document.getElementById('resultJson');
    resultJson.innerHTML = JSON.stringify(data, null, 2);
  }
  
  // CORS UI Helper Functions
  function showCORSLink() {
    document.getElementById('corsLink').style.display = 'block';
  }
  
  function hideCORSLink() {
    document.getElementById('corsLink').style.display = 'none';
  }
  
  // ------------------------------------------------------------
  // EVENT LISTENERS AND INITIALIZATION
  // ------------------------------------------------------------
  
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements
    const submitButton = document.getElementById('submitButton');
    const loadDataButton = document.getElementById('loadData');
    const chosenService = document.getElementById('aiModel');
    const otherApiKeyField = document.getElementById('otherApiKeyContainer');
    const contextBtn = document.getElementById('contextBtn');
  
    // Function to check if another API key is needed
    function checkOtherAPIKeyRequirement() {
      const service = chosenService.value;
      const needsOtherAPIKey = [
        "Anthropic", "Google", "FireworksAI", 
        "Groq", "MistralAI", "TogetherAI", "HuggingFace"
      ].includes(service);
  
      // Show or hide the other API key field accordingly
      otherApiKeyField.style.display = needsOtherAPIKey ? "block" : "none";
    }
  
    // Debug function to check context
    function checkContext() {
      console.log(pulledData);
    }
  
    // Add event listeners
    contextBtn.addEventListener('click', checkContext);
    chosenService.addEventListener('change', checkOtherAPIKeyRequirement);
    
    // Initialize API key field visibility
    checkOtherAPIKeyRequirement();
  
    // Set up load data button
    loadDataButton.addEventListener('click', async () => {
      loadDataButton.innerHTML = `<span class="animate-spin mr-2">⏳</span> Loading...`;
      loadDataButton.disabled = true;
  
      try {
        await pullData();
      } catch (error) {
        console.error('Error loading data:', error);
      }
  
      loadDataButton.innerHTML = "Load the Data Source";
      loadDataButton.disabled = false;
    });
  
    // Set up submit button
    submitButton.addEventListener('click', async () => {
      await generateResponse();
    });
    
    // Initialize Google Sheets data
    getGoogleSheetData();
  });
  
  // Listen for CORS refresh button click event
  document.addEventListener('click', function(event) {
    if (event.target.id === 'corsLink' && event.target.tagName === 'A') {
      alert("CORS passthrough enabled. Please refresh the page.");
    }
  });
  
  // ------------------------------------------------------------
  // EXPORTS
  // ------------------------------------------------------------
  
  export {
    getGoogleSheetData,
    populateDropdown,
    fetchWithCORS,
    parseRSS,
    displayData,
    updateFeed,
    showCORSLink,
    hideCORSLink,
    fetchFeedDetails,
    fetchData
  };