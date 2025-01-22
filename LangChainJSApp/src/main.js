import { OpenAIEmbeddings, ChatOpenAI, OpenAI } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import {RecursiveCharacterTextSplitter} from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";

async function generateResponse(context, query, llm) {
    const promptTemplate = ChatPromptTemplate.fromTemplate(`
        You are an expert assistant answering questions based on the context provided.
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
        console.log("Formatted Documents:", formattedDocs);
        // Run the documents through the splitter
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize:1000,
            chunkOverlap:200
        });

        const allSplits = await splitter.splitDocuments(formattedDocs);
        console.log("Splitted Documents:", allSplits);
        // Add documents to vector store directly without separate embedding step
        await vectorStore.addDocuments(allSplits);

        const query = "What is in your context?";
        const topMatches = await vectorStore.similaritySearch(query, 5);
        console.log("Top matches:", topMatches);
        const context = topMatches.map((doc) => doc.pageContent).join("\n");
        console.log("Context:", context);
        console.log("Query:", query);
        const answer = await generateResponse(context, query, llm);
        console.log(answer);

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

document.addEventListener('DOMContentLoaded', () => {
    // Get references to HTML elements
    const button = document.getElementById('submitButton');

    // Add click event listener to the button
    button.addEventListener('click', () => {
        pullFromRepo();
    });
});

