import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

let files = [];

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
    files = [];
    const githubToken = document.getElementById('githubToken').value;
    const repoUrl = document.getElementById('sourceUrl').value;
    const apiKey = document.getElementById('apiKey').value;
    const llm = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0
    });
    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-large"
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
        const { docs } = await response.json();
        console.log("Loaded documents:", docs);
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize:1000,
            chunkOverlap:200
        });
        const allSplits = await splitter.splitDocuments(docs);

        await vectorStore.addDocuments(allSplits);
        const promptTemplate = await pull<ChatPromptTemplate>("rlm/rag-prompt");

        //Define the state of the application
        const InputStateAnnotation = Annotation.Root({
            question: Annotation<string>,
        });

        const StateAnnotation = Annotation.Root({
            question: Annotation<string>,
            context: Annotation<Document[]>,
            answer: Annotation<string>,
        });

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