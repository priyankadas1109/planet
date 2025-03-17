// ------------------------------------------------------------
// DATA SERVICE
// ------------------------------------------------------------

import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { fetchRepoContentsFromUrl } from "../utils/repoUtils";
import { initializeLLM, generateHuggingFaceResponse } from "./llmService";
import { RAG_PROMPT } from "../config/constants";
import { convertFeedDataToDocuments } from "../utils/repoUtils";

// Global state for data storage
let pulledData = null;

/**
 * Main method to generate responses based on context and user query
 * @returns {Promise<string>} The generated response
 */
export async function generateResponse() {
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
    answer = await generateHuggingFaceResponse(context, query, RAG_PROMPT);
  }
  
  // Display the answer
  document.getElementById('response').innerText = answer;
  return answer;
}

/**
 * Pull content from a GitHub repository or other source
 */
export async function pullData() {
  const selectedSource = document.getElementById('sourceType').value;
  const githubToken = document.getElementById('githubToken').value;
  const repoUrl = document.getElementById('sourceUrl').value;
  
  if (selectedSource === 'feedAPI') {
    console.log("Pulling data from API feed...");
    pulledData = await convertFeedDataToDocuments(pulledData);
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

/**
 * Stores temporary data for later processing
 * @param {any} data The data to store
 */
export function setTempData(data) {
  pulledData = data;
}

/**
 * Debug method to check loaded data
 */
export function checkPulledData() {
  console.log(pulledData);
  return pulledData;
}