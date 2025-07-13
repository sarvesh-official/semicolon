import OpenAI from "openai";
import { configDotenv } from "dotenv";
import {exec} from "node:child_process";
import fs from "node:fs";
import readline from "node:readline";

configDotenv();

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function executeCommand(command){
    return new Promise((resolve, reject) => {
        exec(command, function(error, stdout, stderr) {
            if(error){
                reject(`Error executing command: ${error.message}`);
                return;
            }
            resolve(`stdout: ${stdout}, stderr: ${stderr}`);
        })
    })
}

function createFile(filename, content) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filename, content, 'utf8', (error) => {
            if (error) {
                reject(`Error creating file: ${error.message}`);
                return;
            }
            resolve(`File '${filename}' created successfully`);
        });
    });
}

function readFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf8', (error, data) => {
            if (error) {
                reject(`Error reading file: ${error.message}`);
                return;
            }
            resolve(data);
        });
    });
}

function getUserInput(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

const SYSTEM_PROMPT = `
You are **Semicolor**, an intelligent coding agent. 

CRITICAL: You MUST respond ONLY with valid JSON. No additional text before or after the JSON.

You must respond with structured JSON output in one of these modes:

**THINK MODE**: When you need to analyze or plan
{
  "mode": "THINK",
  "thought": "Your reasoning here",
  "next_action": "What you plan to do next"
}

**ACTION MODE**: When you need to execute a shell/terminal command
{
  "mode": "ACTION", 
  "command": "single shell command as string (e.g., 'echo content > file.txt', 'mkdir folder', 'ls', etc.)",
  "explanation": "why you're running this command",
  "safety_check": "confirmation this is safe"
}

**CREATE_FILE MODE**: When you need to create files with content
{
  "mode": "CREATE_FILE",
  "filename": "name of file to create",
  "content": "file content as a string",
  "explanation": "why you're creating this file"
}

**VERIFY MODE**: When you need to check/read file contents
{
  "mode": "VERIFY",
  "filename": "name of file to read and verify",
  "explanation": "why you're verifying this file"
}

**OUTPUT MODE**: When providing final results to user
{
  "mode": "OUTPUT",
  "summary": "what happened",
  "result": "the actual output or result", 
  "next_steps": "suggested next actions"
}

**CLARIFY MODE**: When you need more information
{
  "mode": "CLARIFY",
  "question": "what you need to know",
  "options": ["possible choices if applicable"]
}

RULES:
- For creating files, use CREATE_FILE mode instead of ACTION mode
- For shell commands like listing files, running programs, etc., use ACTION mode
- Use VERIFY mode after creating files to ensure they were created correctly
- ALWAYS respond with valid JSON only
- NO explanatory text outside the JSON structure
- Your entire response must be parseable JSON
- If you need to think or plan, use THINK mode first
- If you need to clarify something, use CLARIFY mode
- If user wants to build something, plan it out in THINK mode first and build it completely not just the first part
- After creating important files (especially HTML/CSS/JS), use VERIFY mode to check the content

Example valid response:
{
  "mode": "THINK",
  "thought": "I need to create a todo app with HTML, CSS, and JavaScript. I'll start by creating the HTML structure.",
  "next_action": "Create index.html file with basic todo app structure"
}
`;

let messages = [
    {
        role: "system",
        content: SYSTEM_PROMPT
    }
];

async function main() {
    console.log("🤖 Welcome to Semicolor - where code continues!");
    console.log("💬 Ask me to help you with coding tasks, create files, run commands, etc.");
    console.log("📝 Example: 'make a todo app with html, css and javascript'\n");
    
    const userQuery = await getUserInput("❓ What would you like me to help you with? ");
    
    if (!userQuery.trim()) {
        console.log("❌ No query provided. Exiting...");
        return;
    }
    
    messages.push({
        role: "user",
        content: userQuery
    });
    
    console.log(`\n🚀 Starting task: ${userQuery}\n`);
    await handleStructuredResponse();
}

async function handleStructuredResponse() {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (true) {
        try {
            const response = await client.chat.completions.create({
                model: "gpt-4",
                messages: messages
            });

            const aiResponse = response.choices[0].message.content;
            console.log("🤖 AI Response:", aiResponse);

            let structuredResponse;
            try {
                structuredResponse = JSON.parse(aiResponse);
                retryCount = 0; // Reset retry count on successful parse
            } catch (parseError) {
                console.log("❌ Failed to parse JSON response:", parseError.message);
                retryCount++;
                
                if (retryCount >= maxRetries) {
                    console.log("💥 Max retries reached. Ending conversation.");
                    break;
                }
                
                messages.push({
                    role: "assistant",
                    content: aiResponse
                });
                messages.push({
                    role: "user",
                    content: "ERROR: Your response was not valid JSON. Please respond ONLY with valid JSON in the format specified in the system prompt. No additional text."
                });
                continue;
            }

            switch (structuredResponse.mode) {
                case "THINK":
                    console.log("💭 THINKING:", structuredResponse.thought);
                    console.log("📋 NEXT ACTION:", structuredResponse.next_action);
                    
                    messages.push({
                        role: "assistant", 
                        content: aiResponse
                    });
                    
                    messages.push({
                        role: "user",
                        content: "Continue with your plan."
                    });
                    break;

                case "ACTION":
                    console.log("⚙️ EXECUTING:", structuredResponse.command);
                    console.log("📝 REASON:", structuredResponse.explanation);
                    
                    try {
                        const commandResult = await executeCommand(structuredResponse.command);
                        console.log("✅ COMMAND RESULT:", commandResult);
                        
                        messages.push({
                            role: "assistant",
                            content: aiResponse
                        });
                        messages.push({
                            role: "user",
                            content: `Command executed. Result: ${commandResult}`
                        });
                        
                    } catch (error) {
                        console.log("❌ COMMAND ERROR:", error);
                        
                        messages.push({
                            role: "assistant",
                            content: aiResponse
                        });
                        messages.push({
                            role: "user",
                            content: `Command failed with error: ${error}`
                        });
                    }
                    break;

                case "CREATE_FILE":
                    console.log("📝 CREATING FILE:", structuredResponse.filename);
                    console.log("📄 REASON:", structuredResponse.explanation);
                    
                    try {
                        const fileResult = await createFile(structuredResponse.filename, structuredResponse.content);
                        console.log("✅ FILE CREATED:", fileResult);
                        
                        messages.push({
                            role: "assistant",
                            content: aiResponse
                        });
                        messages.push({
                            role: "user",
                            content: `File created successfully: ${fileResult}`
                        });
                        
                    } catch (error) {
                        console.log("❌ FILE ERROR:", error);
                        
                        messages.push({
                            role: "assistant",
                            content: aiResponse
                        });
                        messages.push({
                            role: "user",
                            content: `File creation failed with error: ${error}`
                        });
                    }
                    break;

                case "VERIFY":
                    console.log("🔍 VERIFYING FILE:", structuredResponse.filename);
                    console.log("📄 REASON:", structuredResponse.explanation);
                    
                    try {
                        const fileContent = await readFile(structuredResponse.filename);
                        console.log("✅ FILE CONTENT:");
                        console.log("─".repeat(50));
                        console.log(fileContent);
                        console.log("─".repeat(50));
                        
                        messages.push({
                            role: "assistant",
                            content: aiResponse
                        });
                        messages.push({
                            role: "user",
                            content: `File verification complete. Current content of ${structuredResponse.filename}:\n\n${fileContent}`
                        });
                        
                    } catch (error) {
                        console.log("❌ VERIFICATION ERROR:", error);
                        
                        messages.push({
                            role: "assistant",
                            content: aiResponse
                        });
                        messages.push({
                            role: "user",
                            content: `File verification failed with error: ${error}`
                        });
                    }
                    break;

                case "OUTPUT":
                    console.log("📤 SUMMARY:", structuredResponse.summary);
                    console.log("🎯 RESULT:", structuredResponse.result);
                    console.log("➡️ NEXT STEPS:", structuredResponse.next_steps);
                    
                    console.log("✨ Conversation completed!");
                    return;

                case "CLARIFY":
                    console.log("❓ QUESTION:", structuredResponse.question);
                    if (structuredResponse.options) {
                        console.log("📋 OPTIONS:", structuredResponse.options);
                    }
                    
                    const clarification = await getUserInput("💬 Your response: ");
                    messages.push({
                        role: "assistant",
                        content: aiResponse
                    });
                    messages.push({
                        role: "user",
                        content: clarification
                    });
                    break;

                default:
                    console.log("❓ Unknown mode:", structuredResponse.mode);
                    break;
            }

        } catch (error) {
            console.error("💥 Error in conversation loop:", error);
            break;
        }
    }
}

main().catch(console.error);