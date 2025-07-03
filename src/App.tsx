import React, { useState } from 'react';
import { Send, Code, Sparkles, CheckCircle, AlertCircle, Info, Zap, MessageSquare, Heart, Lightbulb, FileText } from 'lucide-react';

interface ReviewResult {
  overall_score: number;
  issues: Array<{
    type: 'error' | 'warning' | 'suggestion';
    message: string;
    line?: number;
    severity: 'high' | 'medium' | 'low';
  }>;
  suggestions: string[];
  positive_points: string[];
  summary: string;
}

interface CodeGenerationResult {
  code: string;
  explanation: string;
  features: string[];
  usage_notes: string[];
}

function App() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [errorDescription, setErrorDescription] = useState('');
  const [codeRequest, setCodeRequest] = useState('');
  const [mode, setMode] = useState<'review' | 'generate'>('review');
  const [isLoading, setIsLoading] = useState(false);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [generatedCode, setGeneratedCode] = useState<CodeGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (mode === 'review' && !code.trim()) {
      setError('Please enter some code to review');
      return;
    }
    
    if (mode === 'generate' && !codeRequest.trim()) {
      setError('Please describe what code you want to generate');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReview(null);
    setGeneratedCode(null);

    try {
      const GEMINI_API_KEY = "AIzaSyA9zW3MbLdVZn-D_xHy3z2JrsFanP6yDMg";
      
      let prompt = '';

      if (mode === 'review') {
        prompt = `You are an expert code reviewer. Please analyze the following ${language} code and provide a comprehensive review in JSON format with the following structure:

{
  "overall_score": (number from 1-10),
  "issues": [
    {
      "type": "error" | "warning" | "suggestion",
      "message": "detailed description of the issue",
      "line": number (optional, if you can identify specific line),
      "severity": "high" | "medium" | "low"
    }
  ],
  "suggestions": [
    "improvement suggestion 1",
    "improvement suggestion 2"
  ],
  "positive_points": [
    "what's good about the code",
    "positive aspects"
  ],
  "summary": "overall summary of the code quality and main points"
}

Please focus on:
- Code quality and best practices
- Performance issues
- Security vulnerabilities
- Maintainability
- Readability
- Error handling
- Code structure and organization`;

        // Add error description context if provided
        if (errorDescription.trim()) {
          prompt += `

IMPORTANT: The user is experiencing the following error or issue:
"${errorDescription.trim()}"

Please pay special attention to this specific problem and provide targeted solutions and explanations in your review. Include specific suggestions to resolve this error in your analysis.`;
        }

        prompt += `

Here's the code to review:

\`\`\`${language}
${code}
\`\`\`

Provide only the JSON response, no additional text.`;

      } else {
        // Code generation mode
        prompt = `You are an expert ${language} programmer. The user wants you to generate code based on their description. Please provide a response in JSON format with the following structure:

{
  "code": "the complete, working code that fulfills the user's request",
  "explanation": "detailed explanation of how the code works and what it does",
  "features": [
    "feature 1 implemented",
    "feature 2 implemented"
  ],
  "usage_notes": [
    "how to run or use the code",
    "any dependencies or requirements",
    "important notes about the implementation"
  ]
}

User's request: "${codeRequest.trim()}"

Please generate clean, well-commented, production-ready ${language} code that follows best practices. Make sure the code is complete and functional.

Provide only the JSON response, no additional text.`;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4096,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API Error:', response.status, errorText);
        throw new Error(`Failed to ${mode === 'review' ? 'review' : 'generate'} code: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error("Invalid Gemini response:", data);
        throw new Error("Invalid response from Gemini API");
      }

      const responseText = data.candidates[0].content.parts[0].text;
      
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Could not extract JSON from response:", responseText);
        throw new Error("Could not extract JSON from AI response");
      }

      if (mode === 'review') {
        const reviewResult: ReviewResult = JSON.parse(jsonMatch[0]);
        setReview(reviewResult);
      } else {
        const codeResult: CodeGenerationResult = JSON.parse(jsonMatch[0]);
        setGeneratedCode(codeResult);
      }

    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : `An error occurred while ${mode === 'review' ? 'reviewing' : 'generating'} the code`);
    } finally {
      setIsLoading(false);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'suggestion':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 8) return 'bg-green-100 border-green-300';
    if (score >= 6) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Code className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                   ReviewYourCode
                </h1>
                <p className="text-sm text-gray-400">Review & Generate Code with AI</p>
              </div>
            </div>
            <a
              href="https://www.linkedin.com/in/koushik-hazra-b9ab5b224/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 hover:text-red-300 transition-colors"
            >
              <Heart className="w-5 h-5 text-red-400" />
              <span className="text-sm text-gray-300">Koushik Hazra</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => {
                setMode('review');
                setError(null);
                setReview(null);
                setGeneratedCode(null);
              }}
              className={`px-6 py-2 rounded-md font-medium transition-all duration-200 flex items-center space-x-2 ${
                mode === 'review'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Review Code</span>
            </button>
            <button
              onClick={() => {
                setMode('generate');
                setError(null);
                setReview(null);
                setGeneratedCode(null);
              }}
              className={`px-6 py-2 rounded-md font-medium transition-all duration-200 flex items-center space-x-2 ${
                mode === 'generate'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              <span>Generate Code</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Language Selection */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">Programming Language</h3>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="csharp">C#</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                  <option value="typescript">TypeScript</option>
                </select>
              </div>
            </div>

            {mode === 'review' ? (
              <>
                {/* Code Input Section */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center mb-4">
                    <Code className="w-5 h-5 text-blue-400 mr-2" />
                    <h2 className="text-lg font-semibold">Your Code</h2>
                  </div>
                  
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste your code here for AI-powered review..."
                    className="w-full h-64 bg-gray-900 border border-gray-600 rounded-lg p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-gray-400"
                    style={{ fontFamily: 'Monaco, "Lucida Console", monospace' }}
                  />
                  
                  <div className="mt-4 text-sm text-gray-400">
                    {code.length} characters • {code.split('\n').length} lines
                  </div>
                </div>

                {/* Error Description Section */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center mb-4">
                    <MessageSquare className="w-5 h-5 text-orange-400 mr-2" />
                    <h3 className="text-lg font-semibold">Describe Your Issue</h3>
                    <span className="ml-2 text-sm text-gray-400">(Optional)</span>
                  </div>
                  
                  <textarea
                    value={errorDescription}
                    onChange={(e) => setErrorDescription(e.target.value)}
                    placeholder="Describe any specific error messages, issues, or problems you're experiencing with this code..."
                    className="w-full h-24 bg-gray-900 border border-gray-600 rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none placeholder-gray-400"
                  />
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Adding error details helps the AI provide more targeted solutions
                  </div>
                </div>
              </>
            ) : (
              /* Code Generation Section */
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center mb-4">
                  <Lightbulb className="w-5 h-5 text-purple-400 mr-2" />
                  <h2 className="text-lg font-semibold">Describe What You Want</h2>
                </div>
                
                <textarea
                  value={codeRequest}
                  onChange={(e) => setCodeRequest(e.target.value)}
                  placeholder={`Describe the ${language} code you want to generate. For example:
• "Create a function to sort an array of numbers"
• "Build a simple calculator with basic operations"
• "Make a class for managing a todo list"
• "Write code to connect to a database and fetch users"`}
                  className="w-full h-48 bg-gray-900 border border-gray-600 rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder-gray-400"
                />
                
                <div className="mt-4 text-sm text-gray-400">
                  {codeRequest.length} characters
                </div>
                
                <div className="mt-4 p-3 bg-purple-900/20 border border-purple-700/30 rounded-lg">
                  <div className="text-sm text-purple-300">
                    💡 <strong>Pro Tips:</strong>
                    <ul className="mt-2 space-y-1 text-xs text-purple-200">
                      <li>• Be specific about functionality you need</li>
                      <li>• Mention any specific requirements or constraints</li>
                      <li>• Include input/output examples if helpful</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={isLoading || (mode === 'review' ? !code.trim() : !codeRequest.trim())}
                className={`${
                  mode === 'review'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                    : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                } disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 transform hover:scale-105 shadow-lg`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{mode === 'review' ? 'Analyzing Code...' : 'Generating Code...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>{mode === 'review' ? 'Review Code' : 'Generate Code'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-300">{error}</span>
                </div>
              </div>
            )}

            {/* Code Review Results */}
            {review && mode === 'review' && (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className={`rounded-xl p-6 border ${getScoreBackground(review.overall_score)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Overall Score</h3>
                      <p className="text-sm text-gray-600">Code quality assessment</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getScoreColor(review.overall_score)}`}>
                        {review.overall_score}/10
                      </div>
                      <div className="text-sm text-gray-600">
                        {review.overall_score >= 8 ? 'Excellent' : review.overall_score >= 6 ? 'Good' : 'Needs Work'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <span>Summary</span>
                  </h3>
                  <p className="text-gray-300 leading-relaxed">{review.summary}</p>
                </div>

                {/* Issues */}
                {review.issues.length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span>Issues Found</span>
                    </h3>
                    <div className="space-y-3">
                      {review.issues.map((issue, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700/50 rounded-lg">
                          {getIssueIcon(issue.type)}
                          <div className="flex-1">
                            <p className="text-gray-300">{issue.message}</p>
                            {issue.line && (
                              <p className="text-sm text-gray-400 mt-1">Line {issue.line}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            issue.severity === 'high' ? 'bg-red-900 text-red-300' :
                            issue.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                            'bg-blue-900 text-blue-300'
                          }`}>
                            {issue.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Positive Points */}
                {review.positive_points.length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span>What's Good</span>
                    </h3>
                    <div className="space-y-2">
                      {review.positive_points.map((point, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                          <p className="text-gray-300">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {review.suggestions.length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <span>Suggestions</span>
                    </h3>
                    <div className="space-y-2">
                      {review.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <Sparkles className="w-4 h-4 text-purple-400 mt-0.5" />
                          <p className="text-gray-300">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Code Generation Results */}
            {generatedCode && mode === 'generate' && (
              <div className="space-y-6">
                {/* Generated Code */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center space-x-2">
                      <Code className="w-5 h-5 text-purple-400" />
                      <span>Generated Code</span>
                    </h3>
                    <button
                      onClick={() => copyToClipboard(generatedCode.code)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-sm transition-colors flex items-center space-x-1"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Copy</span>
                    </button>
                  </div>
                  
                  <pre className="bg-gray-900 border border-gray-600 rounded-lg p-4 text-sm font-mono overflow-x-auto">
                    <code className="text-gray-300">{generatedCode.code}</code>
                  </pre>
                </div>

                {/* Explanation */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                    <Info className="w-5 h-5 text-blue-400" />
                    <span>How It Works</span>
                  </h3>
                  <p className="text-gray-300 leading-relaxed">{generatedCode.explanation}</p>
                </div>

                {/* Features */}
                {generatedCode.features.length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span>Features Included</span>
                    </h3>
                    <div className="space-y-2">
                      {generatedCode.features.map((feature, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                          <p className="text-gray-300">{feature}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Usage Notes */}
                {generatedCode.usage_notes.length > 0 && (
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      <span>Usage Notes</span>
                    </h3>
                    <div className="space-y-2">
                      {generatedCode.usage_notes.map((note, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <Sparkles className="w-4 h-4 text-yellow-400 mt-0.5" />
                          <p className="text-gray-300">{note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!review && !generatedCode && !error && !isLoading && (
              <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
                {mode === 'review' ? (
                  <>
                    <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ready to Review</h3>
                    <p className="text-gray-400 mb-4">Paste your code and click "Review Code" to get AI-powered feedback</p>
                    <div className="text-sm text-gray-500">
                      💡 Pro tip: Add error descriptions for more targeted help
                    </div>
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ready to Generate</h3>
                    <p className="text-gray-400 mb-4">Describe what you want to build and get AI-generated code</p>
                    <div className="text-sm text-gray-500">
                      ✨ Just describe your idea and let AI write the code for you
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;