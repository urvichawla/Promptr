package store

var samplePrompts = []PromptInput{
	{
		Title:   "Debug a stack trace",
		Content: "You are a senior engineer. I will paste an error and stack trace.\n1. Explain the root cause in one paragraph.\n2. Point to the exact line most likely responsible.\n3. Suggest the smallest fix and how to verify it.",
		Tags:    []string{"debugging"},
	},
	{
		Title:   "Review a React component",
		Content: "Review this React component for correctness, unnecessary re-renders, accessibility issues, and naming. List problems by severity, then show the corrected component.",
		Tags:    []string{"frontend"},
	},
	{
		Title:   "Optimize a slow SQL query",
		Content: "Here is a PostgreSQL query and its EXPLAIN ANALYZE output. Identify the bottleneck, propose indexes or rewrites, and estimate the impact of each change.",
		Tags:    []string{"backend"},
	},
	{
		Title:   "Write unit tests",
		Content: "Write focused unit tests for the following function. Cover the happy path, edge cases, and error handling. Use the existing test framework in the project and avoid mocking what you don't own.",
		Tags:    []string{"testing"},
	},
	{
		Title:   "Commit message from a diff",
		Content: "Write a concise git commit message for this diff. First line under 60 characters in the imperative mood, then a short body explaining why the change was made.",
		Tags:    []string{"git"},
	},
	{
		Title:   "Explain code to a newcomer",
		Content: "Explain what this code does to someone new to the codebase. Start with the big picture, then walk through the important parts. Avoid jargon or define it when used.",
		Tags:    []string{"learning"},
	},
	{
		Title:   "Handle API errors in Go",
		Content: "Refactor this Go HTTP handler so every error path returns a consistent JSON error body with the right status code. Wrap errors with context and log them once.",
		Tags:    []string{"backend"},
	},
}
