import { OpenAIEmbeddings, ChatOpenAI, OpenAI } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {PineconeStore} from "@langchain/pinecone";
import { Document } from "@langchain/core/documents";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";



async function fetchFilesFromRepo(owner, repo, path="", githubToken){
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    try{
        const response = await fetch(url, {
            headers: {
                "Accept": "application/vnd.github.v3+json",
                "Authorization": `Bearer ${githubToken}`
            },
        });
        if(!response.ok){
            throw new Error(`Failed to fetch documents: ${response.statusText}`);
        }
        const json = await response.json();
        for(const item of json){
            if(item.type === 'file'){
                files.push(item);
            } else if(item.type === 'dir'){
                await fetchFilesFromRepo(owner, repo, item.path, githubToken);
            }
        }
    } catch(e){
        console.error(`Error fetching from path ${path}:`, e);
    }
}
export async function pullFromRepo(){
    let files = [];
    const githubToken = document.getElementById('githubToken').value;
    const repoUrl = document.getElementById('sourceUrl').value;
    const apiKey = document.getElementById('apiKey').value;

    //Need OpenAI Api Key
    const llm = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0,
        apiKey: apiKey
    });
    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
        apiKey: apiKey
    });
    const vectorStore = new MemoryVectorStore(embeddings);
    try{
        const response = await fetch("http://localhost:8080/api/load-github-repo", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                repoUrl,
                githubToken
            }),
        });
        if(!response.ok){
            throw new Error(`Failed to load Github repo: ${response.statusText}`);
        }
        const reply = await response.json();
        //We have the documents now
        const docs = reply["documents"];
        console.log(docs);

        // Ensure documents are in the correct format before splitting
        const formattedDocs = docs.map(doc => {
            if (typeof doc === 'string') {
                return new Document({ pageContent: doc });
            }
            return new Document({
                pageContent: doc.content || doc.pageContent || '',
                metadata: doc.metadata || {}
            });
        });

        // Run the documents through the splitter
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize:1000,
            chunkOverlap:200
        });

        const allSplits = await splitter.splitDocuments(docs);

        console.log("Splitted Documents:", allSplits);

        // Add documents to vector store directly without separate embedding step
        await vectorStore.addDocuments(allSplits);

        const query = "What is in this repository?";
        const queryEmbedding = await embeddings.embedQuery(query);
        const topMatches = await vectorStore.similaritySearch(queryEmbedding, 5);
        console.log("Top matches:", topMatches);
        const context = topMatches.map((doc) => doc.content).join("\n");
        const prompt = `
        You are an expert assistant. Use the following context to answer the query:
        Context:
        ${context}

        Query:
        ${query}

        Answer:
        `;
        const result = await llm.generate(prompt);
        console.log("Response from LLM:", response.text);

    } catch(e){
        console.log("Error loading documents:", e);
    }
    // try{
    //     await fetchFilesFromRepo(owner, repo, "", githubToken);
    //     console.log("Files:", files);
    // } catch(e){
    //     console.error("Error fetching files:", e);
    // }
    // at this point, we have all the files from the repo. Now we need to feed it to the RAG model
    
    // const apiKey = document.getElementById('apiKey').value;


}