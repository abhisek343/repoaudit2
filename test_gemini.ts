import { LLMService } from './src/services/llmService';
import { LLMConfig } from './src/types';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Please enter your Gemini API key: ', async (apiKey) => {
  if (!apiKey) {
    console.error('API key is required.');
    rl.close();
    return;
  }

  const config: LLMConfig = {
    provider: 'gemini',
    apiKey: apiKey,
    model: 'gemini-1.5-flash-latest'
  };

  const llmService = new LLMService(config);

  try {
    console.log('Testing Gemini service with model gemini-1.5-flash-latest...');
    const response = await llmService.generateText('Hello', 10);
    if (response) {
      console.log('Success! Received response from Gemini:');
      console.log(response);
    } else {
      console.error('Failed to get a response from Gemini.');
    }
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    rl.close();
  }
});
