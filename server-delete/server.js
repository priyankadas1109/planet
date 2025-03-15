import bodyParser from 'body-parser';
import express from 'express';
import cors from 'cors';
import { GithubRepoLoader } from '@langchain/community/document_loaders/web/github';


const app = express();
app.use(bodyParser.json());

app.use(
    cors({
      origin: 'http://localhost:5173', // Frontend origin
      methods: ['GET', 'POST'],        // Allow specific HTTP methods
      credentials: true,               // Allow cookies if needed
    })
);

app.post("/api/load-github-repo", async (req, res) => {
    const { repoUrl, githubToken, branch = "main" } = req.body;

    try{
        const loader = new GithubRepoLoader(repoUrl, {
            branch,
            recursive: true,
            processSubmodules: true,
            unknown: "warn",
            accessToken: githubToken,
            maxConcurrency: 2,
        });

        const docs = await loader.load();
        res.json({ success: true, documents: docs });
    } catch(error){
        console.error("Error loading documents from GitHub repo:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});