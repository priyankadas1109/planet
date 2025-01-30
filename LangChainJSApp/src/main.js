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

import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";
import { GithubRepoLoader } from '@langchain/community/document_loaders/web/github';

/**
 * Method to get the response from the LLM 
 * @param {*} context the context for the RAG process
 * @param {*} query the query asked by the user
 * @param {*} llm the llm to be used for the query
 * @returns returns the result of the query based on the context
 */
async function generateResponse(context, query, llm) {
    const promptTemplate = ChatPromptTemplate.fromTemplate(`
        You are an expert assistant answering questions related to the repository data pulled from a GitHub repository.
        Use the following context to answer the query:

        Context:
        {context}

        Query:
        {query}

        Provide a detailed, accurate response based on the context provided.
        If you're unsure about something, please say so.
        
        Answer:
    `);

    const chain = RunnableSequence.from([
        promptTemplate,
        llm,
    ]);

    const response = await chain.invoke({
        context,
        query,
    });

    return response.content;
}


/**
 * Function to match the pattern of the github URL
 * @param {*} repoUrl The url of the repository from which to fetch the contents
 * @returns the content of the repository
 */
async function fetchRepoContentsFromUrl(repoUrl){
    try{
        const match = repoUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) throw new Error("Invalid GitHub repository URL");
        const owner = match[1];
        const repo = match[2];
        const branch = "main";
        const contents = await convertToLangChainDocs(owner, repo, branch);
        console.log("Repository Contents:", contents);
        return contents; // Return all files
    } catch (error) {
        console.error("Error fetching repository contents:", error);
        return [];
    }
}

/**
 * Function to get the contents of the repository recursively given the owner, repo, branch and token
 * @param {*} owner 
 * @param {*} repo 
 * @param {*} branch 
 * @param {*} path 
 * @param {*} token 
 * @returns A list of jsons containing the contents of the repository
 */
async function fetchRepoContents(owner, repo, branch, path = "", token = null) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const headers = token ? { Authorization: `token ${token}` } : {};
    
    try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const items = await response.json();
        let allFiles = [];

        for (const item of items) {
            if (item.type === "file") {
                allFiles.push(item);
            } else if (item.type === "dir") {
                const subfolderFiles = await fetchRepoContents(owner, repo, branch, item.path, token);
                allFiles = allFiles.concat(subfolderFiles);
            }
        }

        return allFiles;
    } catch (error) {
        console.error("Error fetching repository contents:", error);
        return [];
    }
}

/**
 * Method to get the content of the file given the file URL and the token
 * @param {*} fileUrl 
 * @param {*} token 
 * @returns the content of the file
 */
async function fetchFileContent(fileUrl, token = null) {
    const headers = token ? { Authorization: `token ${token}` } : {};

    try {
        const response = await fetch(fileUrl, { headers });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.text(); // Get the raw file content as text
    } catch (error) {
        console.error("Error fetching file content:", error);
        return null;
    }
}

/**
 * Method to convert the contents of the repository to the langchain documents
 * @param {*} owner 
 * @param {*} repo 
 * @param {*} branch 
 * @param {*} token 
 * @returns 
 */
async function convertToLangChainDocs(owner, repo, branch, token = null) {
    const files = await fetchRepoContents(owner, repo, branch, "", token);

    const documents = [];
    for (const file of files) {
        if (file.url) { // Ensure the file has a valid download URL
            const content = await fetchFileContent(file.download_url, token);
            if (content) {
                documents.push(
                    new Document({
                        pageContent: content,
                        metadata: {
                            source: file.path, // Add file path as metadata
                            url: file.html_url, // Optionally add GitHub URL
                        },
                    })
                );
            }
        }
    }

    return documents;
}

/**
 * Method to pull content from the repository and answer the query
 */
export async function pullFromRepo(){
    let files = [];
    const githubToken = document.getElementById('githubToken').value;
    const repoUrl = document.getElementById('sourceUrl').value;
    const apiKey = document.getElementById('apiKey').value;
    const chosenLLM = document.getElementById("aiModel").value;
    let llm;
    let embeddings;
    switch(chosenLLM){
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
            break;
        case "Groq":
            llm = new ChatGroq({
                model:"mixtral-8x7b-32768",
                temperature: 0,
                apiKey: apiKey
            });
            break;
        case "MistralAI":
            llm = new MistralAI({
                model: "codestral-latest",
                temperature: 0,
                apiKey: apiKey
            });
            break;
        //This is a langchian community LLM
        case "TogetherAI":
            llm = new TogetherAI({
                model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
                maxTokens: 256,
                apiKey: apiKey
            });
        default:
            console.log("Invalid LLM model selected");
    }
    const vectorStore = new MemoryVectorStore(embeddings);
    try{
        const contents = await fetchRepoContentsFromUrl(repoUrl);
        console.log("Contents:", contents);
        // // Ensure documents are in the correct format before splitting
        // const formattedDocs = docs.map(doc => {
        //     if (typeof doc === 'string') {
        //         return new Document({ pageContent: doc });
        //     }
        //     return new Document({
        //         pageContent: doc.content || doc.pageContent || '',
        //         metadata: doc.metadata || {}
        //     });
        // });
        // console.log("Formatted Documents:", formattedDocs);
        // Run the documents through the splitter
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize:10000,
            chunkOverlap:2000
        });

        const allSplits = await splitter.splitDocuments(contents);
        console.log("Splitted Documents:", allSplits);
        // Add documents to vector store directly without separate embedding step
        await vectorStore.addDocuments(allSplits);

        const query = document.getElementById('userQuery').value;
        const topMatches = await vectorStore.similaritySearch(query, 5);
        console.log("Top matches:", topMatches);
        const context = topMatches.map((doc) => doc.pageContent).join("\n");
        console.log("Context:", context);
        console.log("Query:", query);
        const answer = await generateResponse(context, query, llm);
        document.getElementById('response').innerText = answer;

    } catch(e){
        console.log("Error loading documents:", e);
    }
}

// Event listener Javascript code
document.addEventListener('DOMContentLoaded', () => {
    // Get references to HTML elements
    const button = document.getElementById('submitButton');

    // Add click event listener to the button
    button.addEventListener('click', () => {
        pullFromRepo();
    });
});

