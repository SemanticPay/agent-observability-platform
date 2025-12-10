import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNodeHttpEndpoint,
} from '@copilotkit/runtime';
import { tavily } from '@tavily/core';

const app = express();
const PORT = process.env.COPILOTKIT_PORT || 4000;

app.use(cors());
app.use(express.json());

const serviceAdapter = new GoogleGenerativeAIAdapter({
  model: 'gemini-2.5-flash',
});

const runtime = new CopilotRuntime({
  actions: () => {
    return [
      {
        name: "searchInternet",
        description: "Searches the internet for information.",
        parameters: [
          {
            name: "query",
            type: "string",
            description: "The query to search the internet for.",
            required: true,
          },
        ],
        handler: async ({ query }: { query: string }) => {
          const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
          return await tvly.search(query, { max_results: 5 });
        },
      },
    ];
  },
});

app.post('/api/copilotkit', async (req, res) => {
  const handler = copilotRuntimeNodeHttpEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });

  return handler(req, res);
});

app.listen(PORT, () => {
  console.log(`CopilotKit server running on http://localhost:${PORT}`);
});
